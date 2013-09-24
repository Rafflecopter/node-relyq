
var Q = require('./lib/relyq'),
  inplace = require('./storage/inplace'),
  redis = require('./storage/redis'),
  mongo = require('./storage/mongo');


module.exports = {
  Q: Q,
  InPlaceBasic: Q,
  InPlaceJsonQ: inplace.json,
  InPlaceMsgPackQ: inplace.msgpack,
  RedisJsonQ: redis.json,
  RedisMsgPackQ: redis.msgpack,
  MongoQ: mongo
};