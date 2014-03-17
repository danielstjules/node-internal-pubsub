var async = require('async');
var User  = require('./user');

module.exports = function(redis, namespace) {
  /**
   * The Room constructor. Instances require an id, and an object containing
   * the room's properties.
   *
   * @constructor
   *
   * @param {string} id         Room's internal identifier
   * @param {object} properties The room's properties
   */
  function Room(id, properties) {
    this.id = parseInt(id, 10);
    this.name = properties.name;
  }

  /**
   * Creates and returns a new Room instance given a desired name, and
   * a remote address. An error is returned if the name is taken, or if it
   * does not consist solely of 1 to 20 alphanumeric characters.
   *
   * @param {string}   name The desired name for the new room
   * @param {function} fn   The callback to invoke
   */
  Room.create = function(name, fn) {
    if (!name.length || name.length > 20) {
      return fn('Name length must be between 1 and 20 characters');
    }

    if (!/[\w\d]+/.test(name)) {
      return fn('Name must consist solely of alphanumeric characters');
    }

    Room.nameInUse(Name, function(err, res) {
      if (err) return fn(err);
      if (res) return fn('Name already in use');

      redis.incr(Room._getKey('id'), function(err, id) {
        if (err) return fn(err);

        var room = new Room(id, {name: name});

        room.save(function(err) {
          fn(err, room);
        });
      });
    });
  };

  /**
   * Returns the redis key for storing a property given the property name,
   * and if corresponding to a particular room instance, their id.
   *
   * @param {string} property The property for which to retrieve the key
   * @param {int}    [roomId] Optionally, a room's id
   */
  Room._getKey = function(property, roomId) {
    if (!roomId) {
      return namespace + 'rooms:' + property;
    } else {
      return namespace + 'room:' + roomId + ':' + property;
    }
  };

  /**
   * Invokes the callback with a boolean specifying whether or not the given
   * room name is in use by an existing room.
   *
   * @param {string}   name The name for which to check
   * @param {function} fn   The callback to invoke
   */
  Room.nameInUse = function(name, fn) {
    redis.sismember(Room._getKey('names'), name, fn);
  };

  /**
   * Given a room id, passes the callback an instance of Room, if found.
   *
   * @param {int|string} id The room's id
   * @param {function}   fn The callback to invoke
   */
  Room.find = function(id, fn) {
    redis.hgetall(Room._getKey('properties', id), function(err, res) {
      if (err) return fn(err);
      if (!res) return fn('Invalid room id');

      fn(null, new Room(id, res));
    });
  };

  /**
   * Saves a Room instance to redis.
   *
   * @param {function} fn The callback to invoke
   */
  Room.prototype.save = function(fn) {
    var multi = redis.multi();

    multi.sadd(Room._getKey('names'), this.name);
    multi.hmset(Room._getKey('properties', this.id), {
      name: this.name
    });

    multi.exec(fn);
  };

  /**
   * Deletes a room instance from redis, freeing its name for use.
   *
   * @param {function} fn The callback to invoke
   */
  Room.prototype.delete = function(fn) {
    var multi = redis.multi();

    multi.srem(Room._getKey('names'), this.name);
    multi.del(Room._getKey('properties', this.id));
    multi.del(Room._getKey('users', this.id));

    multi.exec(fn);
  };

  /**
   * Adds a user to the room's set of users.
   *
   * @param {User}     user The user to add
   * @param {function} fn   The callback to invoke
   */
  Room.prototype.addUser = function(user, fn) {
    redis.sadd(Room._getKey('users', this.id), user.id);
  };

  /**
   * Removes a user from the room's set of users.
   *
   * @param {User}     user The user to remove
   * @param {function} fn   The callback to invoke
   */
  Room.prototype.removeUser = function(user, fn) {
    redis.srem(Room._getKey('users', this.id), user.id);
  };

  /**
   * Adds a message to the room's list of recent messages. At most 10 may be in
   * the list, which functions as a queue, resulting in older messages being
   * removed.
   *
   * @param {string}   message The message to add
   * @param {function} fn      The callback to invoke
   */
  Room.prototype.addMessage = function(message, fn) {
    var multi = redis.multi();

    multi.lpush(Room._getKey('messages', this.id), message);
    multi.ltrim(Room._getKey('messages', this.id), 0, 9);

    multi.exec(fn);
  };

  /**
   * Invokes the given callback with an array of strings corresponding to
   * the last, and up to, 10 messages sent.
   *
   * @param {function} fn The callback to invoke
   */
  Room.prototype.getMessages = function(fn) {
    redis.lrange(Room._getKey('messages', this.id), 0, -1, fn);
  };

  /**
   * Invokes the callback, passing it an array of User objects that are
   * currently in the room.
   *
   * @param {function} fn The callback to invoke
   */
  Room.prototype.getUsers = function(fn) {
    redis.smembers(Room._getKey('users', this.id), function(err, res) {
      if (err) return fn(err);

      async.map(res, function(userId, next) {
        return User.find(userId, next);
      }, function(err, results) {
        fn(err, results);
      });
    });
  };

  return Room;
};
