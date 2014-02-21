// lib/deferred.js
// Functionality for deferred tasks
// All deferred tasks are stored in a redis sorted set

// builtin
var path = require('path');

// vendor
var async = require('async'),
  _ = require('underscore'),
  reval = require('redis-eval'),
  redis = require('redis');

var defermove_filename = path.join(__dirname, '/scripts/defermove.lua');
var defermove_immediate_filename = path.join(__dirname, '/scripts/defermove_immediate.lua');

function DeferredTaskList(relyq, options) {
  this._relyq = relyq;
  options = options || {};
  // clone redis
  this._redis = redis.createClient(options.redis.port, options.redis.host, options.redis.options);
  this._key = options.key || (relyq._prefix + relyq._delimeter + 'deferred');
  this._ended = false;

  var self = this
  this._redis.on('ready', function () {
    relyq.emit('deferred-ready')
    if (!self._ended)
      self.tkey = setInterval(self._poll.bind(self), options.polling_interval || 1000);
  })
}

DeferredTaskList.prototype.defer = function(taskref, when, callback) {
  this._redis.zadd(this._key, when, taskref, callback);
}

// Remove tasks from the deferred list
DeferredTaskList.prototype.eliminate = function(taskref, callback) {
  this._redis.zrem(this._key, taskref, callback);
}

// Remove tasks from the deferred list
DeferredTaskList.prototype.immediate = function(taskref, callback) {
  reval(this._redis, defermove_immediate_filename, [this._key, this._relyq.todo._key], [taskref], callback)
}

DeferredTaskList.prototype.end = function () {
  clearInterval(this.tkey);
  this._redis.end();
  this._ended = true;
}

DeferredTaskList.prototype._poll = function (callback) {
  var rq = this._relyq
    , dtl = this;

  // Lets not overflow the server with commands esp. because we're polling
  if (this._redis.ready) {
    reval(this._redis, defermove_filename, [this._key, rq.todo._key], [Date.now()], function (err, tasks) {
      if (err && !dtl._ended) {
        console.log(arguments)
        rq.emit('error', new Error('error during defermove: ' + (err.length ? err.join(', ') : err.toString())));
      }
    });
  } else {
    try {
      rq.emit('error', new Error('Cannot poll for deferred tasks. Redis is not connected.'))
    } catch (e) {
      console.error(e)
    }
  }
}

module.exports = DeferredTaskList;