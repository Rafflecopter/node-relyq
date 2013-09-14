// storage_test.js
require('longjohn');

// vendor
var redis = require('redis').createClient(),
  Moniker = require('moniker'),
  async = require('async'),
  _ = require('underscore')
  mongo = require('mongodb'),
  mongoClient = new mongo.MongoClient(new mongo.Server('localhost', 27017));

mongoClient.open(function (err, mc) {
  if (err) {
    throw err;
  }
  mongoClient = mc;
});

// local
var relyq = require('..');

// Storages to test
var storages = {
  'InPlaceJson': new relyq.InPlaceJsonQ(redis, prefix('InPlaceJson')),
  'MsgPackInPlace': new relyq.InPlaceMsgPackQ(redis, prefix('MsgPackJson')),
  'RedisJson': new relyq.RedisJsonQ(redis, prefix('RedisJson')),
  'RedisJson2': new relyq.RedisJsonQ(redis, { prefix: prefix('RedisJson2'), idfield: 'otherid', storage_prefix: prefix('RedisJson2-jobs') }),
  'MsgPackJson': new relyq.RedisMsgPackQ(redis, prefix('MsgPackJson')),
  'Mongo': new relyq.MongoQ(mongoClient, redis, { db: 'test', collection: 'relyq.jobs', prefix: prefix('Mongo') }),
  'CreateId': new relyq.RedisJsonQ(redis, { prefix: prefix('CreateId'), idfield: 'omgid', ensureid: true /* fails with false */}),
  'CreateId2': new relyq.RedisJsonQ(redis, { prefix: prefix('CreateId2'), idfield: 'omgid', ensureid: true, createid: counter() })
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
    return function (callback) {
      async.waterfall([
        _.bind(sQ.list, sQ),
        function (list, cb) {
          async.map(list, function (id, cb2) {
            Q.get(id, function (err, obj) {
              if (ignore && object) { delete object[ignore]; }
              cb2(err, obj);
            });
          }, cb);
        },
        function (list2, cb) {
          test.deepEqual(list2, exp);
          cb();
        }
      ], callback);
    };
  }

  // -- Tests --

  tests.testFull = function (test) {
    try {
      var task1 = { id: '123', otherid: 'cachoa!', data: { hello: 'dolly' }},
        task2 = { id: '321', otherid: '?augment', data: { goodbye: 'dolly' }};
      async.series([
        _.bind(Q.push, Q, task1),
        _.bind(Q.push, Q, task2),
        _.bind(Q.process, Q),
        _.bind(Q.process, Q),
        _.bind(Q.fail, Q, task2),
        _.bind(Q.finish, Q, task1),
        checkByStorageList(test, Q.todo, []),
        checkByStorageList(test, Q.doing, []),
        checkByStorageList(test, Q.done, [task1]),
        checkByStorageList(test, Q.failed, [task2]),
        _.bind(Q.remove, Q, 'done', task1),
        checkByStorageList(test, Q.done, [])
      ], function (err, results) {
        test.ifError(err);
        test.deepEqual(results[2], task1);
        test.deepEqual(results[3], task2);

        Q.finish(task2, function (err) {
          test.ok(err instanceof Error);
          test.done();
        });
      });
    } catch (e) {
      test.done(e);
    }
  };

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