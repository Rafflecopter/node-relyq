// storage/none.js
// A noop task storage backend to store already stringified tasks in place

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
// Noop Storage Backend
function NoopStorage() {}

NoopStorage.prototype.get = function (taskid, callback) {
  callback(null, taskid);
};

NoopStorage.prototype.set = function (taskobj, callback) {
  callback(null, taskobj);
};

module.exports = NoopStorage;