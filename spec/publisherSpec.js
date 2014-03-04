var expect         = require('expect.js');
var PatternEmitter = require('pattern-emitter');
var Publisher      = require('../lib/publisher');

describe('Publisher', function() {
  var emitter;
  var pub;

  beforeEach(function() {
    emitter = new PatternEmitter();
    pub = new Publisher(emitter);
  });

  describe('constructor', function() {
    it('stores the emitter in a property', function() {
      expect(pub._emitter).to.be(emitter);
    });
  });

  describe('publish', function() {
    it('emits an event with channel as the type, and message as the argument', function() {
      var message;
      var argumentCount;

      emitter.on('testChannel', function(msg) {
        message = msg;
        argumentCount = arguments.length;
      });

      pub.publish('testChannel', 'testMessage');

      expect(message).to.be('testMessage');
      expect(argumentCount).to.be(1);
    });
  });
});
