// lib/recurring.js
// Functionality for recurring tasks
// All recurring tasks are stored in a redis sorted set with their keys of "{{ref}}|{{interval}}" and values of the next processing time

// builtin
var path = require('path');

// vendor
var async = require('async'),
  _ = require('underscore'),
  reval = require('redis-eval');

var recurpull_filename = path.join(__dirname, '/scripts/recurpull.lua');

function RecurringTaskList(relyq, options) {
  this._relyq = relyq;
  options = options || {};
  this._redis = options.redis;
  this._key = options.key || (relyq._prefix + relyq._delimeter + 'recurring');

  this._pollForever(options.polling_interval || 1000);
}

RecurringTaskList.prototype.recur = function(taskref, every, callback) {
  this._redis.zadd(this._key, Date.now(), taskref + '|' + every, callback);
}

RecurringTaskList.prototype.end = function () {
  clearTimeout(this.pollkey);
}

RecurringTaskList.prototype._poll = function () {
  var rq = this._relyq;

  reval(this._redis, recurpull_filename, [this._key], [Date.now()], function (err, tasks) {
    if (err) {
      rq.emit('error', err);
    }
    async.each(tasks, _.bind(rq.push, rq), function (err) {
      if (err) {
        rq.emit('error', err);
      }
    });
  });
}

RecurringTaskList.prototype._pollForever = function(interval) {
  var self = this;

  this.pollkey = setTimeout(function () {
    self._poll();
    self._pollForever(interval);
  }, interval);
}

module.exports = RecurringTaskList;