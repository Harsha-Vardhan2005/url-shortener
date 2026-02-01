const redis = require('redis');
require('dotenv').config();

let redisClient = null;

// Create Redis client
const createRedisClient = async () => {
  try {
    const client = redis.createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            console.log('❌ Too many Redis reconnection attempts, giving up');
            return new Error('Too many retries');
          }
          // Exponential backoff: wait 2^retries * 100ms
          return Math.min(retries * 100, 3000);
        },
      },
    });

    client.on('error', (err) => {
      console.error('❌ Redis Client Error:', err);
    });

    client.on('connect', () => {
      console.log('✅ Connected to Redis');
    });

    client.on('reconnecting', () => {
      console.log('🔄 Reconnecting to Redis...');
    });

    await client.connect();
    redisClient = client;
    return client;
  } catch (error) {
    console.error('❌ Failed to connect to Redis:', error);
    // Don't crash the app if Redis is unavailable
    // We'll just skip caching
    return null;
  }
};

// Get Redis client instance
const getRedisClient = () => {
  return redisClient;
};

// Cache helper functions
const cacheGet = async (key) => {
  try {
    if (!redisClient) return null;
    return await redisClient.get(key);
  } catch (error) {
    console.error('Redis GET error:', error);
    return null;
  }
};

const cacheSet = async (key, value, expirationInSeconds = 3600) => {
  try {
    if (!redisClient) return false;
    await redisClient.setEx(key, expirationInSeconds, value);
    return true;
  } catch (error) {
    console.error('Redis SET error:', error);
    return false;
  }
};

const cacheDel = async (key) => {
  try {
    if (!redisClient) return false;
    await redisClient.del(key);
    return true;
  } catch (error) {
    console.error('Redis DEL error:', error);
    return false;
  }
};

const cacheIncrement = async (key, expirationInSeconds = 3600) => {
  try {
    if (!redisClient) return 0;
    const count = await redisClient.incr(key);
    if (count === 1) {
      // Set expiration only on first increment
      await redisClient.expire(key, expirationInSeconds);
    }
    return count;
  } catch (error) {
    console.error('Redis INCR error:', error);
    return 0;
  }
};

module.exports = {
  createRedisClient,
  getRedisClient,
  cacheGet,
  cacheSet,
  cacheDel,
  cacheIncrement,
};