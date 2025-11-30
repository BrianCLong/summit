/**
 * Policy-Aware Cache Service
 * Main exports
 */

export { PolicyAwareCacheService } from './lib/PolicyAwareCacheService.js';
export type { PolicyAwareCacheConfig } from './lib/PolicyAwareCacheService.js';

export type {
  UserABACAttributes,
  DataSnapshot,
  PolicyVersion,
  CacheKeyComponents,
  ProofBundle,
  CachedResult,
  CacheEntry,
  InvalidationEvent,
  CacheStats,
  CacheExplain,
} from './types/index.js';

export {
  UserABACAttributesSchema,
  DataSnapshotSchema,
  PolicyVersionSchema,
  CacheKeyComponentsSchema,
  ProofBundleSchema,
  InvalidationEventSchema,
} from './types/index.js';
