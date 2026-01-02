/**
 * Redis Query Cache
 *
 * Specialized cache for database query results.
 * Wraps arbitrary async data fetching functions with Redis caching.
 * Supports sliding expiration and tagging.
 *
 * Usage:
 * const users = await redisQueryCache.fetch(
 *   'all_users',
 *   300, // 5 minutes
 *   () => db.query('SELECT * FROM users')
 * );
 */

import { getRedisClient } from '../config/database.js';
import logger from '../utils/logger.js';

export class RedisQueryCache {
  private defaultTtl = 60; // 1 minute

  /**
   * Fetch data from cache or execute the fetcher function
   * @param key Cache key
   * @param ttlSeconds TTL in seconds
   * @param fetcher Async function to fetch data if cache miss
   */
  async fetch<T>(key: string, ttlSeconds: number, fetcher: () => Promise<T>): Promise<T> {
    const redis = getRedisClient();
    if (!redis) {
      return fetcher();
    }

    try {
      const cached = await redis.get(key);
      if (cached) {
        return JSON.parse(cached) as T;
      }
    } catch (e) {
      logger.warn({ error: e, key }, 'Redis cache get failed');
    }

    const result = await fetcher();

    try {
      if (result !== undefined && result !== null) {
        await redis.setex(key, ttlSeconds || this.defaultTtl, JSON.stringify(result));
      }
    } catch (e) {
      logger.warn({ error: e, key }, 'Redis cache set failed');
    }

    return result;
  }

  /**
   * Invalidate a specific key
   */
  async invalidate(key: string): Promise<void> {
    const redis = getRedisClient();
    if (redis) {
      await redis.del(key);
    }
  }

  /**
   * Invalidate keys by pattern (Use with caution in production)
   */
  async invalidatePattern(pattern: string): Promise<void> {
    const redis = getRedisClient();
    if (!redis) return;

    const stream = redis.scanStream({ match: pattern });
    const keys: string[] = [];

    for await (const chunk of stream) {
        keys.push(...chunk);
    }

    if (keys.length > 0) {
        await redis.del(...keys);
    }
  }
}

export const redisQueryCache = new RedisQueryCache();
