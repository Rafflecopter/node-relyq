-- Pull recurring tasks out of their zset
-- KEYS:[zset], ARGV:[now]
-- Get their intervals and update the next processing time

local refs = redis.call("zrangebyscore", KEYS[1], 0, ARGV[1])
for i,ref in pairs(refs) do
  tref, int = string.match(ref, "([^|]*)|(\d+)")
  redis.call("zincrby", KEYS[1], int, tref)
  refs[i] = tref
end
return refs