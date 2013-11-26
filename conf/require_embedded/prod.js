({
  baseUrl: '../../',
  out: '../../build/require_embedded/hubiquitus.min.js',
  name: 'hubiquitus',
  paths: {
    requireLib: 'vendor/require',
    sockjs: 'vendor/sockjs',
    lodash: 'vendor/lodash',
    events: 'lib/events',
    logger: 'lib/logger',
    util: 'lib/util'
  },
  include: 'requireLib',
  shim: {
    'sockjs': {exports: ['SockJS']},
    'lodash': {exports: ['_']}
  }
})
