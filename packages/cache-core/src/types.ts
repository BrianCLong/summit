import type { Redis } from "ioredis";

/**
 * Cache tier enumeration
 */
export enum CacheTier {
  L1 = "l1",
  L2 = "l2",
}

/**
 * Configuration for the cache
 */
export interface CacheConfig {
  /** Namespace for cache keys (used as prefix) */
  namespace: string;

  /** Which tiers to enable */
  tiers?: CacheTier[];

  /** Default TTL in seconds */
  defaultTtlSeconds?: number;

  /** Enable Prometheus metrics */
  metrics?: boolean;

  /** L1 (in-memory) configuration */
  l1?: L1Config;

  /** L2 (Redis) configuration */
  l2?: L2Config;
}

/**
 * L1 (in-memory) cache configuration
 */
export interface L1Config {
  /** Maximum cache size in bytes */
  maxBytes?: number;

  /** TTL in seconds for L1 entries */
  ttlSeconds?: number;
}

/**
 * L2 (Redis) cache configuration
 */
export interface L2Config {
  /** Redis client instance */
  client?: Redis;

  /** Redis connection options (if client not provided) */
  connection?: {
    host?: string;
    port?: number;
    password?: string;
    db?: number;
  };

  /** TTL in seconds for L2 entries */
  ttlSeconds?: number;

  /** Pub/sub channel for invalidation */
  invalidationChannel?: string;
}

/**
 * Options for cache set operations
 */
export interface CacheSetOptions {
  /** TTL in seconds (overrides default) */
  ttlSeconds?: number;

  /** Tags for group invalidation */
  tags?: string[];

  /** Skip L1 cache */
  skipL1?: boolean;

  /** Skip L2 cache */
  skipL2?: boolean;
}

/**
 * Options for cache get operations
 */
export interface CacheGetOptions {
  /** Skip L1 cache */
  skipL1?: boolean;

  /** Skip L2 cache */
  skipL2?: boolean;
}

/**
 * Internal cache entry structure
 */
export interface CacheEntry<T = unknown> {
  /** The cached value */
  value: T;

  /** Expiration timestamp (ms) */
  expiresAt: number;

  /** Associated tags */
  tags?: string[];

  /** Entry size in bytes */
  size?: number;
}

/**
 * Cache statistics
 */
export interface CacheStats {
  /** L1 cache stats */
  l1: TierStats;

  /** L2 cache stats */
  l2: TierStats;

  /** Overall hit rate */
  hitRate: number;

  /** Overall miss rate */
  missRate: number;
}

/**
 * Per-tier statistics
 */
export interface TierStats {
  /** Number of cache hits */
  hits: number;

  /** Number of cache misses */
  misses: number;

  /** Number of cache sets */
  sets: number;

  /** Number of cache deletes */
  deletes: number;

  /** Current number of entries (L1 only) */
  size?: number;

  /** Current bytes used (L1 only) */
  bytes?: number;
}

/**
 * Cache interface
 */
export interface ICache {
  /** Get a value from cache */
  get<T>(key: string, options?: CacheGetOptions): Promise<T | null>;

  /** Set a value in cache */
  set<T>(key: string, value: T, options?: CacheSetOptions): Promise<void>;

  /** Delete a value from cache */
  delete(key: string): Promise<void>;

  /** Delete by pattern (glob style) */
  deleteByPattern(pattern: string): Promise<number>;

  /** Get or set with loader function (cache-aside pattern) */
  getOrSet<T>(key: string, loader: () => Promise<T>, options?: CacheSetOptions): Promise<T>;

  /** Invalidate all entries with a specific tag */
  invalidateByTag(tag: string): Promise<void>;

  /** Get cache statistics */
  getStats(): CacheStats;

  /** Clear all cache entries */
  clear(): Promise<void>;

  /** Check if cache is enabled */
  isEnabled(): boolean;

  /** Shutdown the cache (cleanup connections) */
  shutdown(): Promise<void>;
}

/**
 * Invalidation message for pub/sub
 */
export type InvalidationMessage =
  | { type: "key"; keys: string[] }
  | { type: "tag"; tag: string }
  | { type: "pattern"; pattern: string };
