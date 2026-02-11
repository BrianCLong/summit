
import { getRedisClient } from '../db/redis.js';
import { CacheManager } from './AdvancedCachingStrategy.js';
import { DistributedCacheService } from './DistributedCacheService.js';
import { correlationStorage } from '../config/logger.js';
import config from '../config/index.js';

let cacheManagerInstance: CacheManager | null = null;
let distributedCacheInstance: DistributedCacheService | null = null;

const tenantCacheManagers = new Map<string, CacheManager>();
const tenantDistributedCaches = new Map<string, DistributedCacheService>();

/**
 * Get a tenant-aware CacheManager.
 * Automatically scopes keys to the current tenant from correlation context.
 */
export function getTenantCacheManager(explicitTenantId?: string): CacheManager {
  const store = correlationStorage.getStore();
  const tenantId = explicitTenantId || store?.get('tenantId') || 'global';

  if (!tenantCacheManagers.has(tenantId)) {
    const redisClient = getRedisClient('cache');
    const manager = new CacheManager(redisClient as any, {
      keyPrefix: `summit:tenant:${tenantId}:cache:`,
      defaultTtl: 600,
      enableMetrics: true,
    });
    tenantCacheManagers.set(tenantId, manager);
  }
  return tenantCacheManagers.get(tenantId)!;
}

/**
 * Get a tenant-aware DistributedCacheService.
 * Automatically scopes keys to the current tenant from correlation context.
 */
export function getTenantDistributedCache(explicitTenantId?: string): DistributedCacheService {
  const store = correlationStorage.getStore();
  const tenantId = explicitTenantId || store?.get('tenantId') || 'global';

  if (!tenantDistributedCaches.has(tenantId)) {
    const redisClient = getRedisClient('dist');
    const service = new DistributedCacheService(redisClient as any, {
      keyPrefix: `summit:tenant:${tenantId}:dist:`,
      defaultTTLSeconds: 300,
      enableInvalidation: true
    });
    tenantDistributedCaches.set(tenantId, service);
  }
  return tenantDistributedCaches.get(tenantId)!;
}

/**
 * Get the singleton instance of the advanced CacheManager.
 * Initializes it if it doesn't exist.
 * This manager uses the AdvancedCachingStrategy pattern.
 * Uses the 'cache' Redis partition (REDIS_CACHE_HOST or defaults to REDIS_HOST).
 */
export function getCacheManager(): CacheManager {
  if (!cacheManagerInstance) {
    // Partitioning: Use 'cache' specific Redis client
    const redisClient = getRedisClient('cache');

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
 * Uses the 'dist' Redis partition (REDIS_DIST_HOST or defaults to REDIS_HOST).
 */
export function getDistributedCache(): DistributedCacheService {
  if (!distributedCacheInstance) {
    // Partitioning: Use 'dist' specific Redis client
    const redisClient = getRedisClient('dist');

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
  tenantCacheManagers.clear();
  tenantDistributedCaches.clear();
}
