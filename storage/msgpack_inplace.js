// storage/msgpack_inplace.js
// A simple storage backend for tasks that stores serialized taskobjs as msgpack

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

// The MsgPackInPlace storage service serializes the taskobj into json and sets that
// as the taskid.
function MsgPackInPlace() {
  if (!(this instanceof MsgPackInPlace)) {
    return new MsgPackInPlace();
  }
};

MsgPackInPlace.prototype.get = function (taskid, callback) {
  try {
    callback(null, msgpack.unpack(new Buffer(taskid, 'binary')));
  } catch (e) {
    callback(e);
  }
};

MsgPackInPlace.prototype.set = function (taskobj, callback) {
  try {
    callback(null, msgpack.pack(taskobj).toString('binary'));
  } catch (e) {
    callback(e);
  }
};

module.exports = MsgPackInPlace;