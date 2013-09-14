// relyq
// A reliable task queue

// vendor
var async = require('async'),
  _ = require('underscore'),
  simpleq = require('simpleq'),
  uuid = require('uuid');

// -- Master Type: Q --
// The master type, a task queue
function Q(redis, preopts, storage) {
  // handle forgetting a 'new'
  if (!(this instanceof Q)) {
    return new Q(redis, prefix);
  }


  this._delimeter = preopts.delimeter || ':';
  this._idfield = preopts.idfield || 'id';
  this._createid = preopts.createid || uuid.v4;
  this._ensureid = preopts.ensureid || false;
  this._prefix = preopts.prefix || preopts;

  this._storage = storage || new exports.storage.Noop();

  this.todo = new simpleq.Q(redis, this._prefix + ':todo');
  this.doing = new simpleq.Q(redis, this._prefix + ':doing');
  this.failed = new simpleq.Q(redis, this._prefix + ':failed');
  this.done = new simpleq.Q(redis, this._prefix + ':done');
}

Q.prototype._getid = function getid(task) {
  return task[this._idfield] = task[this._idfield] || (this._ensureid && this._createid(task));
};

Q.prototype.push = function push(task, callback) {
  async.waterfall([
    _.bind(this._storage.set, this._storage, task, this._getid(task)), // convert task to id
    _.bind(this.todo.push, this.todo)
  ], callback);
};

Q.prototype.process = function process(callback) {
  async.waterfall([
    _.bind(this.todo.poppipe, this.todo, this.doing),
    _.bind(this._storage.get, this._storage)
  ], callback);
};

Q.prototype.bprocess = function bprocess(callback) {
  async.waterfall([
    _.bind(this.todo.bpoppipe, this.todo, this.doing),
    _.bind(this._storage.get, this._storage)
  ], callback);
};

Q.prototype.finish = function finish(task, callback) {
  async.waterfall([
    _.bind(this._storage.set, this._storage, task, this._getid(task)),
    _.bind(this.doing.spullpipe, this.doing, this.done),
    function (ret, cb) {
      if (ret === 0) {
        return cb(new Error('Element ' + task + ' is not currently processing.'));
      }
      cb(null, ret);
    }
  ], callback);
};

Q.prototype.fail = function fail(task, callback) {
  async.waterfall([
    _.bind(this._storage.set, this._storage, task, this._getid(task)),
    _.bind(this.doing.spullpipe, this.doing, this.failed),
    function (ret, cb) {
      if (ret === 0) {
        return cb(new Error('Element ' + task + ' is not currently processing.'));
      }
      cb(null, ret);
    }
  ], callback);
};

exports.Q = exports.Queue = Q;

exports.storage = {
  Noop: require('./storage/noop'),
  InPlaceJson: require('./storage/json_inplace'),
  InPlaceMsgPack: require('./storage/msgpack_inplace'),
  RedisJson: require('./storage/json_redis'),
  RedisMsgPack: require('./storage/msgpack_redis'),
  Mongo: require('./storage/mongo')
};