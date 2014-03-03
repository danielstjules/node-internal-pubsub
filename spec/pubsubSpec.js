var expect     = require('expect.js');
var pubsub     = require('../lib/pubsub');
var Subscriber = require('../lib/subscriber');
var Publisher  = require('../lib/publisher');

describe('pubsub', function() {
  describe('createPublisher', function() {
    it('creates a new Publisher instance', function() {
      var sub = pubsub.createPublisher();

      expect(sub).to.be.a(Publisher);
    });

    it('uses the same instance of PatternEmitter with each', function() {
      var pub1 = pubsub.createPublisher();
      var pub2 = pubsub.createPublisher();

      expect(pub1.emitter).to.be(pub2.emitter);
    });
  });

  describe('createSubscriber', function() {
    it('creates a new Subscriber instance', function() {
      var sub = pubsub.createSubscriber();

      expect(sub).to.be.a(Subscriber);
    });

    it('uses the same instance of PatternEmitter with each', function() {
      var sub1 = pubsub.createSubscriber();
      var sub2 = pubsub.createSubscriber();

      expect(sub1.emitter).to.be(sub2.emitter);
    });
  });

  it('shares the PatternEmitter among publishers and subscribers', function() {
      var pub = pubsub.createPublisher();
      var sub = pubsub.createSubscriber();

      expect(pub.emitter).to.equal(sub.emitter);
  });
});
