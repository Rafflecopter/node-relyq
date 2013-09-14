// storage/msgpack_redis.js
// A task storage backend to store task object as msgpack in Redis

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

var msgpack = require('msgpack');

// -- Main Type --
// Redis Storage Backend
function RedisMsgPackStorage(redis, prefix, opts) {
  // handle forgetting a 'new'
  if (!(this instanceof RedisMsgPackStorage)) {
    return new RedisMsgPackStorage(redis, prefix, opts);
  }
  opts = opts || {};

  this._redis = redis;
  this._prefix = prefix;
  this._idfield = opts.idfield || 'id';
  this._delimeter = opts.delimeter || ':';
}

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