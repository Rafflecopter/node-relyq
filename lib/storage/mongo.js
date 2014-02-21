// storage/mongo.js
// A task storage backend to store task object in mongo

// builtin
var util = require('util');

// vendor
var ObjectId = require('mongodb').ObjectID,
  _ = require('underscore'),
  redisPkg = require('redis');

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
// Mongo Storage Backend
function MongoStorageRelyQ(redis, opts) {
  // handle forgetting a 'new'
  if (!(this instanceof MongoStorageRelyQ)) {
    return new MongoStorageRelyQ(redis, opts);
  }
  this._mongo = opts.mongo.db(opts.db || 'test').collection(opts.collection || 'relyq');

  Q.call(this, redis, opts);
}

util.inherits(MongoStorageRelyQ, Q);

MongoStorageRelyQ.prototype.get = function (taskid, callback) {
  this._mongo.findOne(_.object([this._idfield],[taskid]), callback);
};

MongoStorageRelyQ.prototype.set = function (taskobj, taskid, callback) {
  this._mongo.save(taskobj, function (err) {
    callback(err, taskid);
  });
};

MongoStorageRelyQ.prototype.del = function (taskid, callback) {
  this._mongo.remove(_.object([this._idfield],[taskid]), function (err) {
    callback(err, taskid);
  });
};

module.exports = MongoStorageRelyQ;
