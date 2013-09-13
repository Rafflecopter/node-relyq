# relyq [![Build Status][1]][2]

A realtively simple Redis-backed reliable task queue and state machine.

Its made up of four [simpleq](https://github.com/yanatan16/simpleq)'s: todo, doing, failed, and done. Tasks will never be dropped on the floor even if a processing server crashes because all operations are atomic. Tasks can be represented as any data type.

## Operation

Install:

```
npm install relyq
```

Creation:

```javascript
var redis = require('redis'),
  cli = redis.createClient();

var relyq = require('relyq'),
  q = new relyq.Q(cli, 'my-relyq');
```

Operations:

- `q.push(task, function (err, todo_len) {...})`
- `q.process(function (err, task) {...})`
- `q.finish(task, function (err, finish_len) {...})` An error is passed if the task does not exist in the in process queue.
- `q.fail(task, function (err, finish_len) {...})` An error is passed if the task does not exist in the in process queue.

## Tests

```
npm install -g nodeunit
npm install --dev
npm test
```

## Storage Backends

Normal operation stores the full task description or object in the queue itself. This can be inefficient for LREM operations. Sometimes one might even want to store task descriptions in a separate datastore than redis to save memory. Custom storage backends have been created for this purpose.

### Redis

The Redis storage backend stores task objects in Redis.

```javascript
var relyq = require('relyq'),
  RedisStorage = relyq.storage.redis,
  storage = new RedisStorage(redisClient, 'my-relyq:jobs'),
  q = new relyq.Q(redisClient, 'my-relyq', storage);

// This will store the object in redis separately from the task id in the queue
q.push({
  id: 'task-id-123',
  data: {...}
});
```

Additional options are available as the last argument of `new RedisStorage()`.

```javascript
storage = new RedisStorage(redisClient, 'my-relyq|jobs', {
  idfield: 'task_id', // controls where to pull the taskid out of from taskobj
  delimeter: '|' // the key delimeter => 'my-relyq|jobs|{taskid}'
});

q.push({
  task_id: 'my-task-id',
  data: {...}
});
```

## License

See LICENSE file.

[1]: https://travis-ci.org/yanatan16/node-relyq.png?branch=master
[2]: http://travis-ci.org/yanatan16/node-relyq