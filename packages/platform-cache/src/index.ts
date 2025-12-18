/**
 * @summit/platform-cache
 *
 * Unified caching abstraction for Summit platform.
 * Implements Prompt 20: Caching and Memoization Strategy
 *
 * Features:
 * - Multi-layer caching (local LRU + distributed Redis)
 * - Consistent key generation
 * - TTL and invalidation support
 * - Metrics and monitoring
 * - Type-safe operations
 */

export * from './types.js';
export * from './cache-client.js';
export * from './cache-manager.js';
export * from './key-builder.js';
export * from './providers/index.js';

// Convenience re-exports
export { CacheManager, createCacheManager } from './cache-manager.js';
export { CacheKeyBuilder } from './key-builder.js';
