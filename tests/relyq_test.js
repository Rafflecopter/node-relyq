// relyq_test.js

// vendor
var redis = require('redis').createClient(),
  redis2 = require('redis').createClient(),
  Moniker = require('moniker'),
  async = require('async'),
  _ = require('underscore');

// local
var relyq = require('../relyq');

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
    test.equal(results[0][0], 'happy-days');
    test.equal(results[1], 'television');
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
    _.bind(Q.fail, Q, 'job')
  ], function (err, results) {
    test.ifError(err);
    test.equal(results[2], 1);
    Q.finish('job', function (err) {
      test.ok(err instanceof Error);
      test.done();
    });
  })
};