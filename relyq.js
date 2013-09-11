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
  this.doing.pullpipe(this.done, id, cb);
};

Q.prototype.fail = function fail(id, cb) {
  this.doing.pullpipe(this.failed, id, cb);
}

exports.Q = exports.Queue = Q;