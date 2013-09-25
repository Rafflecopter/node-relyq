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

process.on('uncaughtException', function (err) {
  console.error(err.stack);
});

tests.setUp = function setUp (callback) {
  Q = new relyq.Q(redis, {prefix: 'relyq-test:' + Moniker.choose(), clean_finish: false});
  Qc = new relyq.Q(redis2, {clean_finish: false, prefix: Q._prefix});

  Q.on('error', function (err) { throw err; })
  Qc.on('error', function (err) { throw err; })
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
function checkByList(test, sQ, exp) {
  var stack = new Error().stack;
  return function (callback) {
    async.waterfall([
      _.bind(sQ.list, sQ),
      function (list, cb) {
        async.map(list, function (ref, cb2) {
          Q.get(ref, function (err, obj) {
            cb2(err, obj.f);
          });
        }, cb);
      },
      function (list2, cb) {
        test.deepEqual(list2, exp, 'checkByStorageList: ' + stack);
        cb();
      }
    ], callback);
  };
}

// -- Tests --

tests.testPush = function (test) {
  async.series([
    _.bind(Q.push, Q, {f:'foo123'}),
    _.bind(Q.push, Q, {f:'456bar'}),

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
    _.bind(Q.push, Q, {f:'pleasure'}),
    _.bind(Q.push, Q, {f:'pain'}),
    _.bind(Q.process, Q),
    checkByList(test, Q.todo, ['pain']),
    checkByList(test, Q.doing, ['pleasure'])
  ], function(err, results) {
    test.ifError(err);
    test.equal(results[0], null);
    test.equal(results[3].f, 'pleasure');
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
      _.bind(Qc.push, Qc, {f:'happy-days'}),
      _.bind(Qc.push, Qc, {f:'television'}),
      _.bind(Qc.push, Qc, {f:'shows'})
    ]),
    _.bind(Q.bprocess, Q),
    checkByList(test, Q.todo, ['shows']),
    checkByList(test, Q.doing, ['television', 'happy-days'])
  ], function (err, results) {
    test.ifError(err);
    test.equal(results[1][0].f, 'happy-days');
    test.equal(results[2].f, 'television');
    test.done();
  });
};

tests.testFinish = function (test) {
  async.auto({
    p1: _.bind(Q.push, Q, {f:'something'}),
    p2: ['p1',_.bind(Q.push, Q, {f:'else'})],
    p3: ['p2',_.bind(Q.push, Q, {f:'argument'})],
    proc: ['p3',_.bind(Q.process, Q)],
    fin: ['proc', function (cb, results) { Q.finish(results.proc, cb); }],
    proc2: ['proc', _.bind(Q.process, Q)],
    c1: ['proc2',checkByList(test, Q.todo, ['argument'])],
    c2: ['proc2','fin',checkByList(test, Q.doing, ['else'])],
    c3: ['proc2','fin',checkByList(test, Q.done, ['something'])],
  }, test.done);
};


tests.testCleanFinish = function (test) {
  Q._clean_finish = true; // usually an option
  async.auto({
    p1: _.bind(Q.push, Q, {f:'something'}),
    p2: ['p1',_.bind(Q.push, Q, {f:'else'})],
    p3: ['p2',_.bind(Q.push, Q, {f:'argument'})],
    proc: ['p3',_.bind(Q.process, Q)],
    fin: ['proc', function (cb, results) { Q.finish(results.proc, cb); }],
    proc2: ['proc', _.bind(Q.process, Q)],
    c1: ['proc2',checkByList(test, Q.todo, ['argument'])],
    c2: ['proc2','fin',checkByList(test, Q.doing, ['else'])],
    c3: ['proc2','fin',checkByList(test, Q.done, [])],
  }, test.done);
};

tests.testFail = function (test) {
  async.auto({
    p1: _.bind(Q.push, Q, {f:'something'}),
    p2: ['p1',_.bind(Q.push, Q, {f:'else'})],
    p3: ['p2',_.bind(Q.push, Q, {f:'argument'})],
    proc: ['p3',_.bind(Q.process, Q)],
    proc2: ['proc', _.bind(Q.process, Q)],
    fin: ['proc', function (cb, results) { Q.fail(results.proc, cb); }],
    c1: ['proc2',checkByList(test, Q.todo, ['argument'])],
    c2: ['proc2','fin',checkByList(test, Q.doing, ['else'])],
    c3: ['proc2','fin',checkByList(test, Q.done, [])],
    c3: ['proc2','fin',checkByList(test, Q.failed, ['something'])]
  }, test.done);
};

tests.testsFinishFailBoth = function (test) {
  async.auto({
    p1: _.bind(Q.push, Q, {f:'job'}),
    proc1: ['p1',_.bind(Q.process, Q)],
    f1: ['proc1', function (cb, results) { Q.fail(results.proc1, cb); }],
    c1: ['f1', checkByList(test, Q.done, [])],
    c2: ['f1', checkByList(test, Q.failed, ['job'])],
    f2: ['f1', function (cb, results) {
      Q.finish(results.proc1, true, function (err) {
        test.ok(err instanceof Error);
        cb();
      });
    }],
    c3: ['f2', checkByList(test, Q.done, [])],
    c4: ['f2', checkByList(test, Q.failed, ['job'])],
    f3: ['f2', function (cb, res) { Q.finish(res.proc1, cb); }],
    c5: ['f3', checkByList(test, Q.done, ['job'])],
    c6: ['f3', checkByList(test, Q.failed, [])],
    f4: ['f3', function (cb, res) {
      Q.finish({id:'nothere'}, function (err) {
        test.ok(err instanceof Error);
        cb();
      });
    }],
    check: ['f4', function (cb, results) {
      test.equal(results.proc1.f, 'job');
      cb();
    }],
  }, test.done);
};

tests.testRemoveFrom = function (test) {
  async.auto({
    p1: _.bind(Q.push, Q, {f:'foo'}),
    p2: ['p1', _.bind(Q.push, Q, {f:'bar',id:'123'})],
    r1: ['p1', _.bind(Q.process, Q)],
    f1: ['r1', function (cb,res) { Q.finish(res.r1,cb);}],
    r2: ['f1', function (cb,res) { Q.remove('done', res.r1, cb); }],
    r3: ['f1', 'p2', function (cb, res){ Q.remove('todo', {f:'bar',id:'123'}, cb); }],
    c1: ['r2','r3',checkByList(test, Q.done, [])],
    c2: ['r2','r3',checkByList(test, Q.doing, [])],
    c3: ['r2','r3',checkByList(test, Q.todo, [])],
  }, test.done);
};

tests.testListen = function (test) {
  var listener = Q.listen()
    .on('error', test.ifError)
    .on('task', function (task, done) {
      test.ok(/^hello2?$/.test(task.f));

      if (task.f === 'hello') {
        done();
      } else {
        process.nextTick(listener.end.bind(listener));
        setTimeout(done, 20);
      }
    })
    .on('end', function () {
      checkByList(test, Q.done, ['hello2', 'hello'])(test.done);
    });

  async.series([
    _.bind(Q.push, Q, {f:'hello'}),
    function (cb) {
      setTimeout(cb, 10); // approx time to roundtrip local redis
    },
    checkByList(test, Q.done, ['hello']),
    _.bind(Q.push, Q, {f:'hello2'}),
  ], test.ifError);
};