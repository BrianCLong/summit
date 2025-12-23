
import { getRedisClient } from '../db/redis.js';
import { CacheManager } from '../cache/AdvancedCachingStrategy.js';
import type { RedisClientInterface } from '../cache/AdvancedCachingStrategy.js';
import logger from '../utils/logger.js';

let cacheManagerInstance: CacheManager | null = null;

// Adapter to ensure ioredis client matches RedisClientInterface
function createRedisAdapter(client: any): RedisClientInterface {
  return client as RedisClientInterface;
}

export function getCacheManager(): CacheManager {
  if (!cacheManagerInstance) {
    const redisClient = getRedisClient();

    // We can rely on ioredis matching the interface mostly, but explicit casting is safer for TS
    const adapter = createRedisAdapter(redisClient);

    cacheManagerInstance = new CacheManager(adapter, {
      keyPrefix: 'summit:cache:',
      defaultTtl: 300, // 5 minutes
      enableMetrics: true
    });

    // Handle errors
    cacheManagerInstance.on('error', (err) => {
      logger.error('CacheManager error', err);
    });

    cacheManagerInstance.on('circuit:open', () => {
      logger.warn('Cache circuit breaker opened');
    });
  }
  return cacheManagerInstance;
}

export const cacheManager = getCacheManager();

/**
 * Backward compatibility wrapper
 * @deprecated Use cacheManager instead
 */
export const cached = cacheManager;
