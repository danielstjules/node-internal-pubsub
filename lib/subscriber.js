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
 * @param    {PatternEmitter} _emitter        Instance to listen to
 *
 * @property {int}            _count          Number of subscriptions it holds
 * @property {Object}         _subscriptions  Hash containing the subscribed
 *                                            channels as keys, with values
 *                                            being the corresponding listeners
 * @property {Object}         _psubscriptions Hash containing the subscribed
 *                                            patterns as keys, with values
 *                                            being the corresponding listeners
 * @property {Object}         _regexes        The instances of RegExp for each
 *                                            pattern subscription
 * @property {PatternEmitter} _emitter        Instance of PatternEmitter used
 */
function Subscriber(emitter) {
  EventEmitter.call(this);

  this._count = 0;
  this._subscriptions = {};
  this._psubscriptions = {};
  this._regexes = {};
  this._emitter = emitter;
}

// Inherit all properties from EventEmitter
util.inherits(Subscriber, EventEmitter);
module.exports = Subscriber;

/**
 * Subscribes to all messages published in the given channels. Accepts multiple
 * channels as arguments, and emits a subscribe event for each newly subscribed
 * channel. The event is passed the channel name, and the current subscription
 * count. Ignores channels that are already subscribed to.
 *
 * @param {...string} [channels] The channels to subscribe
 */
Subscriber.prototype.subscribe = function() {
  var channel, i;
  var sub = this;

  this._getArrayArgs(arguments).forEach(function(channel) {
    channel = String(channel);

    if (sub._subscriptions[channel]) return;

    var listener = function(message) {
      // Ignore EventEmitter's newListener and removeListener events
      if (arguments.length > 1) return;

      sub.emit('message', channel, message);
    };

    sub._emitter.on(channel, listener);
    sub._count++;
    sub._subscriptions[channel] = listener;
    sub.emit('subscribe', channel, sub._count);
  });
};

/**
 * Unsubscribes from messages in each of the provided channels. Accepts
 * multiple channels as arguments, and emits an unsubscribe event for each
 * channel. The event is passed the channel name, and the current subscription
 * count. Ignores channels that are not among the current subscriptions. If no
 * arguments are passed, the subscriber is unsubscribed from all channels.
 *
 * @param {...string} [channels] The channels from which to unsubscribe
 */
Subscriber.prototype.unsubscribe = function() {
  var channel, i;
  var sub = this;
  var args = this._getArrayArgs(arguments);

  args.forEach(function(channel) {
    channel = String(channel);

    if (!sub._subscriptions[channel]) return;

    sub._emitter.removeListener(channel, sub._subscriptions[channel]);
    sub._count--;
    delete sub._subscriptions[channel];
    sub.emit('unsubscribe', channel, sub._count);
  });

  if (args.length) return;

  // Unsubscribe from all channels if no arguments were passed
  var channels = Object.keys(this._subscriptions);
  this.unsubscribe.apply(this, channels);
};

/**
 * Subscribes to all messages published in channels matching the given
 * regular expressions' patterns. Accepts multiple RegExp objects as arguments,
 * and emits a psubscribe event for each newly subscribed pattern. The event
 * is passed the RegExp, and the current subscription count. Any non RegExp
 * instances passed to this function are cast to a string, and used to create a
 * RegExp. Ignores patterns that are already subscribed to.
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
    if (sub._psubscriptions[key]) return;

    var listener = function(message) {
      // Ignore EventEmitter's newListener and removeListener events
      if (arguments.length > 1) return;

      // this.event is the channel name
      sub.emit('pmessage', pattern, this.event, message);
    };

    sub._emitter.on(pattern, listener);
    sub._count++;
    sub._psubscriptions[key] = listener;
    sub._regexes[key] = pattern;
    sub.emit('psubscribe', pattern, sub._count);
  });
};

/**
 * Unsubscribes from each of the provided regular expressions' patterns.
 * Accepts multiple RegExp objects as arguments, and emits a punsubscribe event
 * for each pattern. The event is passed the RegExp, and the current
 * subscription count. Any non RegExp instances passed to this function are
 * cast to a string, and used to create a RegExp. Ignores patterns that are
 * not among the current subscriptions. If no arguments are passed, the
 * subscriber is unsubscribed from all patterns.
 *
 * @param {...RegExp} [patterns] The patterns from which to unsubscribe
 */
Subscriber.prototype.punsubscribe = function() {
  var pattern, i, key;
  var sub = this;
  var args = this._getArrayArgs(arguments);

  args.forEach(function(pattern) {
    if (!(pattern instanceof RegExp)) {
      pattern = new RegExp(String(pattern));
    }

    key = String(pattern);
    if (!sub._psubscriptions[key]) return;

    sub._emitter.removeListener(pattern, sub._psubscriptions[key]);
    sub._count--;
    delete sub._psubscriptions[key];
    delete sub._regexes[key];
    sub.emit('punsubscribe', pattern, sub._count);
  });

  if (args.length) return;

  // Unsubscribe from all patterns if no arguments were passed
  var patterns = Object.keys(this._regexes).map(function(key) {
    return sub._regexes[key];
  });

  this.punsubscribe.apply(this, patterns);
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
