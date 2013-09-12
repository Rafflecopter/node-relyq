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

## License

See LICENSE file.

[1]: https://travis-ci.org/yanatan16/node-relyq.png?branch=master
[2]: http://travis-ci.org/yanatan16/node-relyq