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

function DeferredTaskList(relyq, options) {
  this._relyq = relyq;
  options = options || {};
  this._redis = options.redis;
  this._key = options.key || (relyq._prefix + relyq._delimeter + 'deferred');

  this._pollForever(options.polling_interval || 1000);
}

DeferredTaskList.prototype.defer = function(taskref, when, callback) {
  this._redis.zadd(this._key, when, taskref, callback);
}

DeferredTaskList.prototype.end = function () {
  clearTimeout(this.tkey);
}

DeferredTaskList.prototype._poll = function (callback) {
  var rq = this._relyq;

  reval(this._redis, defermove_filename, [this._key, rq.todo._key], [Date.now()], function (err, tasks) {
    if (err) {
      rq.emit('error',err);
    }
  });
}

DeferredTaskList.prototype._pollForever = function(interval) {
  var self = this;

  this.tkey = setTimeout(function () {
    self._poll();
    self._pollForever(interval);
  }, interval);
}

module.exports = DeferredTaskList;