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

function connect(){
    var endpoint = document.getElementById('endpoint').value;
    var endpoints = endpoint ? [endpoint] : undefined;

    var transports =  document.getElementsByName('transport');
    var transport = undefined;
    for (var i=0; i < transports.length; i++)
        if(transports[i].checked)
            transport = transports[i].value;

    var hOptions = {
        serverHost: document.getElementById('serverHost').value,
        serverPort: document.getElementById('serverPort').value,
        transport: transport,
        endpoints: endpoints
    };

    var username = document.getElementById('username').value;
    var password = document.getElementById('password').value;
    hClient.connect(username, password, hCallback, hOptions);
}

function disconnect(){
    hClient.disconnect();
}

function publish(){
    var chid = document.getElementById('chid').value;
    var msg = document.getElementById('hMessage').value;
    hClient.publish(hClient.buildMessage(chid, 'string', msg));
}

function subscribe(){
    var chid = document.getElementById('chid').value;
    hClient.subscribe(chid)
}

function unsubscribe(){
    var chid = document.getElementById('chid').value;
    hClient.unsubscribe(chid)
}

function get_messages(){
    var chid = document.getElementById('chid').value;
    hClient.getMessages(chid)
}

function get_subscriptions(){
    hClient.getSubscriptions();
}

function clear_divs(){
    document.getElementById("status").innerHTML = '';
    document.getElementById("fetched").innerHTML = '';
}

function send_hEcho(){
    if(!hClient.publisher || hClient.publisher.split('@').length != 2)
        alert('Please connect before trying to send an hEcho');
    else{
        var value = prompt('Your Name:');
        var echoCmd = {
            entity : 'hnode.' + hClient.publisher.split('@')[1],
            cmd : 'hEcho',
            params : {hello : value},
            transient : !!document.getElementById("transientCheckBox").checked
        };
        hClient.command(echoCmd);
    }

}

function build_measure(){
    var value = prompt('Value:');
    var unit = prompt('Unit:');
    var chid = prompt('Channel:');
    var hMessage = hClient.buildMeasure(chid, value, unit);
    if(hMessage)
        document.getElementById("fetched").innerHTML = JSON.stringify(hMessage);
}

function build_alert(){
    var alert = prompt('Alert:');
    var chid = prompt('Channel:');
    var hMessage = hClient.buildAlert(chid, alert);
    if(hMessage)
        document.getElementById("fetched").innerHTML = JSON.stringify(hMessage);
}

function build_ack(){
    var ackID = prompt('AckID:');
    var ack= prompt('Ack:');
    var chid = prompt('Channel:');
    var hMessage = hClient.buildAck(chid, ackID, ack);
    if(hMessage)
        document.getElementById("fetched").innerHTML = JSON.stringify(hMessage);
}

function hCallback(msg){
    console.log(JSON.stringify(msg));
    var status = '';
    var error = '';
    if(msg.type == 'hStatus'){
        switch(msg.data.status){
            case hClient.status.CONNECTED:
                status = 'Connected';
                break;
            case hClient.status.CONNECTING:
                status = 'Connecting';
                break;
            case hClient.status.REATTACHING:
                status = 'Reattaching';
                break;
            case hClient.status.REATTACHED:
                status = 'Reattached';
                break;
            case hClient.status.DISCONNECTING:
                status = 'Disconnecting';
                break;
            case hClient.status.DISCONNECTED:
                status = 'Disconnected';
                break;
        }

        switch(msg.data.errorCode){
            case hClient.errors.NO_ERROR:
                error = 'No Error Detected';
                break;
            case hClient.errors.JID_MALFORMAT:
                error = 'JID Malformat';
                break;
            case hClient.errors.CONN_TIMEOUT:
                error = 'Connection timed out';
                break;
            case hClient.errors.AUTH_FAILED:
                error = 'Authentication failed';
                break;
            case hClient.errors.ATTACH_FAILED:
                error = 'Attach failed';
                break;
            case hClient.errors.ALREADY_CONNECTED:
                error = 'A connection is already opened';
                break;
            case hClient.errors.TECH_ERROR:
                error = 'Technical Error: ';
                error += msg.data.errorMsg;
                break;
            case hClient.errors.NOT_CONNECTED:
                error = 'Not connected';
                break;
            case hClient.errors.CONN_PROGRESS:
                error = 'A connection is already in progress';
                break;
        }

        document.getElementById("status").innerHTML = JSON.stringify(status + '<br />' + error);
    }
    else if (msg.type == 'hResult')
        document.getElementById("fetched").innerHTML = JSON.stringify(msg.data);
    else if (msg.type == 'hMessage')
        document.getElementById("fetched").innerHTML = JSON.stringify(msg.data);
}
