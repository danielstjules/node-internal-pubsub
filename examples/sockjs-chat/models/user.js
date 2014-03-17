var async = require('async');
var Room  = require('./room');

module.exports = function(redis, namespace) {
  /**
   * The User constructor. Instances require an id, and an object containing
   * the user's properties.
   *
   * @constructor
   *
   * @param {string} id         User's internal identifier
   * @param {object} properties The user's properties
   */
  function User(id, properties) {
    this.id = parseInt(id, 10);
    this.username = properties.username;
    this.remoteAddr = properties.remoteAddr;
  }

  /**
   * Creates and returns a new User instance given a desired username, and
   * a remote address. An error is returned if the username is taken, or if it
   * does not consist solely of 1 to 20 alphanumeric characters.
   *
   * @param {string}   username   The desired username for the new user
   * @param {string}   remoteAddr The remote address of the connected user
   * @param {function} fn         The callback to invoke
   */
  User.create = function(username, remoteAddr, fn) {
    if (!username.length || username.length > 20) {
      return fn('Username length must be between 1 and 20 characters');
    }

    if (!/[\w\d]+/.test(username)) {
      return fn('Username must consist solely of alphanumeric characters');
    }

    User.usernameInUse(username, function(err, res) {
      if (err) return fn(err);
      if (res) return fn('Username already in use');

      redis.incr(User._getKey('id'), function(err, id) {
        if (err) return fn(err);

        var user = new User(id, {
          username: username,
          remoteAddr: remoteAddr
        });

        user.save(function(err) {
          fn(err, user);
        });
      });
    });
  };

  /**
   * Returns the redis key for storing a property given the property name,
   * and if corresponding to a particular user instance, their id.
   *
   * @param {string} property The property for which to retrieve the key
   * @param {int}    [userId] Optionally, a user's id
   */
  User._getKey = function(property, userId) {
    if (!userId) {
      return namespace + 'users:' + property;
    } else {
      return namespace + 'user:' + userId + ':' + property;
    }
  };

  /**
   * Invokes the callback with a boolean specifying whether or not the given
   * username is in use by an existing user.
   *
   * @param {string}   username The username for which to check
   * @param {function} fn       The callback to invoke
   */
  User.usernameInUse = function(username, fn) {
    redis.sismember(User._getKey('usernames'), username, fn);
  };

  /**
   * Given a user id, passes the callback an instance of User if found.
   *
   * @param {int|string} id The user's id
   * @param {function}   fn The callback to invoke
   */
  User.find = function(id, fn) {
    redis.hgetall(User._getKey('properties', id), function(err, res) {
      if (err) return fn(err);
      if (!res) return fn('Invalid user id');

      fn(null, new User(id, res));
    });
  };

  /**
   * Saves a user instance to redis.
   *
   * @param {function} fn The callback to invoke
   */
  User.prototype.save = function(fn) {
    var multi = redis.multi();

    multi.sadd(User._getKey('usernames'), this.username);
    multi.hmset(User._getKey('properties', this.id), {
      username: this.username
    });

    multi.exec(fn);
  };

  /**
   * Deletes a user instance from redis, freeing their username to be used
   * by a new user.
   *
   * @param {function} fn The callback to invoke
   */
  User.prototype.delete = function(fn) {
    var multi = redis.multi();

    multi.srem(User._getKey('usernames'), this.username);
    multi.del(User._getKey('properties', this.id));
    multi.del(User._getKey('rooms', this.id));

    multi.exec(fn);
  };

  /**
   * Adds a room to the user's set of joined rooms.
   *
   * @param {Room}     room The room to join
   * @param {function} fn   The callback to invoke
   */
  User.prototype.addRoom = function(room, fn) {
    redis.sadd(User._getKey('rooms', this.id), room.id, fn);
  };

  /**
   * Removes a room from the user's set of joined rooms.
   *
   * @param {Room}     room The room to leave
   * @param {function} fn   The callback to invoke
   */
  User.prototype.removeRoom = function(room, fn) {
    redis.srem(User._getKey('rooms', this.id), room.id, fn);
  };

  /**
   * Invokes the callback, passing it an array of Room objects to which the
   * user belongs.
   *
   * @param {function} fn The callback to invoke
   */
  User.prototype.getRooms = function(fn) {
    redis.smembers(User._getKey('rooms', this.id), function(err, res) {
      if (err) return fn(err);

      async.map(res, function(roomId, next) {
        return Room.find(roomId, next);
      }, function(err, results) {
        fn(err, results);
      });
    });
  };

  return User;
};
