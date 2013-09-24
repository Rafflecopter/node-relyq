
var Q = require('./lib/relyq'),
  inplace = require('./lib/storage/inplace'),
  redis = require('./lib/storage/redis'),
  mongo = require('./lib/storage/mongo');


module.exports = {
  Q: Q,
  InPlaceBasic: Q,
  InPlaceJsonQ: inplace.json,
  InPlaceMsgPackQ: inplace.msgpack,
  RedisJsonQ: redis.json,
  RedisMsgPackQ: redis.msgpack,
  MongoQ: mongo
};