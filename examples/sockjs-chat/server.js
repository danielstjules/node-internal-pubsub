/**
 * An example multi-room chat using redis. Based on the sockjs-express-redis
 * example, which can also be found in the parent directory.
 */

var app         = require('express')();
var http        = require('http');
var sockjs      = require('sockjs');

var redis       = require('redis');
var redisClient = redis.createClient();
var pubsub      = require('node-internal-pubsub');

var namespace   = 'chat:';
var User        = require('./models/user')(redisClient, namespace);
var Room        = require('./models/room')(redisClient, namespace);

// Create subscriber and internal publisher
var redisSub = redis.createClient();
var pub = pubsub.createPublisher();

// Subscribe to all incoming messages, and publish them to the internal pubsub
redisSub.psubscribe('*');
redisSub.on('pmessage', function(pattern, channel, msg) {
  pub.publish(channel, msg);
});

// Setup express
app.get('/', function(req, res) {
  res.sendfile(__dirname + '/public/index.html');
});

// SockJS server
var options = {sockjs_url: 'http://cdn.sockjs.org/sockjs-0.3.min.js'};
var wsServer = sockjs.createServer(options);

wsServer.on('connection', function(conn) {
  var sub = pubsub.createSubscriber();
  sub.subscribe('chatmessages');

  // Send incoming messages to the user
  sub.on('message', function(channel, message) {
    conn.write(message);
  });

  // Publish messages received from the user to redis
  conn.on('data', function(message) {
    redisClient.publish('chatmessages', message);
  });
});

// Create http server for use with express and SockJS
var server = http.createServer(app);
wsServer.installHandlers(server, {prefix: '/chat'});

console.log(' [*] Listening on 0.0.0.0:8001' );
server.listen(8001, '0.0.0.0');
