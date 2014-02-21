// storage_test.js
require('longjohn').async_trace_limit = -1;

// vendor
var redis = require('redis').createClient(),
  Moniker = require('moniker'),
  async = require('async'),
  _ = require('underscore')
  mongo = require('mongodb'),
  mongoClient = new mongo.MongoClient(new mongo.Server('localhost', 27017)),
  uuid = require('uuid');

mongoClient.open(function (err, mc) {
  if (err) {
    throw err;
  }
  mongoClient = mc;
});

// local
var relyq = require('..'),
  count = counter();

// Storages to test
var storages = {
  'RedisJson': new relyq.RedisJsonQ(redis, {prefix:prefix('RedisJson'),clean_finish:false}),
  'RedisJson2': new relyq.RedisJsonQ(redis, { prefix: prefix('RedisJson2'), idfield: 'otherid', storage_prefix: prefix('RedisJson2-jobs'), clean_finish:false }),
  'Mongo': new relyq.MongoQ(redis, { mongo: mongoClient, db: 'test', collection: 'relyq.'+Moniker.choose()+'.jobs', prefix: prefix('Mongo'), clean_finish:false }),
  'CreateId': new relyq.RedisJsonQ(redis, { prefix: prefix('CreateId'), idfield: 'omgid', clean_finish:false,getid: function (t) { return t.omgid = t.omgid || uuid.v4(); }}),
  'CreateId2': new relyq.MongoQ(redis, { mongo: mongoClient,clean_finish:false, db: 'test', collection: 'relyq.'+Moniker.choose()+'.jobs', prefix: prefix('CreateId2'), idfield: 'omgid',
    getid: function (t) { return t.omgid = t.omgid || count(); }}),
}

_.each(storages, function (q, name) {
  exports[name] = createTests(q);
});

// Clean up redis to allow a clean escape!
exports.cleanUp = function cleanUp (test) {
  redis.end();
  mongoClient.db('test').collection('relyq.jobs').drop(function () {
    mongoClient.close(test.done);
  });
};

// If we are getting a test.done complaint, turn this on. It helps find errors
process.on('uncaughtException', function (err) {
  console.error(err.stack);
});

function createTests(Q) {
  var tests = {};

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

  function checkByStorageList(test, sQ, exp, ignore) {
    var stack = new Error().stack;
    return function (callback) {
      async.waterfall([
        _.bind(sQ.list, sQ),
        function (list, cb) {
          async.map(list, function (ref, cb2) {
            Q.get(ref, function (err, obj) {
              cb2(err, _.omit(obj, ignore));
            });
          }, cb);
        },
        function (list2, cb) {
          list2 = list2.map(function (obj) { return _.omit(obj, 'error') })
          exp = exp.map(function (obj) { return _.omit(obj, 'error') })
          test.deepEqual(list2, exp, 'checkByStorageList: ' + stack);
          cb();
        }
      ], callback);
    };
  }

  var InPlace = /^InPlace/.test(Q.constructor.name);

  // -- Tests --

  tests.testFull = function (test) {
    try {
      var task1 = { id: '123', otherid: 'cachoa!', data: { hello: 'dolly' }},
        task2 = { id: '321', otherid: '?augment', data: { goodbye: 'dolly' }},
        task3 = { id: '213', otherid: 'blahblah', data: {something: 'else' }};
      async.series([
        _.bind(Q.push, Q, task1),
        _.bind(Q.push, Q, task2),
        _.bind(Q.push, Q, task3),
        _.bind(Q.process, Q),
        _.bind(Q.process, Q),
        _.bind(Q.process, Q),
        _.bind(Q.fail, Q, task2, (InPlace ? undefined : new Error('ahh!'))),
        _.bind(Q.finish, Q, task1),
        checkByStorageList(test, Q.todo, []),
        checkByStorageList(test, Q.doing, [task3]),
        checkByStorageList(test, Q.done, [task1]),
        checkByStorageList(test, Q.failed, [task2]),
        _.bind(Q.remove, Q, 'done', task1),
        _.bind(Q.remove, Q, 'failed', task2, true),
        checkByStorageList(test, Q.done, []),
        checkByStorageList(test, Q.failed, []),
        _.bind(Q.get, Q, Q.ref(task2)),
        _.bind(Q.get, Q, Q.ref(task1)),
        function (cb) {
          Q._clean_finish = true;
          Q._keep_storage = true;
          cb();
        },
        _.bind(Q.finish, Q, task3),
        checkByStorageList(test, Q.done, []),
        function (cb) {
          Q.get(Q.ref(task3), function (err, obj) {
            test.ifError(err);
            test.deepEqual(_.omit(obj,'_id'), _.omit(task3,'_id'));
            cb();
          });
        },
        function (cb) {
          Q._clean_finish = false;
          Q._keep_storage = false;
          cb();
        }
      ], function (err, results) {
        test.ifError(err);
        test.deepEqual(results[3], task1);
        test.deepEqual(results[4], _.omit(task2, 'error'));
        test.deepEqual(results[16], task2);

        if (!InPlace) {
          test.ok(task2.error && task2.error.match(/^Error: ahh!/));
          test.deepEqual(results[17], null);
        } else {
          test.deepEqual(results[17], task1);
        }


        Q.finish(task2, function (err) {
          test.ok(err instanceof Error);
          test.done();
        });
      });
    } catch (e) {
      test.done(e);
    }
  };

  if (!InPlace) {

    tests.testListen = function (test) {
      var i = 0,
        atask1 = { id: '456', otherid: 'tucan', data: { hello: 'mother' }},
        atask2 = { id: '654', otherid: 'sam', data: { goodbye: 'father' }};

      var listener = Q.listen()
        .on('error', test.ifError)
        .on('task', function (task, done) {
          test.deepEqual(task, _.clone(++i===1 ? atask1 : atask2));

          var ndone = done;
          if (i===2) {
            ndone = function () {
              done(new Error('omg'));
            };
          } else {
            setTimeout(function () { done(); test.equal(listener._out, 1); }, 30);
          }
          setTimeout(ndone, i*20);
        })
        .on('end', function () {
          async.series([
            checkByStorageList(test, Q.done, [atask1]),
            checkByStorageList(test, Q.failed, [_.defaults(atask2, {error:'Error: omg'})]),
          ], test.done);
        });

      async.series([
        _.bind(Q.push, Q, atask1),
        function (cb) {
          setTimeout(cb, 10);
        },
        _.bind(Q.push, Q, atask2),
        function (cb) {
          setTimeout(cb, 30); // approx time to roundtrip local redis and wait for timeout
        },
        checkByStorageList(test, Q.done, [atask1]),
      ], function (err) {
        test.ifError(err);
        listener.end();
      });
    };
  }

  return tests;
}

function counter(n) {
  n = n || 0;
  return function () {
    return '' + n++;
  };
}

function prefix(name) {
  return ['relyq-test', name, Moniker.choose()].join(':');
}