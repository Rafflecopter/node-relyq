// storage/json_redis.js
// A task storage backend to store task object as json in Redis

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
function RedisStorage(redis, prefix, opts) {
  // handle forgetting a 'new'
  if (!(this instanceof RedisStorage)) {
    return new RedisStorage(redis, prefix, opts);
  }
  opts = opts || {};

  this._redis = redis;
  this._prefix = prefix;
  this._idfield = opts.idfield || 'id';
  this._delimeter = opts.delimeter || ':';
}

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

RedisStorage.prototype.set = function (taskobj, callback) {
  var taskid = taskobj[this._idfield];
  try {
    this._redis.set(this._key(taskid), JSON.stringify(taskobj), function (err, ok) {
      callback(err, taskid);
    });
  } catch (e) {
    callback(e);
  }
};

module.exports = RedisStorage;