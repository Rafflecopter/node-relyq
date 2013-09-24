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
  this._interval = options.interval || 1000; // 1s

  this._runMoveForever(this._interval, _.bind(this._moveDeferredTasks, this));
}

DeferredTaskList.prototype.defer = function(taskref, when, callback) {
  this._redis.zadd(this._key, when, taskref, callback);
}

DeferredTaskList.prototype.end = function () {
  clearTimeout(this.tkey);
}

DeferredTaskList.prototype._moveDeferredTasks = function (callback) {
  var rq = this._relyq;

  reval(this._redis, defermove_filename, [this._key, rq.todo._key], Date.now(), function (err, tasks) {
    if (err) {
      console.error(err);
    }
  });
}

DeferredTaskList.prototype._runMoveForever = function(interval) {
  var self = this;

  this.tkey = setTimeout(function () {
    self._moveDeferredTasks();
    self._runMoveForever(interval);
  }, interval);
}

module.exports = DeferredTaskList;