
import { getRedisClient } from '../db/redis.js';
import { CacheManager } from './AdvancedCachingStrategy.js';
import config from '../config/index.js';

let cacheManagerInstance: CacheManager | null = null;

/**
 * Get the singleton instance of the advanced CacheManager.
 * Initializes it if it doesn't exist.
 */
export function getCacheManager(): CacheManager {
  if (!cacheManagerInstance) {
    const redisClient = getRedisClient();

    // We need to adapt the existing Redis client (which is ioredis) to the RedisClientInterface
    // expected by CacheManager if there are significant differences, but looking at the types
    // they seem compatible enough (ioredis implements the methods used).
    // The main difference might be in the 'on' method signature or pipeline handling.
    // However, AdvancedCachingStrategy expects 'RedisClientInterface' which is modeled after ioredis.

    cacheManagerInstance = new CacheManager(redisClient as any, {
      keyPrefix: 'summit:cache:',
      defaultTtl: 600, // 10 minutes
      enableMetrics: true,
      // We can pull more config from the global config object if needed
    });
  }
  return cacheManagerInstance;
}

/**
 * Reset the cache manager instance (useful for testing)
 */
export function _resetCacheManagerForTesting() {
  cacheManagerInstance = null;
}
