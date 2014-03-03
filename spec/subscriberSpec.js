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
    it('subscribes to a given channel', function() {
      var passedChannel;
      var passedMsg;

      sub.subscribe('testChannel');
      sub.on('message', function(channel, msg) {
        passedChannel = channel;
        passedMsg = msg;
      });

      emitter.emit('testChannel', 'testMessage');

      expect(passedChannel).to.be('testChannel');
      expect(passedMsg).to.be('testMessage');
    });

    it('can subscribe to multiple channels', function() {
      var passedChannels = [];
      var passedMsgs = [];

      sub.subscribe('testChannel1');
      sub.subscribe('testChannel2');
      sub.on('message', function(channel, msg) {
        passedChannels.push(channel);
        passedMsgs.push(msg);
      });

      emitter.emit('testChannel1', 'testMessage1');
      emitter.emit('testChannel2', 'testMessage2');

      expect(passedChannels[0]).to.be('testChannel1');
      expect(passedMsgs[0]).to.be('testMessage1');
      expect(passedChannels[1]).to.be('testChannel2');
      expect(passedMsgs[1]).to.be('testMessage2');
    });

    it('accepts multiple channels to subscribe to', function() {
      var passedChannels = [];
      var passedMsgs = [];

      sub.subscribe('testChannel1', 'testChannel2');
      sub.on('message', function(channel, msg) {
        passedChannels.push(channel);
        passedMsgs.push(msg);
      });

      emitter.emit('testChannel1', 'testMessage1');
      emitter.emit('testChannel2', 'testMessage2');

      expect(passedChannels[0]).to.be('testChannel1');
      expect(passedMsgs[0]).to.be('testMessage1');
      expect(passedChannels[1]).to.be('testChannel2');
      expect(passedMsgs[1]).to.be('testMessage2');
    });

    it('increments the subscription count', function() {
      var previousCount = sub.count;
      sub.subscribe('testChannel1', 'testChannel2');

      expect(sub.count).to.be(previousCount + 2);
    });
  });
});
