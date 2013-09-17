// relyq_test.js

// vendor
var redis = require('redis').createClient(),
  redis2 = require('redis').createClient(),
  Moniker = require('moniker'),
  async = require('async'),
  _ = require('underscore');

// local
var relyq = require('..');

// Setup
var tests = exports.tests = {},
  Q, Qc;

tests.setUp = function setUp (callback) {
  Q = new relyq.Q(redis, 'relyq-test:' + Moniker.choose());
  Qc = new relyq.Q(redis2, Q._prefix);
  callback();
};

tests.tearDown = function tearDown (callback) {
  if (Q) {
    return async.parallel([
      _.bind(Q.todo.clear, Q.todo),
      _.bind(Q.doing.clear, Q.doing),
      _.bind(Q.done.clear, Q.done),
      _.bind(Q.failed.clear, Q.failed)
    ], callback);
  }
  callback();
};

// Clean up redis to allow a clean escape!
exports.cleanUp = function cleanUp (test) {
  redis.end();
  redis2.end();
  test.done();
};

// -- helpers --
function checkByList(test, Q, exp) {
  return function (cb) {
    Q.list(function (err, list) {
      test.ifError(err);
      test.deepEqual(list, exp);
      cb();
    });
  };
}

// -- Tests --

tests.testPush = function (test) {
  async.series([
    _.bind(Q.push, Q, 'foo123'),
    _.bind(Q.push, Q, '456bar'),

    checkByList(test, Q.todo, ['456bar', 'foo123'])
  ], function (err, results) {
    test.ifError(err);
    test.equal(results[0], 1);
    test.equal(results[1], 2);
    test.done();
  });
};

tests.testProcess = function (test) {
  async.series([
    _.bind(Q.process, Q),
    _.bind(Q.push, Q, 'pleasure'),
    _.bind(Q.push, Q, 'pain'),
    _.bind(Q.process, Q),
    checkByList(test, Q.todo, ['pain']),
    checkByList(test, Q.doing, ['pleasure'])
  ], function(err, results) {
    test.ifError(err);
    test.equal(results[0], null);
    test.equal(results[3], 'pleasure');
    test.done();
  });
};

tests.testBprocess = function (test) {
  async.series([
    function (cb) {
      var start = new Date();
      Q.bprocess(2, function (err, res) {
        test.ifError(err);
        test.equal(res, null);
        var time = new Date() - start;
        test.ok(time > 1900 && time < 5000, 'Time is not in 2s range ' + time);
        cb();
      });
    },
    _.bind(async.parallel, null, [
      _.bind(Q.bprocess, Q),
      _.bind(Qc.push, Qc, 'happy-days'),
      _.bind(Qc.push, Qc, 'television'),
      _.bind(Qc.push, Qc, 'shows')
    ]),
    _.bind(Q.bprocess, Q),
    checkByList(test, Q.todo, ['shows']),
    checkByList(test, Q.doing, ['television', 'happy-days'])
  ], function (err, results) {
    test.ifError(err);
    test.equal(results[1][0], 'happy-days');
    test.equal(results[2], 'television');
    test.done();
  });
};

tests.testFinish = function (test) {
  async.series([
    _.bind(Q.push, Q, 'something'),
    _.bind(Q.push, Q, 'else'),
    _.bind(Q.push, Q, 'argument'),
    _.bind(Q.process, Q),
    _.bind(Q.finish, Q, 'something'),
    _.bind(Q.process, Q),
    checkByList(test, Q.todo, ['argument']),
    checkByList(test, Q.doing, ['else']),
    checkByList(test, Q.done, ['something'])
  ], test.done);
};

tests.testFail = function (test) {
  async.series([
    _.bind(Q.push, Q, 'something'),
    _.bind(Q.push, Q, 'else'),
    _.bind(Q.push, Q, 'argument'),
    _.bind(Q.process, Q),
    _.bind(Q.process, Q),
    _.bind(Q.fail, Q, 'something'),
    checkByList(test, Q.todo, ['argument']),
    checkByList(test, Q.doing, ['else']),
    checkByList(test, Q.done, []),
    checkByList(test, Q.failed, ['something'])
  ], test.done);
};

tests.testsFinishFailBoth = function (test) {
  async.series([
    _.bind(Q.push, Q, 'job'),
    _.bind(Q.process, Q),
    _.bind(Q.fail, Q, 'job'),
    checkByList(test, Q.done, []),
    checkByList(test, Q.failed, ['job']),
    function (cb) {
      Q.finish('job', true, function (err) {
        test.ok(err instanceof Error);
        cb();
      });
    },
    checkByList(test, Q.done, []),
    checkByList(test, Q.failed, ['job']),
    _.bind(Q.finish, Q, 'job'),
    checkByList(test, Q.done, ['job']),
    checkByList(test, Q.failed, []),
  ], function (err, results) {
    test.ifError(err);
    test.equal(results[2], 1);
    Q.finish('job-nothere', function (err) {
      test.ok(err instanceof Error);
      test.done();
    });
  })
};

tests.testRemoveFrom = function (test) {
  async.series([
    _.bind(Q.push, Q, 'foo'),
    _.bind(Q.push, Q, 'bar'),
    _.bind(Q.process, Q),
    _.bind(Q.finish, Q, 'foo'),
    _.bind(Q.remove, Q, 'done', 'foo'),
    _.bind(Q.remove, Q, 'todo', 'bar'),
    checkByList(test, Q.done, []),
    checkByList(test, Q.doing, []),
    checkByList(test, Q.todo, [])
  ], test.done);
};

tests.testListen = function (test) {
  var listener = Q.listen()
    .on('error', test.ifError)
    .on('task', function (task, done) {
      test.ok(/^hello2?$/.test(task));
      checkByList(test, Q.doing, [task])(test.ifError);

      if (task === 'hello') {
        done();
      } else {
        setTimeout(done, 20);
      }
    })
    .on('end', function () {
      checkByList(test, Q.done, ['hello2', 'hello'])(test.done);
    });

  async.series([
    _.bind(Q.push, Q, 'hello'),
    function (cb) {
      setTimeout(cb, 10); // approx time to roundtrip local redis
    },
    checkByList(test, Q.done, ['hello']),
    _.bind(Q.push, Q, 'hello2'),
  ], function (err) {
    test.ifError(err);
    listener.end();
  });
};