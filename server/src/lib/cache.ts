import Redis from 'ioredis';
import pino from 'pino';

const logger = pino();
const redisClient = new Redis(); // Assuming Redis is running and accessible

redisClient.on('connect', () =>
  logger.info('Redis client connected for caching.'),
);
redisClient.on('error', (err) =>
  logger.error({ err }, 'Redis caching client error.'),
);

// Simple metrics for cache
const metrics = {
  cacheHit: { inc: () => {} }, // Placeholder
  cacheMiss: { inc: () => {} }, // Placeholder
  cacheEviction: { inc: () => {} }, // Placeholder
};

/**
 * Wraps a function with caching logic using Redis.
 *
 * @param {string} key - The cache key to use.
 * @param {number} ttl - Time to live for the cache entry in seconds.
 * @param {() => Promise<any>} fn - The function to execute if the value is not in the cache.
 * @returns {() => Promise<any>} A new function that returns cached data if available, or executes the original function.
 */
export const cached =
  (key: string, ttl: number, fn: () => Promise<any>) => async () => {
    const hit = await redisClient.get(key);
    if (hit) {
      metrics.cacheHit.inc();
      return JSON.parse(hit);
    }
    const val = await fn();
    await redisClient.setex(key, ttl, JSON.stringify(val));
    metrics.cacheMiss.inc();
    return val;
  };
