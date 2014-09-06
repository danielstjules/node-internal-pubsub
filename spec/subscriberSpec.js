var expect         = require('expect.js');
var EventEmitter   = require('events').EventEmitter;
var PatternEmitter = require('pattern-emitter');
var Subscriber     = require('../lib/subscriber');

describe('Subscriber', function() {
  var emitter, sub, channels, patterns, messages, counts;

  var messageListener = function(channel, message) {
    channels.push(channel);
    messages.push(message);
  };

  var pmessageListener = function(pattern, channel, message) {
    patterns.push(pattern);
    channels.push(channel);
    messages.push(message);
  };

  beforeEach(function() {
    emitter = new PatternEmitter();
    sub = new Subscriber(emitter);

    channels = [];
    patterns = [];
    messages = [];
    counts = [];
  });

  it("inherits EventEmitter's prototype", function() {
    var methods = ['addListener', 'on', 'once', 'removeListener',
      'removeAllListeners', 'setMaxListeners', 'listeners', 'emit'];

    methods.forEach(function(method) {
      expect(Subscriber.prototype[method]).to.be(EventEmitter.prototype[method]);
    });
  });

  describe('constructor', function() {
    it('stores the emitter in a property', function() {
      expect(sub._emitter).to.be(emitter);
    });

    it('initializes its subscription _count to 0', function() {
      expect(sub._count).to.be(0);
    });

    it('assigns a new object to the _subscriptions property', function() {
      expect(sub._subscriptions).to.eql({});
    });

    it('assigns a new object to the _psubscriptions property', function() {
      expect(sub._psubscriptions).to.eql({});
    });

    it('assigns a new object to the _regexes property', function() {
      expect(sub._regexes).to.eql({});
    });
  });

  describe('subscribe', function() {
    var subscribeListener = function(channel, count) {
      channels.push(channel);
      counts.push(count);
    };

    it('subscribes to a given channel', function() {
      sub.subscribe('testChannel');
      sub.on('message', messageListener);

      emitter.emit('testChannel', 'testMessage');

      expect(channels[0]).to.be('testChannel');
      expect(messages[0]).to.be('testMessage');
    });

    it('can subscribe to multiple channels', function() {
      sub.subscribe('testChannel1');
      sub.subscribe('testChannel2');
      sub.on('message', messageListener);

      emitter.emit('testChannel1', 'testMessage1');
      emitter.emit('testChannel2', 'testMessage2');

      expect(channels).to.have.length(2);
      expect(channels).to.contain('testChannel1', 'testChannel2');
      expect(messages).to.have.length(2);
      expect(messages).to.contain('testMessage1', 'testMessage2');
    });

    it('accepts multiple channels to subscribe to', function() {
      sub.subscribe('testChannel1', 'testChannel2', 'testChannel3');
      sub.on('message', messageListener);

      emitter.emit('testChannel1', 'testMessage1');
      emitter.emit('testChannel2', 'testMessage2');
      emitter.emit('testChannel3', 'testMessage3');

      expect(channels).to.have.length(3);
      expect(channels).to.contain('testChannel1', 'testChannel2', 'testChannel3');
      expect(messages).to.have.length(3);
      expect(messages).to.contain('testMessage1', 'testMessage2', 'testMessage3');
    });

    it('increments the subscription count', function() {
      var previousCount = sub._count;
      sub.subscribe('testChannel1', 'testChannel2');

      expect(sub._count).to.be(previousCount + 2);
    });

    it('emits a subscribe event for each, with the channel and count', function() {
      sub.on('subscribe', subscribeListener);
      sub.subscribe('testChannel1', 'testChannel2');

      expect(channels).to.eql(['testChannel1', 'testChannel2']);
      expect(counts).to.eql([1, 2]);
    });

    it('ignores channels to which it is already subscribed', function() {
      sub.on('subscribe', subscribeListener);
      sub.subscribe('testChannel1', 'testChannel1', 'testChannel2');

      expect(channels).to.eql(['testChannel1', 'testChannel2']);
      expect(counts).to.eql([1, 2]);
    });

    it("does not subscribe to EventEmitter's newListener/removeListener", function() {
      sub.on('message', messageListener);
      sub.subscribe('newListener');
      sub.subscribe('testChannel');
      emitter.emit('newListener', 'testMessage');

      expect(channels).to.eql(['newListener']);
      expect(messages).to.eql(['testMessage']);
    });
  });

  describe('unsubscribe', function() {
    var unsubscribeListener = function(channel, count) {
      channels.push(channel);
      counts.push(count);
    };

    beforeEach(function() {
      sub.subscribe('testChannel1', 'testChannel2', 'testChannel3');
    });

    it('unsubscribes from a given channel', function() {
      sub.on('message', messageListener);
      sub.unsubscribe('testChannel1');

      emitter.emit('testChannel1', 'testMessage1');
      emitter.emit('testChannel2', 'testMessage2');

      expect(channels).to.eql(['testChannel2']);
      expect(messages).to.eql(['testMessage2']);
    });

    it('can unsubscribe from multiple channels', function() {
      sub.unsubscribe('testChannel1');
      sub.unsubscribe('testChannel2');
      sub.on('message', messageListener);

      [1, 2, 3].forEach(function(i) {
        emitter.emit('testChannel' + i, 'testMessage' + i);
      });

      expect(channels).to.eql(['testChannel3']);
      expect(messages).to.eql(['testMessage3']);
    });

    it('accepts multiple channels to unsubscribe from', function() {
      sub.unsubscribe('testChannel1', 'testChannel2');
      sub.on('message', messageListener);

      [1, 2, 3].forEach(function(i) {
        emitter.emit('testChannel' + i, 'testMessage' + i);
      });

      expect(channels).to.eql(['testChannel3']);
      expect(messages).to.eql(['testMessage3']);
    });

    it('decrements the subscription count', function() {
      var previousCount = sub._count;
      sub.unsubscribe('testChannel1', 'testChannel2');

      expect(sub._count).to.be(previousCount - 2);
    });

    it('emits an unsubscribe event for each, with the channel and count', function() {
      sub.on('unsubscribe', unsubscribeListener);
      sub.unsubscribe('testChannel1', 'testChannel2');

      expect(channels).to.eql(['testChannel1', 'testChannel2']);
      expect(counts).to.eql([2, 1]);
    });

    it('ignores channels not among its subscriptions', function() {
      sub.on('unsubscribe', unsubscribeListener);
      sub.unsubscribe('testChannel1', 'testChannel1', 'testChannel2');

      expect(channels).to.eql(['testChannel1', 'testChannel2']);
      expect(counts).to.eql([2, 1]);
    });

    it('unsubscribes from all channels if none are specified', function() {
      sub.on('unsubscribe', unsubscribeListener);
      sub.unsubscribe();

      expect(channels).to.have.length(3);
      expect(counts).to.eql([2, 1, 0]);
    });

    it('returns if no channels were specified and subscribed', function() {
      var sub = new Subscriber(emitter);
      sub.psubscribe('test');
      sub.unsubscribe();
    });
  });

  describe('psubscribe', function() {
    var psubscribeListener = function(pattern, count) {
      patterns.push(pattern);
      counts.push(count);
    };

    it('subscribes to a given pattern', function() {
      sub.psubscribe(/test/);
      sub.on('pmessage', pmessageListener);

      emitter.emit('testChannel', 'testMessage');

      expect(patterns).to.eql([/test/]);
      expect(channels).to.eql(['testChannel']);
      expect(messages).to.eql(['testMessage']);
    });

    it('can subscribe to multiple patterns', function() {
      sub.psubscribe(/test/);
      sub.psubscribe(/^other/);
      sub.on('pmessage', pmessageListener);

      emitter.emit('testChannel', 'testMessage');
      emitter.emit('otherChannel', 'otherMessage');

      expect(patterns).to.eql([/test/, /^other/]);
      expect(channels).to.eql(['testChannel', 'otherChannel']);
      expect(messages).to.eql(['testMessage', 'otherMessage']);
    });

    it('accepts multiple patterns to subscribe to', function() {
      sub.psubscribe(/test/, /^other/, /TestChannel/i);
      sub.on('pmessage', pmessageListener);

      emitter.emit('testChannel', 'testMessage');
      emitter.emit('otherChannel', 'otherMessage');

      expect(patterns).to.eql([/test/, /TestChannel/i, /^other/]);
      expect(channels).to.eql(['testChannel', 'testChannel', 'otherChannel']);
      expect(messages).to.eql(['testMessage', 'testMessage', 'otherMessage']);
    });

    it('increments the subscription count', function() {
      var previousCount = sub._count;
      sub.psubscribe(/test/, /^other/);

      expect(sub._count).to.be(previousCount + 2);
    });

    it('emits a subscribe event for each, with the pattern and count', function() {
      sub.on('psubscribe', psubscribeListener);
      sub.psubscribe(/test/, /^other/);

      expect(patterns).to.eql([/test/, /^other/]);
      expect(counts).to.eql([1, 2]);
    });

    it('ignores patterns to which it is already subscribed', function() {
      sub.on('psubscribe', psubscribeListener);
      sub.psubscribe(/test/, /test/, /^other/);

      expect(patterns).to.eql([/test/, /^other/]);
      expect(counts).to.eql([1, 2]);
    });

    it("does not subscribe to EventEmitter's newListener/removeListener", function() {
      sub.on('pmessage', pmessageListener);
      sub.psubscribe(/newListener/);
      sub.psubscribe(/test/);
      emitter.emit('newListener', 'testMessage');

      expect(channels).to.eql(['newListener']);
      expect(messages).to.eql(['testMessage']);
    });
  });

  describe('punsubscribe', function() {
    var punsubscribeListener = function(pattern, count) {
      patterns.push(pattern);
      counts.push(count);
    };

    beforeEach(function() {
      sub.psubscribe(/test/, /TestChannel/i, /^other/);
    });

    it('unsubscribes from a given pattern', function() {
      sub.on('pmessage', pmessageListener);
      sub.punsubscribe(/test/);

      emitter.emit('testChannel', 'testMessage1');
      emitter.emit('testing', 'testMessage2');

      expect(patterns).to.eql([/TestChannel/i]);
      expect(channels).to.eql(['testChannel']);
      expect(messages).to.eql(['testMessage1']);
    });

    it('can unsubscribe from multiple patterns', function() {
      sub.punsubscribe(/test/);
      sub.punsubscribe(/TestChannel/i);
      sub.on('pmessage', pmessageListener);

      emitter.emit('testChannel', 'testMessage');
      emitter.emit('otherChannel', 'otherMessage');

      expect(patterns).to.eql([/^other/]);
      expect(channels).to.eql(['otherChannel']);
      expect(messages).to.eql(['otherMessage']);
    });

    it('accepts multiple patterns to unsubscribe from', function() {
      sub.punsubscribe(/test/, /TestChannel/i);
      sub.on('pmessage', pmessageListener);

      emitter.emit('testChannel', 'testMessage');
      emitter.emit('otherChannel', 'otherMessage');

      expect(patterns).to.eql([/^other/]);
      expect(channels).to.eql(['otherChannel']);
      expect(messages).to.eql(['otherMessage']);
    });

    it('decrements the subscription count', function() {
      var previousCount = sub._count;
      sub.punsubscribe(/test/, /TestChannel/i);

      expect(sub._count).to.be(previousCount - 2);
    });

    it('emits a punsubscribe event for each, with the pattern and count', function() {
      sub.on('punsubscribe', punsubscribeListener);
      sub.punsubscribe(/test/, /TestChannel/i);

      expect(patterns).to.eql([/test/, /TestChannel/i]);
      expect(counts).to.eql([2, 1]);
    });

    it('ignores patterns not among its subscriptions', function() {
      sub.on('punsubscribe', punsubscribeListener);
      sub.punsubscribe(/test/, /test/, /TestChannel/i);

      expect(patterns).to.eql([/test/, /TestChannel/i]);
      expect(counts).to.eql([2, 1]);
    });

    it('unsubscribes from all patterns if none are specified', function() {
      sub.on('punsubscribe', punsubscribeListener);
      sub.punsubscribe();

      expect(patterns).to.have.length(3);
      expect(counts).to.eql([2, 1, 0]);
    });

    it('returns if no channels were specified and psubscribed', function() {
      var sub = new Subscriber(emitter);
      sub.subscribe('test');
      sub.punsubscribe();
    });
  });
});
