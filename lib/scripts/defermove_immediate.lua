-- Move tasks from a deferred zset to the todo simpleq (by ids)
-- KEYS:[deferred_zset, todo_simpleq], ARGV:[ref]
local i = redis.call("zrem", KEYS[1], ARGV[1])
if i > 0 then
  redis.call("lpush", KEYS[2], ARGV[1])
end
return i