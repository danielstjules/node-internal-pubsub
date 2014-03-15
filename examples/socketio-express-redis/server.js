/**
 * This is an example Socket.IO 0.9 server, adapted from sockjs-express-redis
 */

var app     = require('express')();
var http    = require('http');
var redis   = require('redis');
var pubsub  = require('node-internal-pubsub');
var server  = http.createServer(app);
var io      = require('socket.io').listen(server);

// Create redis client, subscriber and internal publisher
var redisClient = redis.createClient();
var redisSub = redis.createClient();
var pub = pubsub.createPublisher();

// Subscribe to all incoming messages, and publish them to the internal pubsub
redisSub.psubscribe('*');
redisSub.on('pmessage', function(pattern, channel, msg) {
  pub.publish(channel, msg);
});

// Setup express
app.get('/', function(req, res) {
  res.sendfile(__dirname + '/index.html');
});

// Socket.IO connections
io.sockets.on('connection', function(socket) {
  var sub = pubsub.createSubscriber();
  sub.subscribe('chatmessages');

  // Send incoming messages to the user
  sub.on('message', function(channel, message) {
    socket.send(message);
  });

  // Publish messages received from the user to redis
  socket.on('message', function(message) {
    redisClient.publish('chatmessages', message);
  });
});

console.log(' [*] Listening on 0.0.0.0:8001' );
server.listen(8001, '0.0.0.0');
