// lib/deferred.js
// Functionality for deferred tasks
// All deferred tasks are stored in a redis sorted set

var async = require('async'),
  _ = require('underscore');

function DeferredTaskList(relyq, options) {
  this._relyq = relyq;
  options = options || {};
  this._redis = options.redis;
  this._key = options.key || (relyq._prefix + relyq._delimeter + 'deferred');
  this._interval = options.interval || 1000; // 1s

  this._runMoveForever(this._interval, _.bind(this._moveNowTasks, this));
}

DeferredTaskList.prototype.defer = function(taskref, when, callback) {
  this._redis.zadd(this._key, when, taskref, callback);
}

DeferredTaskList.prototype.end = function () {
  clearTimeout(this.tkey);
}

DeferredTaskList.prototype._moveNowTasks = function (callback) {
  var rq = this.relyq;

  this._relyq.todo.zrangepush(this._key, 0, Date.now(), function (err, tasks) {
    if (err) {
      rq.emit('error', err);
    }
  });
}

DeferredTaskList.prototype._runMoveForever = function(interval) {
  var self = this;

  this.tkey = setTimeout(function () {
    self._moveNowTasks();
    self._runMoveForever(interval);
  }, interval);
}

module.exports = DeferredTaskList;