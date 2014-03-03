var expect         = require('expect.js');
var EventEmitter   = require('events').EventEmitter;
var PatternEmitter = require('pattern-emitter');
var Subscriber     = require('../lib/subscriber');

describe('Subscriber', function() {
  var emitter;
  var sub;

  beforeEach(function() {
    emitter = new PatternEmitter();
    sub = new Subscriber(emitter);
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
      expect(sub.emitter).to.be(emitter);
    });

    it('initializes its subscription count to 0', function() {
      expect(sub.count).to.be(0);
    });

    it('assigns a new object to the subscriptions property', function() {
      expect(sub.subscriptions).to.eql({});
    });
  });

  describe('subscribe', function() {
    var channels, messages, counts;

    var messageListener = function(channel, message) {
      channels.push(channel);
      messages.push(message);
    };

    var subscribeListener = function(channel, count) {
      channels.push(channel);
      counts.push(count);
    };

    beforeEach(function() {
      channels = [];
      messages = [];
      counts = [];
    });

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

      expect(channels[0]).to.be('testChannel1');
      expect(messages[0]).to.be('testMessage1');
      expect(channels[1]).to.be('testChannel2');
      expect(messages[1]).to.be('testMessage2');
    });

    it('accepts multiple channels to subscribe to', function() {
      sub.subscribe('testChannel1', 'testChannel2', 'testChannel3');
      sub.on('message', messageListener);

      emitter.emit('testChannel1', 'testMessage1');
      emitter.emit('testChannel2', 'testMessage2');
      emitter.emit('testChannel3', 'testMessage3');

      [1, 2, 3].forEach(function(i) {
        var key = i - 1;
        expect(channels[key]).to.be('testChannel' + i);
        expect(messages[key]).to.be('testMessage' + i);
      });
    });

    it('increments the subscription count', function() {
      var previousCount = sub.count;
      sub.subscribe('testChannel1', 'testChannel2');

      expect(sub.count).to.be(previousCount + 2);
    });

    it('emits a subscribe event for each, with the channel and count', function() {
      sub.on('subscribe', subscribeListener);
      sub.subscribe('testChannel1', 'testChannel2');

      expect(channels.length).to.be(2);
      expect(channels[0]).to.be('testChannel1');
      expect(counts[0]).to.be(1);
      expect(channels[1]).to.be('testChannel2');
      expect(counts[1]).to.be(2);
    });

    it('ignores channels to which it is already subscribed', function() {
      sub.on('subscribe', subscribeListener);
      sub.subscribe('testChannel1', 'testChannel1', 'testChannel2');

      expect(channels.length).to.be(2);
      expect(channels[0]).to.be('testChannel1');
      expect(counts[0]).to.be(1);
      expect(channels[1]).to.be('testChannel2');
      expect(counts[1]).to.be(2);
    });

    it("does not subscribe to EventEmitter's newListener/removeListener", function() {
      sub.on('message', messageListener);
      sub.subscribe('newListener');
      sub.subscribe('testChannel');
      emitter.emit('newListener', 'testMessage');

      expect(channels.length).to.be(1);
      expect(channels[0]).to.be('newListener');
      expect(messages[0]).to.be('testMessage');
    });
  });
});
