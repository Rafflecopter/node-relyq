// relyq
// A reliable task queue

// vendor
var simpleq = require('simpleq');

// -- Master Type: Q --
// The master type, a task queue
function Q(redis, prefix) {
  // handle forgetting a 'new'
  if (!(this instanceof Q)) {
    return new Q(redis);
  }

  this._prefix = prefix;

  this.todo = new simpleq.Q(redis, prefix + ':todo');
  this.doing = new simpleq.Q(redis, prefix + ':doing');
  this.failed = new simpleq.Q(redis, prefix + ':failed');
  this.done = new simpleq.Q(redis, prefix + ':done');
}

Q.prototype.push = function push(id, cb) {
  this.todo.push(id, cb);
};

Q.prototype.process = function process(cb) {
  this.todo.poppipe(this.doing, cb);
};

Q.prototype.bprocess = function bprocess(cb) {
  this.todo.bpoppipe(this.doing, cb);
};

Q.prototype.finish = function finish(id, cb) {
  this.doing.spullpipe(this.done, id, function (err, ret) {
    if (!err && ret === 0) {
      err = new Error('Element ' + id + ' is not currently processing.');
    }
    cb(err, ret);
  });
};

Q.prototype.fail = function fail(id, cb) {
  this.doing.spullpipe(this.failed, id, function (err, ret) {
    if (!err && ret === 0) {
      err = new Error('Element ' + id + ' is not currently processing.');
    }
    cb(err, ret);
  });
};

exports.Q = exports.Queue = Q;