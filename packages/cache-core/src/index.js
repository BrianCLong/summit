"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheTier = exports.NoOpMetrics = exports.CacheMetrics = exports.LRUCache = exports.createCache = exports.Cache = void 0;
var cache_js_1 = require("./cache.js");
Object.defineProperty(exports, "Cache", { enumerable: true, get: function () { return cache_js_1.Cache; } });
Object.defineProperty(exports, "createCache", { enumerable: true, get: function () { return cache_js_1.createCache; } });
var lru_cache_js_1 = require("./lru-cache.js");
Object.defineProperty(exports, "LRUCache", { enumerable: true, get: function () { return lru_cache_js_1.LRUCache; } });
var metrics_js_1 = require("./metrics.js");
Object.defineProperty(exports, "CacheMetrics", { enumerable: true, get: function () { return metrics_js_1.CacheMetrics; } });
Object.defineProperty(exports, "NoOpMetrics", { enumerable: true, get: function () { return metrics_js_1.NoOpMetrics; } });
var types_js_1 = require("./types.js");
Object.defineProperty(exports, "CacheTier", { enumerable: true, get: function () { return types_js_1.CacheTier; } });
