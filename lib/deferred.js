// lib/deferred.js
// Functionality for deferred tasks
// All deferred tasks are stored in a redis sorted set

// builtin
var path = require('path');

// vendor
var async = require('async'),
  _ = require('underscore'),
  reval = require('redis-eval');

var defermove_filename = path.join(__dirname, '/scripts/defermove.lua');
var defermove_immediate_filename = path.join(__dirname, '/scripts/defermove_immediate.lua');

function DeferredTaskList(relyq, options) {
  this._relyq = relyq;
  options = options || {};
  this._redis = options.redis;
  this._key = options.key || (relyq._prefix + relyq._delimeter + 'deferred');
  this._ended = false;

  this.tkey = setInterval(this._poll.bind(this), options.polling_interval || 1000);
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
  this._ended = true;
}

DeferredTaskList.prototype._poll = function (callback) {
  var rq = this._relyq;

  // Lets not overflow the server with commands esp. because we're polling
  if (this._redis.connected) {
    reval(this._redis, defermove_filename, [this._key, rq.todo._key], [Date.now()], function (err, tasks) {
      if (err) {
        rq.emit('error',err);
      }
    });
  } else {
    rq.emit('error', new Error('Cannot poll for deferred tasks. Redis is not connected.'))
  }
}

module.exports = DeferredTaskList;