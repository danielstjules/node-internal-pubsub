var util           = require('util');
var PatternEmitter = require('pattern-emitter');
var Publisher      = require('./publisher');
var Subscriber     = require('./subscriber');

var emitter = new PatternEmitter();
emitter.setMaxListeners(0);

/**
 * Creates and returns a new Publisher instance.
 *
 * @return {Publisher} The new instance
 */
function createPublisher() {
  return new Publisher(emitter);
}

/**
 * Creates and returns a new Subscriber instance.
 *
 * @return {Subscriber} The new instance
 */
function createSubscriber() {
  return new Subscriber(emitter);
}

/**
 * Export both factory functions
 */
module.exports = {
  createPublisher:  createPublisher,
  createSubscriber: createSubscriber
};
