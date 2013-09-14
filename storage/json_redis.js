// storage/json_redis.js
// A task storage backend to store task object as json in Redis

// builtin
var util = require('util');

// local
var Q = require('../relyq');

// Storage services must provide two functions
// {
//   get: function (taskid, callback) {
//     callback(err, taskobj);
//   },
//   set: function (taskobj, callback) {
//     callback(err, taskid);
//   }
// }
// taskobj - Application level task objects
// taskid - A task identifier that can be used to store and later retrieve the taskobj

// -- Main Type --
// Redis Storage Backend
function RedisStorage(redis, preopts) {
  // handle forgetting a 'new'
  if (!(this instanceof RedisStorage)) {
    return new RedisStorage(redis, preopts);
  }

  this._redis = redis;
  this._delimeter = preopts.delimeter || ':';
  this._prefix = preopts.storage_prefix || ((preopts.prefix || preopts) + this._delimeter + 'jobs');

  Q.call(this, redis, preopts);
}

util.inherits(RedisStorage, Q);

RedisStorage.prototype._key = function (taskid) {
  return this._prefix + this._delimeter + taskid;
};

RedisStorage.prototype.get = function (taskid, callback) {
  this._redis.get(this._key(taskid), function (err, result) {
    if (err) {
      return callback(err);
    }

    try {
      callback(null, JSON.parse(result));
    } catch (e) {
      callback(e);
    }
  });
};

RedisStorage.prototype.set = function (taskobj, taskid, callback) {
  try {
    this._redis.set(this._key(taskid), JSON.stringify(taskobj), function (err, ok) {
      callback(err, taskid);
    });
  } catch (e) {
    callback(e);
  }
};

module.exports = RedisStorage;