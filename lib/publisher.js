/**
 * A publisher in the internal pub sub module. Publishes messages by invoking
 * emit on the instance of PatternEmitter.
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
