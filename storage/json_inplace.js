// storage/json_inplace.js
// A simple storage backend for tasks that stores serialized taskobjs as json

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

// The JsonInPlace storage service serializes the taskobj into json and sets that
// as the taskid.
function JsonInPlace(redis, opts) {
  if (!(this instanceof JsonInPlace)) {
    return new JsonInPlace(redis, opts);
  }

  Q.call(this, redis, opts);
}

util.inherits(JsonInPlace, Q);

JsonInPlace.prototype.get = function (taskid, callback) {
  try {
    callback(null, JSON.parse(taskid));
  } catch (e) {
    callback(e);
  }
};

JsonInPlace.prototype.set = function (taskobj, _taskid, callback) {
  try {
    callback(null, JSON.stringify(taskobj));
  } catch (e) {
    callback(e);
  }
};

module.exports = JsonInPlace;