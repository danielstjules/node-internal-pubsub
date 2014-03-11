/**
 * A naive benchmark testing the differences between having 2000 redis clients
 * subscribed to a channel, and a single redis client with 1 pubsub publisher
 * and 2000 pubsub subscribers. Because benchmark.js is far too slow for async
 * suites, we're doing things ourselves.
 *
 * If you experience a connection error that includes EMFILE in the error msg,
 * you likely need to raise your open files soft limit.
 */

var benchmark = require('benchmark');
var pubsub    = require('../lib/pubsub.js');
var redis     = require('redis');
var async     = require('async');

var i, redisClient, redisSubs, redisSub, subcribers, publisher;

// The number of both redis subscribers and pubsub subscribers to make
var numClients = 2000;

// The number of messages to receive during each suite
var limit = 10000000;

// The test message to send
var msg = 'This message has 30 characters';

var redisChannel  = 'benchmark-redis';
var pubsubChannel = 'benchmark-pubsub';

// Our one redis client for publishing
redisClient = redis.createClient();

// Holds our redis subscribers
redisSubs = [];

// Holds our internal pubsub subscribers
subcribers = [];

var redisSetup = function(fn) {
  console.log('Setting up redis suite');

  async.timesSeries(numClients, function(n, next) {
    var client = redis.createClient();
    client.once('subscribe', function() {
      next(null, client);
    });

    // Rate limit client creation and subscription
    // to avoid connection issues
    setTimeout(function() {
      client.subscribe(redisChannel);
    }, 10);
  }, function(err, clients) {
    if (err) return fn(err);

    redisSubs = clients;
    fn();
  });
};

var redisSuite = function(fn) {
  console.log('Receiving', limit, 'messages with', numClients, 'redis subscribers');

  var results = {
    start:    Date.now(),
    end:      null,
    received: 0
  };

  for (i = 0; i < numClients; i++) {
    redisSubs[i].on('message', function(channel, message) {
      results.received++;

      if (results.received !== limit) return;
      results.end = Date.now();

      return fn(null, results);
    });
  }

  for (i = 0; i < limit / numClients; i++) {
    redisClient.publish(redisChannel, msg);
  }
};

var pubsubSetup = function(fn) {
  console.log('Setting up pubsub suite');

  // Setup the single redis sub, pubsub publisher, and pubsub subscribers
  redisSub = redis.createClient();
  publisher = pubsub.createPublisher();

  for (i = 0; i < numClients; i++) {
    subcribers.push(pubsub.createSubscriber());
    subcribers[i].subscribe(pubsubChannel);
  }

  redisSub.subscribe(pubsubChannel);
  redisSub.on('message', function(channel, message) {
    publisher.publish(channel, message);
  });

  setTimeout(fn, 1000);
};

var pubsubSuite = function(fn) {
  console.log('Receiving', limit, 'messages with 1 redis sub,', numClients, 'pubsub subscribers');

  var results = {
    start:    Date.now(),
    end:      null,
    received: 0
  };

  for (i = 0; i < numClients; i++) {
    subcribers[i].on('message', function(channel, message) {
      results.received++;

      if (results.received !== limit) return;
      results.end = Date.now();

      return fn(null, results);
    });
  }

  for (i = 0; i < limit / numClients; i++) {
    redisClient.publish(pubsubChannel, msg);
  }
};

var cleanup = function() {
  redisClient.end();
  redisSub.end();

  redisSubs.forEach(function(redisSub) {
    redisSub.end();
  });
};

// Run benchmarks, output results
async.series([
  redisSetup,
  redisSuite,
  pubsubSetup,
  pubsubSuite
], function(err, results) {
  cleanup();

  var redisTime = results[1].end - results[1].start;
  var pubsubTime = results[3].end - results[3].start;

  var avgRedisMsgs = parseInt(limit / (redisTime / 1000), 10);
  var avgPubsubMsgs = parseInt(limit / (pubsubTime / 1000), 10);

  console.log("\nRedis subscribers");
  console.log('Running time:', redisTime, 'ms');
  console.log('Avg messages received per second:', getFormattedNum(avgRedisMsgs));
  console.log("\nRedis subscriber with pubsub subscribers");
  console.log('Running time:', pubsubTime, 'ms');
  console.log('Avg messages received per second:', getFormattedNum(avgPubsubMsgs));
});

function getFormattedNum(x) {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
