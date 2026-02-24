import { RedisService } from './redis.js';
import { CacheManager } from './AdvancedCachingStrategy.js';
import config from '../config/index.js';

// Initialize the CacheManager with the RedisService singleton
const redisService = RedisService.getInstance();

export const cacheManager = new CacheManager(redisService, {
  keyPrefix: 'summit:cache:',
  defaultTtl: config.cache?.staleWhileRevalidateSeconds || 300,
  defaultStaleWhileRevalidate: 60
});

export async function cached<T>(
  key: string,
  ttlSec: number,
  fn: () => Promise<T>,
): Promise<T> {
  return cacheManager.getOrSet(key, fn, { ttl: ttlSec });
}

export async function cachedSWR<T>(
  key: string,
  ttl: number,
  swr: number,
  fn: () => Promise<T>,
): Promise<T> {
  return cacheManager.getOrSet(key, fn, {
    ttl: ttl,
    staleWhileRevalidate: swr
  });
}
