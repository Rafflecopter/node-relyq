# relyq [![Build Status][1]][2]

A relatively simple Redis-backed reliable task queue and state machine.

Its made up of four [simpleq](https://github.com/Rafflecopter/simpleq)'s: todo, doing, failed, and done. Tasks will never be dropped on the floor even if a processing server crashes because all operations are atomic. Tasks can be represented as any data type.

_Note_: relyq assumes all tasks are different, specifically that they have unique IDs. relyq can create these using the `.getid` function, but that is not its original intent. Also, relyq is meant to work with tasks that are objects. If you wish to represent tasks as other things, it should work, but advanced options won't be available to you.

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
  Q = relyq.InPlaceBasicQ; // pick a queue (see below)

// Then instantiate as described below
var q = new Q(cli, 'my-relyq');
// or
var q = new Q(cli, options);
```

Options:

- `prefix: 'my-relyq'` (required) - The redis key prefix for the sub-queues.
- `clean_finish: false` (default: true) - _IMPORTANT_ Clean finish will not store tasks that are completed without error. They will be immediately deleted from the queue and the storage backend. This saves Redis memory. If you wish to keep your documents in storage (a good idea with Mongo storage), but remove them from the queue, set `clean_finish: 'keep_storage'`.
- `delimeter: '|'` (default: ':') - The redis key delimeter for the sub-queues.
- `idfield: 'tid'` (default: 'id') - The field of the task objects where the ID can be found.
- `getid: function (task) { return task[idfield] }` - A function to retrieve the id from a task.
  - You can also use this function to create ids for tasks that are missing them like so:
  ```
  getid: function (task) { return task.idfield = task.idfield || createid(); }
  ```

See below for storage-specific options...

Operations:

- `q.push(task, function (err, todo_len) {...})`
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
    timeout: 2, // seconds
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

## Tests

```
npm install -g nodeunit
npm install --dev
npm test
```

## Backends

Normal operation stores the full task description or object in the queue itself. This can be inefficient for LREM operations. Sometimes one might even want to store task descriptions in a separate datastore than redis to save memory. Custom backends have been created for this purpose.

### In-Place

In-place solutions simply serialize task objects and store them in the queue directly. This probably isn't the most efficient solution, but its the simplest. Each takes the same arguments, a redis client and a prefix string OR options object (see Options above). There are a few flavors provided:

- `new relyq.InPlaceBasicQ(redis, opts)` doesn't even do serialization.
- `new relyq.InPlaceJsonQ(redis, opts)` serializes using JSON (fast serialization, more space)
- `new relyq.InPlaceMsgPackQ(redis, opts)` serializes using MsgPack (slower serialization, less space)

_Note_: In-Place serializations don't allow you to change the task object once it has been pushed into the system. Hence, its not that useful.

### Redis

The Redis backend stores serialized task objects in Redis. Each options object also accepts the `storage_prefix` field to set the prefix for where task objects are stored.

- `new relyq.RedisJsonQ(redisClient, prefix, [{delimeter: ':'}])`
- `new relyq.RedisMsgPackQ(redisClient, prefix, [{delimeter: ':'}])`

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