# relyq [![Build Status][1]][2]

A relatively simple Redis-backed reliable task queue and state machine.

Its made up of four [simpleq](https://github.com/Rafflecopter/simpleq)'s: todo, doing, failed, and done. Tasks will never be dropped on the floor even if a processing server crashes because all operations are atomic.

_Note_: relyq assumes all tasks are objects. It is opinionated in that way. Also, all tasks have id's. If they don't exist, they are created using `uuid.v4()`.

_NEW_: It is deprecated to pass in a redis object like `new Q(redis, opts)`, instead use the `new Q({createRedis: function () {}, otherOpts...})` method. Now relyq will clean up the redis instance as well on `.end()`.

## Operation

Install:

```
npm install relyq
```

Creation:

```javascript
var redis = require('redis'),
  createRedis = function () { return redis.createClient() };

var relyq = require('relyq'),
  Q = relyq.RedisJsonQ; // pick a queue (see below)

// Then instantiate as described below
var q = new Q({prefix: 'my-relyq', createRedis: createRedis});
```

Options:

- `prefix: 'my-relyq'` (required) - The redis key prefix for the sub-queues.
- `createRedis: function ()` (required) - A function of no arguments that returns a (new) redis client.
- `clean_finish: true` (default: true) - _IMPORTANT_ Clean finish will not store tasks that are completed without error. They will be immediately deleted from the queue and the storage backend. This saves Redis memory. If you wish to keep your documents in storage (a good idea with Mongo storage), but remove them from the queue, set `clean_finish: 'keep_storage'`.
- `delimeter: ':'` (default: ':') - The redis key delimeter for the sub-queues.
- `idfield: 'id'` (default: 'id') - The field of the task objects where the ID can be found.
- `allow_defer: true` (default: true) - Allow deferred tasks
  - `defer_polling_interval: 1000) (default: 1000 milliseconds) - Interval for checking for deferred tasks

See below for storage-specific options...

Operations:

- `q.push(task, function (err, todo_len) {...})`
  - `q.defer(task, when, function (err) {...})` (when using defer, do listen on the `'error'` event on the relyq object)
- `q.process(function (err, task) {...})` Pop off the next task to process. May return null.
    - `q.bprocess([timeout,] function (err, task) {...})` A blocking version of process, will never return null unless timeout occurs. Timeout is an integer number of seconds.
- `q.finish(task, [dontCheckFailed, ] function (err, finish_len) {...})` This method moves a task from the `doing` queue to the `done` queue. If it doesn't exist in `doing`, it is possible you might have moved it to `failed` for a timeout, so we also check for the task in the `failed` queue. An error is passed if the task does not exist in the in either queue. Pass true as the second parameter if you don't wish to check the `failed` queue for the task should it not exist in `doing`.
- `q.fail(task, [error,] function (err, finish_len) {...})` This method moves a task from the `doing` queue to the `failed` queue. An error is passed if the task does not exist in the in the queue. If an error is passed in, it is attached to the task on the `.error` field.
- `q.remove(subqueue, task, function (err) {...})` Remove a task from a certain subqueue. The subqueues are `todo`, `doing`, `done`, and `failed`. This will also remove the task from storage.
  - If you don't want to remove the task from storage but want to eliminate it from the queue, you can call the function like `q.remove(subqueue, task, true, callback);`

Processing Listener:

By far the easiest way to listen for jobs is to use the listener feature.

```javascript
var listener = rq.listen({
    max_out: 10, // maximum tasks to emit at one time
  })
  .on('error', function (err, optional_taskref) {
    if (taskref) {...}
    else {...}
  })
  .on('task', function (task, done) {
    // do task
    done(error_or_not); // This will call rq.fail or rq.finish!
                        // Its safe to call twice
  })
  .on('end', function () {
    // this is when we really end
  });

// some time later
listener.end(); // notify to wait for all tasks to done(), then end
```

## Deferred Tasks

```javascript
var q = new relyq.MongoQ({ allow_defer: true }) // Non-redis is recommended for applications with a lot of deferred tasks

// Defer a task using the when field
q.push({
  some: 'task',
  id: 'known-id',
  when: Date.now() + 1000
})

// Change the time to process by using the same ID
q.push({
  some: 'task',
  id: 'known-id',
  when: Date.now() + 5000
})

// Or use the direct .defer()
q.defer(taskobject, whentime, callback)

// We can also undefer things
q.undefer_remove('known-id')

// Do it immediately
q.undefer_push('known-id')
```

## Tests

```
npm install -g nodeunit
npm test
```

## Backends

Normal operation stores the full task description or object in the queue itself. This can be inefficient for LREM operations. Sometimes one might even want to store task descriptions in a separate datastore than redis to save memory. Custom backends have been created for this purpose.

### Redis

The Redis backend stores serialized task objects in Redis. Each options object also accepts the `storage_prefix` field to set the prefix for where task objects are stored.

- `new relyq.RedisJsonQ(redisClient, prefix, [{delimeter: ':'}])`

### Mongo

The Mongo backend stores task objects in Mongo. It requires a mongo connection AND a redis connection.

```
var mongo = require('mongodb'),
  mongoClient = new mongo.MongoClient(new mongo.Server('my-server.com', 27017)),
  q = new relyq.MongoQ(redisClient, { mongo: mongoClient, prefix: 'my-relyq', db: 'mydb', collection: 'my.favorite.collection', idfield: '_id' });
```

The three extra options are:

- `mongo: mongoClient` (required) A MongoClient from `mongodb` package
- `db: myapp` (default: 'test') A db to connect to
- `collection: relyq` (default: 'relyq.jobs') Collection to use as job storage

_Note_: If `opts.idfield` is not set to `_id`, you may need to add an index to the collection: `.ensureIndex({idfield: 1}, {unique: true});`

## License

See LICENSE file.

[1]: https://travis-ci.org/Rafflecopter/node-relyq.png?branch=master
[2]: http://travis-ci.org/Rafflecopter/node-relyq