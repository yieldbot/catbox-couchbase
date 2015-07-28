/*
 * catbox-couchbase
 * Copyright (c) 2015 Fatih Cetinkaya (http://github.com/cmfatih/catbox-couchbase)
 * For the full copyright and license information, please view the LICENSE.txt file.
 */

/* jslint node: true */
'use strict';

var couchbase    = require('couchbase'),
    util         = require('util'),
    EventEmitter = require('events').EventEmitter;

// Init the module
module.exports = function(options) {

  var serverOptions    = options || {},
      serverLocations  = '127.0.0.1:8091',
      serverBucket     = 'default',
      serverPartition, // cache key prefix
      eEmitter,        // event emitter
      flags,           // flags (e.g. `{flags: {debug: ['events']}}`)
      cacheClient,     // cache client
      cluster;         // cluster object

  var TTL_MAX = 1000*60*60*24*30; // 2592000000 milliseconds = 30 days

  // Initialize event emitter
  var EEmitter = function EEmitter() { EventEmitter.call(this); };
  util.inherits(EEmitter, EventEmitter);
  eEmitter = new EEmitter();
  eEmitter.on('error', function() { }); // prevent unhandled error event

  // Server options
  // REF: http://docs.couchbase.com/sdk-api/couchbase-node-client-2.0.8/index.html
  //      http://docs.couchbase.com/developer/dev-guide-3.0/doc-expiration.html

  if(serverOptions.location) {
    serverLocations = (serverOptions.location instanceof Array) ? serverOptions.location.join(',') : ''+serverOptions.location;
  }

  if(typeof serverOptions.partition === 'string' && serverOptions.partition !== 'NONE') {
    serverPartition = serverOptions.partition;
  }

  if(typeof serverOptions.bucket === 'string' && serverOptions.bucket) {
    serverBucket = serverOptions.bucket;
  }

  if(!serverOptions.connectionTimeout) serverOptions.connectionTimeout = 1000; // default 5000
  if(!serverOptions.operationTimeout)  serverOptions.operationTimeout  = 1000; // default 2500

  // Flags
  flags = (serverOptions.flags && typeof serverOptions.flags === 'object' && serverOptions.flags) || {};
  var bypassCacheOnConnError = !!flags.bypassCacheOnConnError;

  // If mock flag is true then
  if(flags.isMock) {
    couchbase = require('couchbase').Mock; // use mock
  }

  // Creates a connection to the cache server
  var start = function start(callback) {

    if(typeof callback !== 'function') {
      throw new Error('invalid callback function');
    }

    // If there is an instance then
    if(cacheClient) {
      return callback();
    }

    // Create instance

    // TODO: Watch the issue
    // https://issues.couchbase.com/browse/JSCBC-156
    // var cnstrQueryParams = [
    //   util.format('connectionTimeout=%s', serverOptions.connectionTimeout),
    //   util.format('operationTimeout=%s', serverOptions.operationTimeout)
    // ];
    // var cnstr = util.format('couchbase://%s/?%s', serverLocations, cnstrQueryParams.join('&'));

    cluster     = new couchbase.Cluster(util.format('couchbase://%s/', serverLocations));
    cacheClient = cluster.openBucket(serverBucket);

    // Set options
    cacheClient.connectionTimeout = serverOptions.connectionTimeout;
    cacheClient.operationTimeout  = serverOptions.operationTimeout;

    // Set events
    cacheClient.on('connect', function() {
      eEmitter.emit('connect', util.format('connected to %s bucket', serverBucket));
    });
    cacheClient.on('error', function(err) {
      eEmitter.emit('error', err);
    });
    eEmitter.emit('start', util.format('started for %s/pools/default/buckets/%s', serverLocations, serverBucket));

    return callback();
  };

  // Ends the cache server connection
  var stop = function stop() {
    if(cacheClient) {
      cacheClient.disconnect(); // end connection
      cacheClient = null;       // cleanup
      cluster     = null;       // cleanup

      eEmitter.emit('stop', util.format('stopped for %s/pools/default/buckets/%s', serverLocations, serverBucket));
    }
  };

  // Returns whether the cache server is ready or not
  var isReady = function isReady() {
    return (!!cacheClient);
  };

  // Validates segment name
  var validateSegmentName = function validateSegmentName(name) {
    if(!name || name.indexOf('\n') !== -1 || name.indexOf('\0') !== -1 || name.indexOf('\t') !== -1 || name.indexOf(' ') !== -1) {
      return new Error('invalid segment name');
    }
    return null; // catbox wants null
  };

  // Gets a value for the given key
  var get = function get(key, callback) {

    if(typeof callback !== 'function') {
      throw new Error('invalid callback function');
    }
    else if(!isReady()) {
      return callback(new Error('cache server is not ready'));
    }

    // If key is falsy then
    if(!key) {
      return callback(null, null); // return null like catbox
    }

    // Get cache value
    var keyF = generateKey(key);

    if(!keyF) {
      return callback(new Error('invalid key'));
    }

    eEmitter.emit('get', keyF);

    if(!cacheClient.connected && bypassCacheOnConnError) {
      return callback(null, null); // bypass cache
    }

    cacheClient.get(keyF, function(err, result) {
      if(err) {
        // Code 16: Generic network failure.
        if(bypassCacheOnConnError && err.code === 16) {
          return callback(null, null); // bypass cache
        }
        // If error code is not 13 (The key does not exist on the server) then
        if(err.code !== 13) {
          return callback(err);
        }
      }

      // No result then no cache
      if(!result || !result.value) {
        return callback(null, null);
      }

      // Parse cache content
      var envelope = null;
      try {
        envelope = JSON.parse(result.value);
      }
      catch(e) {
        eEmitter.emit('error', e);
        return callback(e);
      }

      // Check cache content
      if(!envelope || !envelope.item || !envelope.stored) {
        return callback(new Error('invalid cache content'));
      }

      return callback(null, envelope);
    });
  };

  // Sets a value for the given key
  var set = function set(key, value, ttl, callback) {

    if(typeof callback !== 'function') {
      throw new Error('invalid callback function');
    }
    else if(!key) {
      return callback(new Error('invalid key'));
    }
    else if(typeof ttl !== 'number') {
      return callback(new Error('invalid ttl'));
    }
    else if(!isReady()) {
      return callback(new Error('cache server is not ready'));
    }

    // Prepare cache content
    var envelope = {item: value, stored: Date.now(), ttl: ttl},
        envelopeStr;

    try {
      envelopeStr = JSON.stringify(envelope);
    }
    catch(e) {
      eEmitter.emit('error', e);
      return callback(e);
    }

    // Set cache
    var keyF = generateKey(key);

    if(!keyF) {
      return callback(new Error('invalid key'));
    }

    eEmitter.emit('set', keyF);

    if(!cacheClient.connected && bypassCacheOnConnError) {
      return callback(); // bypass cache
    }

    // Expiry
    var expiry = Math.max(1, Math.floor(envelope.ttl / 1000)); // min is 1 sec
    // If ttl is greater than max ttl
    if(envelope.ttl > TTL_MAX) {
      // REF: http://docs.couchbase.com/developer/dev-guide-3.0/doc-expiration.html
      // Calculate timestamp
      expiry = Math.max(1, Math.floor((new Date(envelope.stored + envelope.ttl).getTime()) / 1000)); // min is 1 sec
    }

    cacheClient.upsert(keyF, envelopeStr, {expiry: expiry}, function(err) {
      if(err) {
        // Code 16: failed to connect to bucket.
        if(bypassCacheOnConnError && err.code === 16) {
          return callback(); // bypass cache
        }
        return callback(err);
      }

      return callback();
    });
  };

  // Remove the given key
  var drop = function drop(key, callback) {

    if(typeof callback !== 'function') {
      throw new Error('invalid callback function');
    }
    else if(!isReady()) {
      return callback(new Error('cache server is not ready'));
    }

    // Drop cache
    var keyF = generateKey(key);

    if(!keyF) {
      return callback(new Error('invalid key'));
    }

    eEmitter.emit('drop', keyF);

    if(!cacheClient.connected && bypassCacheOnConnError) {
      return callback(); // bypass cache
    }

    cacheClient.remove(keyF, function(err) {
      if(err) {
        // Code 16: failed to connect to bucket.
        if(bypassCacheOnConnError && err.code === 16) {
          return callback(); // bypass cache
        }
        // If error code is not 13 (The key does not exist on the server) then
        if(err.code !== 13) {
          return callback(err);
        }
      }

      return callback();
    });
  };

  // Generates keys
  var generateKey = function generateKey(key) {
    return (serverPartition ? encodeURI(serverPartition)+':' : '') + (key && key.segment ? encodeURI(key.segment) : '') + (key && key.id ? ':'+encodeURI(key.id) : '');
  };

  // Allows hook on events
  var on = function on(event, callback) {
    eEmitter.addListener(event, callback);
  };

  // Debug
  //flags = {debug: ['events']}; // for debug
  if(flags.debug instanceof Array) {
    // If events in debug flags
    if(flags.debug.indexOf('events') !== -1) {
      // Log all the events
      ['start', 'stop', 'get', 'set', 'drop', 'connect', 'error'].forEach(function(event) {
        on(event, function(data) {
          console.log('\nDebug: ' + JSON.stringify({event: event, data:data}) + '\n');
        });
      });
    }
  }

  // Return
  return {
    start:               start,
    stop:                stop,
    isReady:             isReady,
    validateSegmentName: validateSegmentName,
    get:                 get,
    set:                 set,
    drop:                drop,
    generateKey:         generateKey,
    settings:            serverOptions,
    on:                  on
  };
};