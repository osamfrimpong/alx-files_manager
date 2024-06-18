/**
 * @fileoverview This file contains the implementation of the RedisClient class,
 * which represents a cached database client for the files_manager application.
 * @module utils/redis
 */

import { createClient } from 'redis';
import { promisify } from 'util';

/**
 * Represents a Redis client for managing key-value pairs in Redis.
 */
class RedisClient {
  constructor() {
    this.client = createClient();
    this.client.on('error', (error) => {
      console.log(`Redis client not connected to server: ${error}`);
    });
  }

  /**
   * Checks if the Redis client is connected to the server.
   * @returns {boolean} True if the client is connected, false otherwise.
   */
  isAlive() {
    if (this.client.connected) {
      return true;
    }
    return false;
  }

  /**
   * Retrieves the value associated with the given key from Redis.
   * @param {string} key - The key to retrieve the value for.
   * @returns {Promise<string|null>} A promise that resolves to the value,
   * or null if the key does not exist.
   */
  async get(key) {
    const getFromKey = promisify(this.client.get).bind(this.client);
    const foundValue = await getFromKey(key);
    return foundValue;
  }

  /**
   * Sets the value associated with the given key in Redis.
   * @param {string} key - The key to set the value for.
   * @param {string} value - The value to set.
   * @param {number} time - The expiration time in seconds.
   * @returns {Promise<void>} A promise that resolves when the value is set and expired.
   */
  async set(key, value, duration) {
    const setItem = promisify(this.client.set).bind(this.client);
    await setItem(key, value);
    await this.client.expire(key, duration);
  }

  /**
   * Deletes the value associated with the given key from Redis.
   * @param {string} key - The key to delete the value for.
   * @returns {Promise<void>} A promise that resolves when the value is deleted.
   */
  async del(key) {
    const delCommand = promisify(this.client.del).bind(this.client);
    await delCommand(key);
  }
}

const redisClient = new RedisClient();

export default redisClient;
