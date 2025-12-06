import { z } from 'zod';

/**
 * Cache configuration schema
 */
export const CacheConfigSchema = z.object({
  /** Cache namespace for key prefixing */
  namespace: z.string().default('summit'),
  /** Default TTL in seconds */
  defaultTtl: z.number().positive().default(300),
  /** Maximum TTL in seconds */
  maxTtl: z.number().positive().default(86400),
  /** Enable metrics collection */
  enableMetrics: z.boolean().default(true),
  /** Local cache configuration */
  local: z.object({
    enabled: z.boolean().default(true),
    maxSize: z.number().positive().default(1000),
    ttl: z.number().positive().default(60),
  }).default({}),
  /** Redis configuration */
  redis: z.object({
    enabled: z.boolean().default(true),
    url: z.string().optional(),
    host: z.string().default('localhost'),
    port: z.number().default(6379),
    password: z.string().optional(),
    db: z.number().default(0),
    keyPrefix: z.string().default('cache:'),
    maxRetriesPerRequest: z.number().default(3),
  }).default({}),
});

export type CacheConfig = z.infer<typeof CacheConfigSchema>;

/**
 * Cache entry with metadata
 */
export interface CacheEntry<T> {
  /** Cached value */
  value: T;
  /** Creation timestamp */
  createdAt: number;
  /** Expiration timestamp */
  expiresAt: number;
  /** Cache hit source */
  source: 'local' | 'redis' | 'origin';
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Cache statistics
 */
export interface CacheStats {
  /** Total cache hits */
  hits: number;
  /** Total cache misses */
  misses: number;
  /** Hit rate percentage */
  hitRate: number;
  /** Local cache hits */
  localHits: number;
  /** Redis cache hits */
  redisHits: number;
  /** Current local cache size */
  localSize: number;
  /** Total keys in Redis (estimated) */
  redisKeys: number;
  /** Average get latency in ms */
  avgGetLatency: number;
  /** Average set latency in ms */
  avgSetLatency: number;
}

/**
 * Cache operation options
 */
export interface CacheOptions {
  /** TTL in seconds (overrides default) */
  ttl?: number;
  /** Skip local cache */
  skipLocal?: boolean;
  /** Skip Redis cache */
  skipRedis?: boolean;
  /** Force refresh from origin */
  forceRefresh?: boolean;
  /** Additional tags for invalidation */
  tags?: string[];
}

/**
 * Cache invalidation options
 */
export interface InvalidationOptions {
  /** Pattern for key matching (supports wildcards) */
  pattern?: string;
  /** Tags to invalidate */
  tags?: string[];
  /** Invalidate local cache */
  local?: boolean;
  /** Invalidate Redis cache */
  redis?: boolean;
}

/**
 * Memoization options
 */
export interface MemoizeOptions<T> extends CacheOptions {
  /** Custom key generator */
  keyGenerator?: (...args: unknown[]) => string;
  /** Stale-while-revalidate time in seconds */
  staleWhileRevalidate?: number;
  /** Error handler */
  onError?: (error: Error) => T | Promise<T>;
}

/**
 * Cache provider interface
 */
export interface CacheProvider {
  /** Provider name */
  readonly name: string;

  /** Check if provider is available */
  isAvailable(): Promise<boolean>;

  /** Get value by key */
  get<T>(key: string): Promise<T | null>;

  /** Set value with optional TTL */
  set<T>(key: string, value: T, ttl?: number): Promise<void>;

  /** Delete key */
  delete(key: string): Promise<boolean>;

  /** Check if key exists */
  exists(key: string): Promise<boolean>;

  /** Delete keys matching pattern */
  deletePattern(pattern: string): Promise<number>;

  /** Get multiple keys */
  mget<T>(keys: string[]): Promise<(T | null)[]>;

  /** Set multiple keys */
  mset<T>(entries: Array<{ key: string; value: T; ttl?: number }>): Promise<void>;

  /** Get TTL for key */
  ttl(key: string): Promise<number>;

  /** Close connection */
  close(): Promise<void>;
}

/**
 * Cache metrics interface
 */
export interface CacheMetrics {
  /** Increment hit counter */
  recordHit(source: 'local' | 'redis'): void;
  /** Increment miss counter */
  recordMiss(): void;
  /** Record get latency */
  recordGetLatency(ms: number): void;
  /** Record set latency */
  recordSetLatency(ms: number): void;
  /** Get current stats */
  getStats(): CacheStats;
  /** Reset stats */
  reset(): void;
}
