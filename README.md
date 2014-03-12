node-internal-pubsub
====================

A publish/subscribe API similar to that in `node_redis`, minus the redis.

[![Build Status](https://travis-ci.org/danielstjules/node-internal-pubsub.png)](https://travis-ci.org/danielstjules/node-internal-pubsub)

## Installation

Using npm, you can install node-internal-pubsub with
`npm install node-internal-pubsub`. You can also require it as a dependency in
your `package.json` file:

```
"dependencies": {
    "node-internal-pubsub": ">0.0.0"
}
```

## Overview

Quite a few SockJS and Socket.IO examples/tutorials create a redis client in
subscriber mode per socket connection. They demonstrate code along the lines of:

``` javascript
sockjs.on('connection', function(conn) {
  var sub = redis.createClient();
  ...
}
```

or

``` javascript
io.sockets.on('connection', function(socket) {
  var sub = redis.createClient();
  ...
}
```

While the `node_redis` pubsub API simplifies the management of subscriptions as
opposed to listeners (e.g. using EventEmitter), it likely shouldn't be used for
internal message routing as seen in the above example. This is mostly due the
possible duplication of data and unnecessary network IO.

As such, this library exists to simplify the transition to using a single
redis client for all connections, in addition to an internal pubsub mechanism.
Most of the API has been designed to resemble that in `node_redis`, though a key
difference exists: rather than offering glob-based pattern subscriptions,
regular expressions are available.

## Performance

A benchmark can be found at `benchmarks/singleChannelMultiSubs.js`. It tests
the performance of sending 10,000,000 messages in a single channel using
2,000 redis clients/subscribers, compared to a single redis client
and 2,000 `node-internal-pubsub` subscribers. Example results can be seen below:

```
$ node benchmarks/singleChannelMultiSubs.js
Setting up redis suite
Receiving 10000000 messages with 2000 redis subscribers
Setting up pubsub suite
Receiving 10000000 messages with 1 redis sub, 2000 pubsub subscribers

Redis subscribers
Running time: 29735 ms
Avg messages received per second: 336,304

Redis subscriber with pubsub subscribers
Running time: 1203 ms
Avg messages received per second: 8,312,551
```

A ~25x performance improvement can be seen by using the 2,000 internal
subscribers as opposed to the same number of redis clients.

## Publisher

A publisher in the internal pub sub module. Publishes messages by invoking
emit on an instance of PatternEmitter.

#### createPublisher()

Creates and returns a new Publisher instance.

``` javascript
var pubsub     = require('node-internal-pubsub');
var publisher  = pubsub.createPublisher();
```

#### publisher.publish(channel, message)

Publishes a message to the given channel. Channel is expected to be a string,
though message can be any object.

``` javascript
var pubsub     = require('node-internal-pubsub');
var publisher  = pubsub.createPublisher();

publisher.publish('channel:1', 'A message to send to all channel subscribers');
```

## Subscriber

A subscriber in the internal pub sub module. Each subscriber holds a count
of the number of subscriptions it holds. It extends EventEmitter, but rather
than emitting newListener and removeListener events, it emits events
corresponding to those used in node_redis: message, pmessage, subscribe,
psubscribe, unsubscribe, and punsubscribe.

#### createSubscriber()

Creates and returns a new Subscriber instance.

``` javascript
var pubsub     = require('node-internal-pubsub');
var subscriber = pubsub.createSubscriber();
```

#### subscriber.subscribe([channel1], [channel2], [...])

Subscribes to all messages published in the given channels. Accepts multiple
channels as arguments, and emits a subscribe event for each newly subscribed
channel. The event is passed the channel name, and the current subscription
count. Ignores channels that are already subscribed to.

``` javascript
subscriber.subscribe('channel:1', 'channel:2');
subscriber.on('message', function(channel, message) {
  console.log('Received:', channel, '-', message);
});

publisher.publish('channel:1', 'Example message');
// 'Received: channel:1 - message'
```

#### subscriber.unsubscribe([...channels])

Unsubscribes from messages in each of the provided channels. Accepts
multiple channels as arguments, and emits an unsubscribe event for each
channel. The event is passed the channel name, and the current subscription
count. Ignores channels that are not among the current subscriptions. If no
arguments are passed, the subscriber is unsubscribed from all channels.

#### subscriber.psubscribe([pattern1], [pattern2], [...])

Subscribes to all messages published in channels matching the given
regular expressions' patterns. Accepts multiple RegExp objects as arguments,
and emits a psubscribe event for each newly subscribed pattern. The event
is passed the RegExp, and the current subscription count. Any non RegExp
instances passed to this function are cast to a string, and used to create a
RegExp. Ignores patterns that are already subscribed to.

``` javascript
subscriber.psubscribe(/channel/);
subscriber.on('pmessage', function(pattern, channel, message) {
  console.log('Received:', pattern, '-', channel, '-', message);
});

publisher.publish('channel:1', 'Example message');
// 'Received: /channel/ - channel:1 - Example message'
```

#### subscriber.punsubscribe([...patterns])

Unsubscribes from each of the provided regular expressions' patterns.
Accepts multiple RegExp objects as arguments, and emits a punsubscribe event
for each pattern. The event is passed the RegExp, and the current
subscription count. Any non RegExp instances passed to this function are
cast to a string, and used to create a RegExp. Ignores patterns that are
not among the current subscriptions. If no arguments are passed, the
subscriber is unsubscribed from all patterns.
