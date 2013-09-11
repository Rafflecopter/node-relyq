# relyq [![Build Status][1]][2]

A Redis-backed reliable task queue and state machine.

All queuing logic is done using ids. Its made up of four [simpleq](https://github.com/yanatan16/simpleq)'s: todo, doing, failed, and done. Tasks will never be dropped on the floor even if a processing server crashes because all operations are atomic.

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

- `push(rq, id): simpleq.push(rq.todo, id)`
- `process(rq): simpleq.poppipe(rq.todo, rq.doing)` Pull off a task to be processed
- `finish(rq, id): simpleq.pullpipe(rq.doing, rq.done, id)`
- `fail(rq, id): simpleq.pullpipe(rq.doing, rq.failed, id)`
- `expire(rq, expiry)` Find all expired `doing` tasks and fail them.

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