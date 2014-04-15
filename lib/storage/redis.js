// storage/msgpack_redis.js
// A task storage backend to store task object as msgpack in Redis

// builtin
var util = require('util');

// local
var Q = require('../relyq');

// Storage services must provide three functions
// {
//   get: function (taskid, callback) {
//     callback(err, taskobj);
//   },
//   set: function (taskobj, taskref, callback) {
//     callback(err, taskid);
//   }
//   del: function (taskobj, taskref, callback) {
//     callback(err);
//   }
// }
// taskobj - Application level task objects
// taskid - A task identifier that can be used to store and later retrieve the taskobj

// -- Main Type --
// Redis Storage Backend
function RedisStorageRelyQ(redis, preopts) {
  Q.call(this, redis, preopts);

  this._storage_prefix = this._prefix + this._delimeter + 'jobs';
}

util.inherits(RedisStorageRelyQ, Q);

RedisStorageRelyQ.prototype._key = function (taskid) {
  return this._storage_prefix + this._delimeter + taskid;
};

RedisStorageRelyQ.prototype.get = function (taskid, callback) {
  var self = this;
  this._redis.get(this._key(taskid), function (err, result) {
    if (err) {
      return callback(err);
    }

    try {
      callback(null, result && self.deserialize(result));
    } catch (e) {
      callback(e);
    }
  });
};

RedisStorageRelyQ.prototype.set = function (taskobj, taskid, callback) {
  try {
    this._redis.set(this._key(taskid), this.serialize(taskobj), function (err, ok) {
      callback(err, taskid);
    });
  } catch (e) {
    callback(e);
  }
};

RedisStorageRelyQ.prototype.del = function (taskid, callback) {
  this._redis.del(this._key(taskid), function (err) {
    callback(err, taskid);
  });
};

// -- Redis Json Storage --

function RedisJsonStorage(redis, preopts) {
  if (!(this instanceof RedisJsonStorage)) {
    return new RedisJsonStorage(redis, preopts);
  }

  RedisStorageRelyQ.call(this, redis, preopts);
}
util.inherits(RedisJsonStorage, RedisStorageRelyQ);

RedisJsonStorage.prototype.serialize = JSON.stringify;
RedisJsonStorage.prototype.deserialize = JSON.parse;

module.exports = {
  json: RedisJsonStorage
};