// storage/mongo.js
// A task storage backend to store task object in mongo

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

var ObjectId = require('mongodb').ObjectID;

// -- Main Type --
// Mongo Storage Backend
function MongoStorage(mongoClient, db, coll, opts) {
  // handle forgetting a 'new'
  if (!(this instanceof MongoStorage)) {
    return new MongoStorage(mongoClient, db, coll, opts);
  }
  opts = opts || {};

  this._idfield = opts.idfield || 'id';
  this._mongo = mongoClient.db(db).collection(coll);
}

MongoStorage.prototype.get = function (taskid, callback) {
  this._mongo.findOne({_id: taskid}, callback);
};

MongoStorage.prototype.set = function (taskobj, callback) {
  var taskid = taskobj._id = taskobj[this._idfield];
  this._mongo.save(taskobj, function (err) {
    callback(err, taskid);
  });
};

module.exports = MongoStorage;