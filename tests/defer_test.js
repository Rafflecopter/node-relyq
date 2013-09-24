// defer_test.js

// vendor
var redis = require('redis').createClient(),
  Moniker = require('moniker'),
  async = require('async'),
  _ = require('underscore');

// local
var relyq = require('..');

// Setup
var tests = exports.tests = {},
  Q;

process.on('uncaughtException', function (err) {
  console.error(err);
});

tests.setUp = function setUp (callback) {
  Q = new relyq.Q(redis, {
    prefix: 'relyq-test:' + Moniker.choose(),
    clean_finish: true,
    allow_defer: true,
    defer_interval: 50,
  });
  callback();
};

tests.tearDown = function tearDown (callback) {
  if (Q) {
    return async.parallel([
      _.bind(Q.todo.clear, Q.todo),
      _.bind(Q.doing.clear, Q.doing),
      _.bind(Q.failed.clear, Q.failed),
      _.bind(Q.end, Q),
    ], callback);
  }
  callback();
};

// Clean up redis to allow a clean escape!
exports.cleanUp = function cleanUp (test) {
  redis.end();
  test.done();
};

// -- helpers --
function checkByList(test, Q, exp) {
  var stack = new Error().stack
  return function (cb) {
    Q.list(function (err, list) {
      test.ifError(err);
      test.deepEqual(list, exp, stack);
      cb();
    });
  };
}

tests.testDefer = function (test) {
  var now = Date.now();
  async.auto({
    defer: _.bind(Q.defer, Q, 'i should be late', Date.now() + 100),
    testnotthere: checkByList(test, Q.todo, []),
    wait: ['defer', function (cb, results) { setTimeout(cb, 150); }],
    testtodo: ['wait', checkByList(test, Q.todo, ['i should be late'])],
    process: ['testtodo', function (cb, results) { Q.process(cb); }],
    testproc: ['process', function (cb, results) {  test.equal(results.process, 'i should be late'); cb(); }],
  }, test.done);
}