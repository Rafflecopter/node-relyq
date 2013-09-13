// storage_test.js

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
var relyq = require('../relyq');

// Storages to test
var storages = {
  'InPlaceJson': new relyq.storage.InPlaceJson(),
  'MsgPackInPlace': new relyq.storage.InPlaceMsgPack(),
  'RedisJson': new relyq.storage.RedisJson(redis, 'relyq-test:RedisJson:jobs'),
  'RedisJson2': new relyq.storage.RedisJson(redis, 'relyq-test:RedisJson2:jobs', {idfield: 'otherid'}),
  'MsgPackJson': new relyq.storage.RedisMsgPack(redis, 'relyq-test:MsgPackJson:jobs'),
  'Mongo': new relyq.storage.Mongo(mongoClient, 'test', 'relyq.jobs')
}

_.each(storages, function (storage, name) {
  exports[name] = createTests(storage);
});

// Clean up redis to allow a clean escape!
exports.cleanUp = function cleanUp (test) {
  redis.end();
  mongoClient.db('test').collection('relyq.jobs').drop(function () {
    mongoClient.close(test.done);
  });
};


function createTests(storage) {
  var name = storage.constructor.name,
    tests = {},
    Q;

  tests.setUp = function setUp (callback) {
    var prefix = ['relyq-test', name, Moniker.choose()].join(':');
    Q = new relyq.Q(redis, prefix, storage);
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

  function checkByStorageList(test, Q, exp, ignore) {
    return function (callback) {
      async.waterfall([
        _.bind(Q.list, Q),
        function (list, cb) {
          async.map(list, function (id, cb2) {
            storage.get(id, function (err, obj) {
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
    var task1 = { id: '123', otherid: 'cachoa!', data: { hello: 'dolly' }},
      task2 = { id: '321', otherid: '?augment', data: { goodbye: 'dolly' }};
    async.series([
      _.bind(Q.push, Q, task1),
      _.bind(Q.push, Q, task2),
      _.bind(Q.process, Q),
      _.bind(Q.process, Q),
      _.bind(Q.finish, Q, task1),
      _.bind(Q.fail, Q, task2),
      checkByStorageList(test, Q.todo, []),
      checkByStorageList(test, Q.doing, []),
      checkByStorageList(test, Q.done, [task1]),
      checkByStorageList(test, Q.failed, [task2])
    ], function (err, results) {
      test.ifError(err);
      test.deepEqual(results[2], task1);
      test.deepEqual(results[3], task2);

      Q.finish(task2, function (err) {
        test.ok(err instanceof Error);
        test.done();
      });
    });
  };

  return tests;
}