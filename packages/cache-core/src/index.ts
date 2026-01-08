/**
 * @intelgraph/cache-core
 *
 * Unified caching abstraction with L1 (in-memory) and L2 (Redis) tiers.
 *
 * Features:
 * - Multi-tier caching (L1 + L2)
 * - LRU eviction with byte-based limits
 * - TTL support
 * - Tag-based invalidation
 * - Pub/sub for cross-instance invalidation
 * - Prometheus metrics
 * - Stampede protection (inflight deduplication)
 *
 * @example
 * ```typescript
 * import { createCache, CacheTier } from '@intelgraph/cache-core';
 *
 * const cache = createCache({
 *   namespace: 'my-service',
 *   tiers: [CacheTier.L1, CacheTier.L2],
 *   defaultTtlSeconds: 300,
 *   metrics: true,
 *   l1: { maxBytes: 100 * 1024 * 1024 },
 *   l2: { connection: { host: 'localhost', port: 6379 } },
 * });
 *
 * // Basic operations
 * await cache.set('key', { data: 'value' }, { ttlSeconds: 60 });
 * const value = await cache.get('key');
 * await cache.delete('key');
 *
 * // Cache-aside pattern
 * const result = await cache.getOrSet('expensive-key', async () => {
 *   return await expensiveOperation();
 * }, { ttlSeconds: 300 });
 *
 * // Tag-based invalidation
 * await cache.set('entity:123', entity, { tags: ['investigation:456'] });
 * await cache.invalidateByTag('investigation:456');
 * ```
 */

export { Cache, createCache } from "./cache.js";
export { LRUCache } from "./lru-cache.js";
export { CacheMetrics, NoOpMetrics } from "./metrics.js";
export {
  CacheTier,
  type CacheConfig,
  type CacheEntry,
  type CacheGetOptions,
  type CacheSetOptions,
  type CacheStats,
  type ICache,
  type InvalidationMessage,
  type L1Config,
  type L2Config,
  type TierStats,
} from "./types.js";
