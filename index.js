
var Q = require('./relyq');


module.exports = {
  Q: Q,
  InPlaceBasic: Q,
  InPlaceJsonQ: require('./storage/json_inplace'),
  InPlaceMsgPackQ: require('./storage/msgpack_inplace'),
  RedisJsonQ: require('./storage/json_redis'),
  RedisMsgPackQ: require('./storage/msgpack_redis'),
  MongoQ: require('./storage/mongo')
};