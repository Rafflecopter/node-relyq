// storage/msgpack_inplace.js
// A simple storage backend for tasks that stores serialized taskobjs as msgpack

// builtin
var util = require('util');

// vendor
var msgpack = require('msgpack');

// local
var Q = require('../lib/relyq');

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

// -- InPlace Storage Queue --
function InPlace(redis, opts) {
  Q.call(this, redis, opts);
}
util.inherits(InPlace, Q);

InPlace.prototype.ref = function (taskobj) {
  return this.serialize(taskobj);
};

InPlace.prototype.get = function (taskref, callback) {
  try {
    callback(null, this.deserialize(taskref));
  } catch (e) {
    callback(e);
  }
};

InPlace.prototype.set = function (taskobj, taskref, callback) {
  try {
    callback(null, taskref);
  } catch (e) {
    callback(e);
  }
};

InPlace.prototype.del = InPlace.prototype.set;

// -- InPlace Json Storage --

function InPlaceJson(redis, preopts) {
  if (!(this instanceof InPlaceJson)) {
    return new InPlaceJson(redis, preopts);
  }

  InPlace.call(this, redis, preopts);
}
util.inherits(InPlaceJson, InPlace);

InPlaceJson.prototype.serialize = JSON.stringify;
InPlaceJson.prototype.deserialize = JSON.parse;

// -- InPlace MsgPack Storage --

function InPlaceMsgPack(redis, preopts) {
  if (!(this instanceof InPlaceMsgPack)) {
    return new InPlaceMsgPack(redis, preopts);
  }

  InPlace.call(this, redis, preopts);
}
util.inherits(InPlaceMsgPack, InPlace);

InPlaceMsgPack.prototype.serialize = function (obj) {
  return msgpack.pack(obj).toString('binary');
};
InPlaceMsgPack.prototype.deserialize = function (str) {
  return msgpack.unpack(new Buffer(str, 'binary'));
};

module.exports = {
  msgpack: InPlaceMsgPack,
  json: InPlaceJson
};