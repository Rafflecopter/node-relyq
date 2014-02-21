// lib/recurring.js
// Functionality for recurring tasks
// All recurring tasks are stored in a redis sorted set with their keys of "{{ref}}|{{interval}}" and values of the next processing time

// builtin
var path = require('path');

// vendor
var async = require('async'),
  _ = require('underscore'),
  reval = require('redis-eval'),
  redis = require('redis');

var recurpull_filename = path.join(__dirname, '/scripts/recurpull.lua');

function RecurringTaskList(relyq, options) {
  this._relyq = relyq;
  options = options || {};
  // clone redis
  this._redis = redis.createClient(options.redis.port, options.redis.host, options.redis.options);
  this._key = options.key || (relyq._prefix + relyq._delimeter + 'recurring');
  this._ended = false;


  var self = this
  this._redis.on('ready', function () {
    relyq.emit('recurring-ready')
    if (!self._ended)
      self.pollkey = setInterval(self._poll.bind(self), options.polling_interval || 1000);
  })
}

RecurringTaskList.prototype.recur = function(taskref, every, callback) {
  this._redis.zadd(this._key, Date.now(), taskref + '|' + every, callback);
}

RecurringTaskList.prototype.end = function () {
  clearInterval(this.pollkey);
  this._redis.end();
  this._ended = true;
}

RecurringTaskList.prototype.remove = function (taskref, every, callback) {
  this._redis.zrem(this._key, taskref + '|' + every, callback);
}

RecurringTaskList.prototype._poll = function () {
  var rq = this._relyq,
    rtl = this;

  if (this._redis.ready) {
    reval(this._redis, recurpull_filename, [this._key], [Date.now()], function (err, taskrefs) {
      if (err && !rtl._ended) {
        rq.emit('error', new Error('Error during recurpull: ' + (err.length ? err.join(', ') : err.toString())));
      } else if (taskrefs) {
        async.each(taskrefs, function (ref, cb) {
          async.waterfall([
            _.bind(rq.getclean, rq, ref),
            function(obj, cb) {
              cb(null, obj);
            },
            _.bind(rq.push, rq),
          ], cb);
        }, function (err) {
          if (err) {
            rq.emit('error', err);
          }
        });
      }
    });
  } else {
    try {
      rq.emit('error', new Error('Cannot poll for recurring tasks. Redis is not connected.'))
    } catch (e) {
      console.error(e)
    }
  }
}

module.exports = RecurringTaskList;