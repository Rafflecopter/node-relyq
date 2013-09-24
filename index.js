
var redis = require('./lib/storage/redis'),
  mongo = require('./lib/storage/mongo');


module.exports = {
  Q: redis.json,
  RedisJsonQ: redis.json,
  RedisMsgPackQ: redis.msgpack,
  MongoQ: mongo
};