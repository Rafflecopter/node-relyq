# relyq [![Build Status][1]][2]

A realtively simple Redis-backed reliable task queue and state machine.

Its made up of four [simpleq](https://github.com/yanatan16/simpleq)'s: todo, doing, failed, and done. Tasks will never be dropped on the floor even if a processing server crashes because all operations are atomic. Tasks can be represented as any data type.

_Note_: relyq assumes all tasks are different, specifically that they have unique IDs. relyq will create an ID using uuid v4 if no id is found (using the idfield option on `new relyq.Q` or `'id'`).

## Operation

Install:

```
npm install relyq
```

Creation:

```javascript
var redis = require('redis'),
  cli = redis.createClient();

var relyq = require('relyq');

// Then one of
var q = new relyq.Q(cli, 'my-relyq');
var q = new relyq.Q(cli, {prefix: 'my-relyq', options...});
var q = new relyq.Q(cli, 'my-relyq', storage_backend); // see below
```

Options:

- `prefix: 'my-relyq'` (required) - The redis key prefix for the sub-queues.
- `delimeter: '|'` (default: ':') - The redis key delimeter for the sub-queues.
- `idfield: 'tid'` (default: 'id') - The field of the task objects where the ID can be found.
- `ensureid: true` (default: false) - If true, relyq will create an ID on the idfield if one does not already exist.
- `createid: function (task) { return ... }` (default `uuid.v4()`) - The function used to create new IDs (strings). The task object is the first argument.

Operations:

- `q.push(task, function (err, todo_len) {...})`
- `q.process(function (err, task) {...})` Pop off the next task to process. May return null.
    - `q.bprocess(function (err, task) {...})` A blocking version of process, will never return null.
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

### In-Place

In-place solutions simply serialize task objects and store them in the queue directly. This probably isn't the most efficient solution, but its the simplest. There are two flavors provided:

- `new relyq.storage.InPlaceJson()` serializes using JSON (fast serialization, more space)
- `new relyq.storage.InPlaceMsgPack()` serializes using MsgPack (slower serialization, less space)

### Redis

The Redis storage backend stores serialized task objects in Redis.

- `new relyq.storage.RedisJson(redisClient, prefix, [{delimeter: ':'}])`
- `new relyq.storage.RedisMsgPack(redisClient, prefix, [{delimeter: ':'}])`

### Mongo

The Mongo storage backend stores task objects in Mongo.

```
var mongo = require('mongodb'),
  mongoClient = new mongo.MongoClient(new mongo.Server('my-server.com', 27017)),
  storage = new relyq.storage.Mongo(mongoClient, 'mydb', 'my.favorite.collection');
```

## License

See LICENSE file.

[1]: https://travis-ci.org/yanatan16/node-relyq.png?branch=master
[2]: http://travis-ci.org/yanatan16/node-relyq