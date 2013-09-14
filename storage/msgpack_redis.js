// storage/msgpack_redis.js
// A task storage backend to store task object as msgpack in Redis

// builtin
var util = require('util');

// vendor
var msgpack = require('msgpack');

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
function RedisMsgPackStorage(redis, preopts) {
  // handle forgetting a 'new'
  if (!(this instanceof RedisMsgPackStorage)) {
    return new RedisMsgPackStorage(redis, preopts);
  }

  this._redis = redis;
  this._prefix = preopts.storage_prefix || ((preopts.prefix || preopts) + this._delimeter + 'jobs');
  this._delimeter = preopts.delimeter || ':';

  Q.call(this, redis, preopts);
}

util.inherits(RedisMsgPackStorage, Q);

RedisMsgPackStorage.prototype._key = function (taskid) {
  return this._prefix + this._delimeter + taskid;
};

RedisMsgPackStorage.prototype.get = function (taskid, callback) {
  this._redis.get(this._key(taskid), function (err, result) {
    if (err) {
      return callback(err);
    }

    try {
      callback(null, msgpack.unpack(new Buffer(result, 'binary')));
    } catch (e) {
      callback(e);
    }
  });
};

RedisMsgPackStorage.prototype.set = function (taskobj, taskid, callback) {
  try {
    this._redis.set(this._key(taskid), msgpack.pack(taskobj).toString('binary'), function (err, ok) {
      callback(err, taskid);
    });
  } catch (e) {
    callback(e);
  }
};

module.exports = RedisMsgPackStorage;