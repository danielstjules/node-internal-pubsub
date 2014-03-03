var util = require('util');
var EventEmitter = require('events').EventEmitter;

/**
 * A publisher in the internal pub sub module. It extends EventEmitter.
 *
 * @constructor
 * @extends EventEmitter
 *
 * @param    {PatternEmitter} emitter Instance to emit events
 *
 * @property {PatternEmitter} emitter The instance of PatternEmitter used
 */
function Publisher(emitter) {
  this.emitter = emitter;
}

util.inherits(Publisher, EventEmitter);
module.exports = Publisher;

/**
 * Publishes a message to the given channel.
 *
 * @param {string} channel The channel to which to publish
 * @param {string} message The message to publish
 */
Publisher.prototype.publish = function(channel, message) {
  this.emitter.emit(channel, message);
};
