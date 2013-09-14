// relyq
// A reliable task queue

// vendor
var async = require('async'),
  _ = require('underscore'),
  simpleq = require('simpleq'),
  uuid = require('uuid');

// -- Master Type: Q --
// The master type, a task queue
function Q(redis, preopts) {
  // handle forgetting a 'new'
  if (!(this instanceof Q)) {
    return new Q(redis, preopts);
  }

  this._delimeter = preopts.delimeter || ':';
  this._idfield = preopts.idfield || 'id';
  this._createid = preopts.createid || uuid.v4;
  this._ensureid = preopts.ensureid || false;
  this._prefix = preopts.prefix || preopts;

  this.todo = new simpleq.Q(redis, this._prefix + ':todo');
  this.doing = new simpleq.Q(redis, this._prefix + ':doing');
  this.failed = new simpleq.Q(redis, this._prefix + ':failed');
  this.done = new simpleq.Q(redis, this._prefix + ':done');
}

// @overridable
// Get a task object from its reference id
Q.prototype.get = function get(refid, callback) {
  callback(null, refid);
};

// @overridable
// Set a task object and return its reference ID
Q.prototype.set = function set(taskobj, tid, callback) {
  callback(null, taskobj);
};

// @overridable
// Delete the task obj and return its reference ID
Q.prototype.del = function del(taskobj, tid, callback) {
  callback(null, taskobj);
};

Q.prototype._getid = function getid(task) {
  return task[this._idfield] = task[this._idfield] || (this._ensureid && this._createid(task));
};

Q.prototype.push = function push(task, callback) {
  async.waterfall([
    _.bind(this.set, this, task, this._getid(task)), // convert task to id
    _.bind(this.todo.push, this.todo)
  ], callback);
};

Q.prototype.process = function process(callback) {
  async.waterfall([
    _.bind(this.todo.poppipe, this.todo, this.doing),
    _.bind(this.get, this)
  ], callback);
};

Q.prototype.bprocess = function bprocess(callback) {
  async.waterfall([
    _.bind(this.todo.bpoppipe, this.todo, this.doing),
    _.bind(this.get, this)
  ], callback);
};

Q.prototype.finish = function finish(task, callback) {
  async.waterfall([
    _.bind(this.set, this, task, this._getid(task)),
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
    _.bind(this.set, this, task, this._getid(task)),
    _.bind(this.doing.spullpipe, this.doing, this.failed),
    function (ret, cb) {
      if (ret === 0) {
        return cb(new Error('Element ' + task + ' is not currently processing.'));
      }
      cb(null, ret);
    }
  ], callback);
};

Q.prototype.remove = function remove(from, taskobj, callback) {
  async.waterfall([
    _.bind(this.del, this, taskobj, this._getid(taskobj)),
    _.bind(this[from].pull, this[from])
  ], callback);
};

module.exports = Q;