var util = require('util');
var EventEmitter = require('events').EventEmitter;

/**
 * A subscriber in the internal pub sub module. Each subscriber holds a count
 * of the number of subscriptions it holds. It extends EventEmitter, but rather
 * than emitting newListener and removeListener events, it emits events
 * corresponding to those used in node_redis: message, pmessage, subscribe,
 * psubscribe, unsubscribe, and punsubscribe.
 *
 * @constructor
 * @extends EventEmitter
 *
 * @param    {PatternEmitter} emitter       Instance to listen to
 *
 * @property {int}            count         Number of subscriptions it holds
 * @property {Object}         subscriptions Hash containing the subscribed
 *                                          channels as keys, with values being
 *                                          the corresponding listeners
 * @property {PatternEmitter} emitter       The instance of PatternEmitter used
 */
function Subscriber(emitter) {
  EventEmitter.call(this);

  this.count = 0;
  this.subscriptions = {};
  this.psubscriptions = {};
  this.emitter = emitter;
}

// Inherit all properties from EventEmitter
util.inherits(Subscriber, EventEmitter);
module.exports = Subscriber;

/**
 * Subscribes to all messages published in the given channels.
 *
 * @param {...string} [channels] The channels to subscribe
 */
Subscriber.prototype.subscribe = function() {
  var channel, i;
  var sub = this;

  this._getArrayArgs(arguments).forEach(function(channel) {
    channel = String(channel);

    if (sub.subscriptions[channel]) return;

    var listener = function(message) {
      // Ignore EventEmitter's newListener and removeListener events
      if (arguments.length > 1) return;

      sub.emit('message', channel, message);
    };

    sub.emitter.on(channel, listener);
    sub.count++;
    sub.emit('subscribe', channel, sub.count);
  });
};

/**
 * Unsubscribes from each of the provided channels.
 *
 * @param {...string} [channels] The channels from which to unsubscribe
 */
Subscriber.prototype.unsubscribe = function() {
  var channel, i;
  var sub = this;

  this._getArrayArgs(arguments).forEach(function(channel) {
    channel = String(arguments[i]);

    if (!sub.subscriptions[channel]) return;

    sub.emitter.removeListener(channel, sub.subscriptions[channel]);
    sub.count--;
    sub.emit('unsubscribe', channel, sub.count);
  });
};

/**
 * Subscribes to all messages published in channels matching the given
 * regular expressions' patterns. Any non RegExp instances passed to this
 * function are cast to a string, and used to create a RegExp.
 *
 * @param {...RegExp} [patterns] The patterns to subscribe
 */
Subscriber.prototype.psubscribe = function() {
  var pattern, i, key;
  var sub = this;

  this._getArrayArgs(arguments).forEach(function(pattern) {
    if (!(pattern instanceof RegExp)) {
      pattern = new RegExp(String(pattern));
    }

    key = String(pattern);
    if (sub.psubscriptions[key]) return;

    var listener = function(message) {
      // Ignore EventEmitter's newListener and removeListener events
      if (arguments.length > 1) return;

      // this.event is the channel name
      sub.emit('pmessage', pattern, this.event, message);
    };

    sub.emitter.on(pattern, listener);
    sub.count++;
    sub.psubscriptions[key] = listener;
    sub.emit('psubscribe', pattern, sub.count);
  });
};

/**
 * Unsubscribes from each of the provided regular expressions' patterns. Any
 * non RegExp instances passed to this function are cast to a string, and used
 * to create a RegExp.
 *
 * @param {...RegExp} [patterns] The patterns from which to unsubscribe
 */
Subscriber.prototype.unsubscribe = function() {
  var pattern, i, key;
  var sub = this;

  this._getArrayArgs(arguments).forEach(function(pattern) {
    if (!(pattern instanceof RegExp)) {
      pattern = new RegExp(String(pattern));
    }

    key = String(pattern);
    if (!sub.psubscriptions[key]) return;

    sub.emitter.removeListener(pattern, sub.psubscriptions[key]);
    sub.count--;
    delete sub.psubscriptions[key];
    sub.emit('punsubscribe', pattern, this.event, sub.count);
  });
};

/**
 * A private method used to build an array from a function's local
 * arguments variable.
 *
 * @param {Object} args A function's arguments
 */
Subscriber.prototype._getArrayArgs = function(args) {
  var array = [];
  for (i = 0; i < args.length; i++) {
    array.push(args[i]);
  }

  return array;
};