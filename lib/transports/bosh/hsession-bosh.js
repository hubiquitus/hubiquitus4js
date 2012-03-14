/*
 * Copyright (c) Novedia Group 2012.
 *
 *     This file is part of Hubiquitus.
 *
 *     Hubiquitus is free software: you can redistribute it and/or modify
 *     it under the terms of the GNU General Public License as published by
 *     the Free Software Foundation, either version 3 of the License, or
 *     (at your option) any later version.
 *
 *     Hubiquitus is distributed in the hope that it will be useful,
 *     but WITHOUT ANY WARRANTY; without even the implied warranty of
 *     MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *     GNU General Public License for more details.
 *
 *     You should have received a copy of the GNU General Public License
 *     along with Hubiquitus.  If not, see <http://www.gnu.org/licenses/>.
 */
//Make it compatible with node and web browser
if (typeof define !== 'function') {
    var define = require('amdefine')(module);
    var sessionStorage = require('../../sessionStorage.js');
}

define(
    ['./strophe.pubsub'],
    function(Strophe){

        //Load correct modules if running on Node
        if(typeof module !== 'undefined' && module.exports){
            $iq     = Strophe.$iq;
            $pres   = Strophe.$pres;
        }

        var Strophe = Strophe.Strophe;

        var statuses = {error: 'Error', connecting: 'Connecting', connected: 'Connected',
            disconnecting: 'Disconnecting', disconnected: 'Disconnected'};
        var XMLNS = {event: 'http://jabber.org/protocol/pubsub#event'};

        //If a connection fails. This sets the timeouts for retrying. Used from right to left, in seconds.
        var retryTimeouts = [600, 300, 60, 30, 10, 2];


        // Constructor
        var hSessionBosh = function(opts, onMessage) {
            this.options = opts;
            this.callback = onMessage;
            this.pubsub =  "pubsub." + this.options.domain;
            this.retryTimeouts = retryTimeouts;

            //Create a Strophe connection
            this.conn = new Strophe.Connection(this.options.gateway.bosh.endpoint);
            this.conn.rawInput = this.rawInput.bind(this);
            this.conn.rawOutput = this.rawOutput.bind(this);
        }

        hSessionBosh.prototype = {

            /**
             * Tries to recover and reattach and old connection or connect to a new one.
             * @param force (boolean, optional). If defined and true. A reattach won't be tried and
             * a new connection will be started.
             */
            connect: function(force) {
                //If there is a saved session, try to use it
                if(!force && typeof sessionStorage.getItem('JID') === 'string'){
                    console.log('Reattaching');
                    //Our request must be a new one
                    sessionStorage.setItem('RID', parseInt(sessionStorage.getItem('RID'))+1);
                    this.conn.attach(
                        sessionStorage.getItem('JID'),
                        sessionStorage.getItem('SID'),
                        sessionStorage.getItem('RID'),
                        this.onConnect.bind(this),
                        null, null, null)
                } else{
                    //We don't have enough information to restablish the connection. Establish a new one
                    console.log('Starting New Connection');
                    this.conn.connect(
                        this.options.username,
                        this.options.password,
                        this.onConnect.bind(this),
                        null, null, null
                    );
                }
            },

            //Callback for the connection status.
            //When connected, send presence to the server and set the callback to retrieve stanzas
            onConnect: function(status)
            {
                if (status == Strophe.Status.CONNECTING) {
                    this.callback({type: 'status', data: statuses.connecting});

                } else if (status == Strophe.Status.CONNFAIL) {
                    this.callback({type: 'status', data: statuses.error});
                    sessionStorage.clear();

                    var timeout = this.retryTimeouts.length == 1 ? this.retryTimeouts[0] : this.retryTimeouts.pop();
                    setTimeout(this.connect.bind(this, true),timeout*1000);

                } else if (status == Strophe.Status.CONNECTED || status == Strophe.Status.ATTACHED) {
                    console.log('Sending presence');
                    this.conn.send($pres());

                    this.conn.addHandler(this.handleIQ.bind(this), null, 'iq', 'get',null, null, {matchBare: true});
                    this.conn.addHandler(this.handleMessage.bind(this), XMLNS.event,'message',
                        null, null, this.pubsub, {matchBare: true});

                    this.callback({type: 'status', data: statuses.connected});
                    this.retryTimeouts = retryTimeouts; //Resets the reconnection counter

                } else if (status == Strophe.Status.DISCONNECTING) {
                    this.callback({type: 'status', data: statuses.disconnecting});

                } else if (status == Strophe.Status.DISCONNECTED) {
                    this.callback({type: 'status', data: statuses.disconnected});
                }
            },

            //Callback used to retrieve the message
            handleMessage: function(stanza) {
                var _data = stanza.getElementsByTagName('event')[0]
                    .getElementsByTagName('items')[0]
                    .getElementsByTagName('item')[0]
                    .getElementsByTagName('entry')[0].childNodes[0].nodeValue;

                _data = _data || stanza.getElementsByTagName('event')[0]
                    .getElementsByTagName('item')[0]
                    .getElementsByTagName('entry')[0].childNodes[0].nodeValue;

                //Calling client callback with the extracted message
                if(_data)
                    this.callback({type: 'data', data: _data});
                return true;
            },

            //In case we receive an iq-get request, send an error cause we don't allow them
            handleIQ : function(stanza){
                var msg = $iq({
                    to: stanza.attributes.from.nodeValue,
                    type: 'error',
                    id: stanza.attributes.id.nodeValue
                })
                    .c(stanza.firstChild.nodeName, {xmlns: stanza.firstChild.attributes.xmlns.nodeValue}).up()
                    .c('error', { type: 'cancel'})
                    .c('service-unavailable', {xmlns: 'urn:ietf:params:xml:ns:xmpp-stanzas'});

                console.log("Received an IQ from the server. Responding.");
                this.conn.send(msg);
                return true; //If it doesn't return true, Strophe will remove it from Handler's list
            },

            disconnect: function() {
                this.conn.flush();
                this.conn.disconnect();
            },

            subscribe: function(nodeName){
                this.conn.pubsub.subscribe(
                    nodeName,
                    undefined,
                    undefined,
                    function(){ console.log('Subscribed to ' + nodeName); },
                    function(){ console.log('Fail to Subscribe to ' + nodeName); });
            },

            unsubscribe : function(nodeName, subID){
                this.conn.pubsub.unsubscribe(
                    nodeName,
                    function(){ console.log('Unsubscribed from ' + nodeName); },
                    function(){ console.log('Fail to Unsubscribed from ' + nodeName); });
            },

            publish : function(nodeName,items){
                var nodeItems = [];
                for(var i in items)
                    nodeItems.push({data: items[i]});
                this.conn.pubsub.publish(
                    nodeName,
                    nodeItems,
                    function(){ console.log("Publication of " + items + " to " + nodeName + " Succeeded"); });
            },

            rawInput: function(data)
            {
                //Save state every time the client receives a stanza
                this.storeConnInfo();
                return;
            },

            rawOutput: function(data)
            {
                return;
            },

            storeConnInfo: function(){
                sessionStorage.setItem('JID', this.conn.jid);
                sessionStorage.setItem('SID', this.conn.sid);
                sessionStorage.setItem('RID', this.conn.rid);
            }
        }

//This return is a requireJS way which allow other files to import this specific variable
        return{
            hSessionBosh : hSessionBosh
        }
    }
);