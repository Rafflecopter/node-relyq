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
// Mongo Storage Backend
function MongoStorage(mongoClient, redis, opts) {
  // handle forgetting a 'new'
  if (!(this instanceof MongoStorage)) {
    return new MongoStorage(mongoClient, redis, opts);
  }

  this.clone = function () {
    return new MongoStorage(mongoClient, redisPkg.createClient(redis.port, redis.host, redis.options), opts);
  };

  this._mongo = mongoClient.db(opts.db || 'test').collection(opts.collection || 'relyq');

  Q.call(this, redis, opts);
}

util.inherits(MongoStorage, Q);

MongoStorage.prototype.get = function (taskid, callback) {
  this._mongo.findOne({_id: taskid}, callback);
};

MongoStorage.prototype.set = function (taskobj, taskid, callback) {
  taskobj._id = taskid;
  this._mongo.save(taskobj, function (err) {
    callback(err, taskid);
  });
};

MongoStorage.prototype.del = function (taskobj, taskid, callback) {
  this._mongo.remove({_id: taskid}, function (err) {
    callback(err, taskid);
  });
};

module.exports = MongoStorage;