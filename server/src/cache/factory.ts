
import { getRedisClient } from '../db/redis.js';
import { CacheManager } from './AdvancedCachingStrategy.js';
import { DistributedCacheService } from './DistributedCacheService.js';
import config from '../config/index.js';

let cacheManagerInstance: CacheManager | null = null;
let distributedCacheInstance: DistributedCacheService | null = null;

/**
 * Get the singleton instance of the advanced CacheManager.
 * Initializes it if it doesn't exist.
 * This manager uses the AdvancedCachingStrategy pattern.
 */
export function getCacheManager(): CacheManager {
  if (!cacheManagerInstance) {
    const redisClient = getRedisClient();

    // We need to adapt the existing Redis client (which is ioredis) to the RedisClientInterface
    // expected by CacheManager.
    cacheManagerInstance = new CacheManager(redisClient as any, {
      keyPrefix: 'summit:cache:',
      defaultTtl: 600, // 10 minutes
      enableMetrics: true,
    });
  }
  return cacheManagerInstance;
}

/**
 * Get the singleton instance of the DistributedCacheService.
 * This service implements L1/L2 caching with Data Governance envelopes.
 */
export function getDistributedCache(): DistributedCacheService {
  if (!distributedCacheInstance) {
    const redisClient = getRedisClient();

    distributedCacheInstance = new DistributedCacheService(redisClient as any, {
      keyPrefix: 'summit:dist:',
      defaultTTLSeconds: 300,
      enableInvalidation: true
    });
  }
  return distributedCacheInstance;
}

/**
 * Reset the cache manager instance (useful for testing)
 */
export function _resetCacheManagerForTesting() {
  cacheManagerInstance = null;
  distributedCacheInstance = null;
}
