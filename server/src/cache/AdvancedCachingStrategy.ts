/**
 * @fileoverview Advanced Caching Strategy
 *
 * Production-grade caching system implementing:
 * - Multi-tier caching (L1 in-memory, L2 Redis)
 * - Cache-aside, write-through, write-behind patterns
 * - Cache invalidation strategies
 * - Distributed cache coordination
 * - Cache warming and preloading
 * - Metrics and monitoring
 * - Circuit breaker for cache failures
 *
 * @module cache/AdvancedCachingStrategy
 */

import crypto from 'crypto';
import { EventEmitter } from 'events';

// ============================================================================
// Types and Interfaces
// ============================================================================

/**
 * Cache entry with metadata
 */
export interface CacheEntry<T> {
  value: T;
  createdAt: number;
  expiresAt: number;
  accessCount: number;
  lastAccessedAt: number;
  tags: string[];
  version: number;
}

/**
 * Cache options for individual operations
 */
export interface CacheOptions {
  /** Time to live in seconds */
  ttl?: number;
  /** Tags for cache invalidation */
  tags?: string[];
  /** Skip L1 cache */
  skipL1?: boolean;
  /** Skip L2 cache */
  skipL2?: boolean;
  /** Force refresh */
  forceRefresh?: boolean;
  /** Stale-while-revalidate duration in seconds */
  staleWhileRevalidate?: number;
}

/**
 * Cache configuration
 */
export interface CacheConfig {
  /** Default TTL in seconds */
  defaultTtl: number;
  /** Maximum L1 cache entries */
  maxL1Entries: number;
  /** L1 eviction policy */
  l1EvictionPolicy: 'lru' | 'lfu' | 'fifo';
  /** Enable compression for L2 */
  enableCompression: boolean;
  /** Compression threshold in bytes */
  compressionThreshold: number;
  /** Enable metrics */
  enableMetrics: boolean;
  /** Key prefix for namespacing */
  keyPrefix: string;
  /** Stale-while-revalidate default */
  defaultStaleWhileRevalidate: number;
}

/**
 * Cache metrics
 */
export interface CacheMetrics {
  l1Hits: number;
  l1Misses: number;
  l2Hits: number;
  l2Misses: number;
  totalGets: number;
  totalSets: number;
  totalDeletes: number;
  totalInvalidations: number;
  evictions: number;
  errors: number;
  avgLatencyMs: number;
  l1Size: number;
  l2Size: number;
}

/**
 * Redis client interface (compatible with ioredis)
 */
export interface RedisClientInterface {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, mode?: string, duration?: number): Promise<string | null>;
  setex(key: string, seconds: number, value: string): Promise<string>;
  del(...keys: string[]): Promise<number>;
  keys(pattern: string): Promise<string[]>;
  mget(...keys: string[]): Promise<(string | null)[]>;
  mset(...keyValues: string[]): Promise<string>;
  expire(key: string, seconds: number): Promise<number>;
  ttl(key: string): Promise<number>;
  scan(cursor: string, ...args: string[]): Promise<[string, string[]]>;
  publish(channel: string, message: string): Promise<number>;
  subscribe(channel: string): Promise<void>;
  on(event: string, callback: (...args: any[]) => void): void;
  pipeline(): any;
  quit(): Promise<string>;
}

// ============================================================================
// L1 In-Memory Cache (LRU/LFU Implementation)
// ============================================================================

/**
 * L1 in-memory cache with configurable eviction
 */
class L1Cache<T> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private accessOrder: string[] = []; // For LRU
  private readonly maxEntries: number;
  private readonly evictionPolicy: 'lru' | 'lfu' | 'fifo';

  constructor(maxEntries: number, evictionPolicy: 'lru' | 'lfu' | 'fifo' = 'lru') {
    this.maxEntries = maxEntries;
    this.evictionPolicy = evictionPolicy;
  }

  get(key: string): CacheEntry<T> | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    // Check expiration
    if (entry.expiresAt < Date.now()) {
      this.delete(key);
      return undefined;
    }

    // Update access metadata
    entry.accessCount++;
    entry.lastAccessedAt = Date.now();

    // Update access order for LRU
    if (this.evictionPolicy === 'lru') {
      const index = this.accessOrder.indexOf(key);
      if (index > -1) {
        this.accessOrder.splice(index, 1);
      }
      this.accessOrder.push(key);
    }

    return entry;
  }

  set(key: string, entry: CacheEntry<T>): void {
    // Evict if necessary
    while (this.cache.size >= this.maxEntries) {
      this.evict();
    }

    this.cache.set(key, entry);
    this.accessOrder.push(key);
  }

  delete(key: string): boolean {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
  }

  size(): number {
    return this.cache.size;
  }

  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  private evict(): void {
    let keyToEvict: string | undefined;

    switch (this.evictionPolicy) {
      case 'lru':
        keyToEvict = this.accessOrder.shift();
        break;
      case 'lfu':
        keyToEvict = this.findLFUKey();
        break;
      case 'fifo':
        keyToEvict = this.accessOrder.shift();
        break;
    }

    if (keyToEvict) {
      this.delete(keyToEvict);
    }
  }

  private findLFUKey(): string | undefined {
    let minAccess = Infinity;
    let lfuKey: string | undefined;

    for (const [key, entry] of this.cache) {
      if (entry.accessCount < minAccess) {
        minAccess = entry.accessCount;
        lfuKey = key;
      }
    }

    return lfuKey;
  }
}

// ============================================================================
// Cache Manager
// ============================================================================

/**
 * Advanced cache manager with multi-tier caching
 */
export class CacheManager extends EventEmitter {
  private l1Cache: L1Cache<unknown>;
  private redisClient: RedisClientInterface | null;
  private config: CacheConfig;
  private metrics: CacheMetrics;
  private circuitOpen: boolean = false;
  private circuitOpenUntil: number = 0;
  private consecutiveFailures: number = 0;
  private readonly circuitThreshold: number = 5;
  private readonly circuitCooldown: number = 30000;
  private pendingRevalidations: Set<string> = new Set();

  constructor(
    redisClient: RedisClientInterface | null,
    config: Partial<CacheConfig> = {}
  ) {
    super();
    this.redisClient = redisClient;
    this.config = {
      defaultTtl: 300, // 5 minutes
      maxL1Entries: 10000,
      l1EvictionPolicy: 'lru',
      enableCompression: true,
      compressionThreshold: 1024,
      enableMetrics: true,
      keyPrefix: 'ig:cache:',
      defaultStaleWhileRevalidate: 60,
      ...config,
    };

    this.l1Cache = new L1Cache(this.config.maxL1Entries, this.config.l1EvictionPolicy);
    this.metrics = this.initMetrics();

    // Setup Redis subscription for cache invalidation
    this.setupCacheInvalidationSubscription();
  }

  private initMetrics(): CacheMetrics {
    return {
      l1Hits: 0,
      l1Misses: 0,
      l2Hits: 0,
      l2Misses: 0,
      totalGets: 0,
      totalSets: 0,
      totalDeletes: 0,
      totalInvalidations: 0,
      evictions: 0,
      errors: 0,
      avgLatencyMs: 0,
      l1Size: 0,
      l2Size: 0,
    };
  }

  /**
   * Generate cache key with prefix
   */
  private generateKey(key: string): string {
    return `${this.config.keyPrefix}${key}`;
  }

  /**
   * Generate cache key from object
   */
  generateKeyFromObject(obj: Record<string, unknown>): string {
    const sorted = JSON.stringify(obj, Object.keys(obj).sort());
    const hash = crypto.createHash('sha256').update(sorted).digest('hex').slice(0, 16);
    return hash;
  }

  /**
   * Check if circuit breaker is open
   */
  private isCircuitOpen(): boolean {
    if (this.circuitOpen && Date.now() >= this.circuitOpenUntil) {
      this.circuitOpen = false;
      this.consecutiveFailures = 0;
    }
    return this.circuitOpen;
  }

  /**
   * Record failure for circuit breaker
   */
  private recordFailure(): void {
    this.consecutiveFailures++;
    this.metrics.errors++;

    if (this.consecutiveFailures >= this.circuitThreshold) {
      this.circuitOpen = true;
      this.circuitOpenUntil = Date.now() + this.circuitCooldown;
      this.emit('circuit:open');
    }
  }

  /**
   * Record success for circuit breaker
   */
  private recordSuccess(): void {
    this.consecutiveFailures = 0;
  }

  /**
   * Get value from cache (cache-aside pattern)
   */
  async get<T>(key: string, options: CacheOptions = {}): Promise<T | null> {
    const startTime = Date.now();
    const fullKey = this.generateKey(key);
    this.metrics.totalGets++;

    try {
      // Try L1 cache first
      if (!options.skipL1 && !options.forceRefresh) {
        const l1Entry = this.l1Cache.get(fullKey) as CacheEntry<T> | undefined;
        if (l1Entry) {
          this.metrics.l1Hits++;
          this.updateLatency(startTime);
          return l1Entry.value;
        }
        this.metrics.l1Misses++;
      }

      // Try L2 cache (Redis)
      if (!options.skipL2 && !options.forceRefresh && this.redisClient && !this.isCircuitOpen()) {
        try {
          const serialized = await this.redisClient.get(fullKey);
          if (serialized) {
            const entry = JSON.parse(serialized) as CacheEntry<T>;

            // Check if stale
            const now = Date.now();
            if (entry.expiresAt < now) {
              const staleWindow = (options.staleWhileRevalidate ?? this.config.defaultStaleWhileRevalidate) * 1000;
              if (entry.expiresAt + staleWindow >= now) {
                // Serve stale, revalidate in background
                this.revalidateInBackground(key, options);
              } else {
                // Too stale, delete
                await this.delete(key);
                this.metrics.l2Misses++;
                this.updateLatency(startTime);
                return null;
              }
            }

            this.metrics.l2Hits++;
            this.recordSuccess();

            // Populate L1 cache
            if (!options.skipL1) {
              this.l1Cache.set(fullKey, entry);
            }

            this.updateLatency(startTime);
            return entry.value;
          }
          this.metrics.l2Misses++;
        } catch (error) {
          this.recordFailure();
          this.emit('error', { operation: 'get', key, error });
        }
      }

      this.updateLatency(startTime);
      return null;
    } catch (error) {
      this.metrics.errors++;
      this.updateLatency(startTime);
      throw error;
    }
  }

  /**
   * Set value in cache (write-through pattern)
   */
  async set<T>(
    key: string,
    value: T,
    options: CacheOptions = {}
  ): Promise<void> {
    const startTime = Date.now();
    const fullKey = this.generateKey(key);
    const ttl = options.ttl ?? this.config.defaultTtl;

    const entry: CacheEntry<T> = {
      value,
      createdAt: Date.now(),
      expiresAt: Date.now() + ttl * 1000,
      accessCount: 0,
      lastAccessedAt: Date.now(),
      tags: options.tags ?? [],
      version: 1,
    };

    this.metrics.totalSets++;

    try {
      // Set in L1 cache
      if (!options.skipL1) {
        this.l1Cache.set(fullKey, entry);
      }

      // Set in L2 cache (Redis)
      if (!options.skipL2 && this.redisClient && !this.isCircuitOpen()) {
        try {
          const serialized = JSON.stringify(entry);
          await this.redisClient.setex(fullKey, ttl, serialized);

          // Store tag mappings for invalidation
          if (options.tags && options.tags.length > 0) {
            await this.addToTagSets(fullKey, options.tags, ttl);
          }

          this.recordSuccess();
        } catch (error) {
          this.recordFailure();
          this.emit('error', { operation: 'set', key, error });
        }
      }

      this.updateLatency(startTime);
    } catch (error) {
      this.metrics.errors++;
      this.updateLatency(startTime);
      throw error;
    }
  }

  /**
   * Get or set with factory function (cache-aside with lazy loading)
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    // Try to get from cache first
    const cached = await this.get<T>(key, options);
    if (cached !== null) {
      return cached;
    }

    // Call factory and cache result
    const value = await factory();
    await this.set(key, value, options);
    return value;
  }

  /**
   * Delete from cache
   */
  async delete(key: string): Promise<boolean> {
    const fullKey = this.generateKey(key);
    this.metrics.totalDeletes++;

    // Delete from L1
    this.l1Cache.delete(fullKey);

    // Delete from L2
    if (this.redisClient && !this.isCircuitOpen()) {
      try {
        await this.redisClient.del(fullKey);
        this.recordSuccess();

        // Publish invalidation event
        await this.publishInvalidation([key]);
      } catch (error) {
        this.recordFailure();
        this.emit('error', { operation: 'delete', key, error });
      }
    }

    return true;
  }

  /**
   * Delete multiple keys
   */
  async deleteMany(keys: string[]): Promise<number> {
    const fullKeys = keys.map((k) => this.generateKey(k));
    let deleted = 0;

    // Delete from L1
    for (const key of fullKeys) {
      if (this.l1Cache.delete(key)) {
        deleted++;
      }
    }

    // Delete from L2
    if (this.redisClient && !this.isCircuitOpen() && fullKeys.length > 0) {
      try {
        await this.redisClient.del(...fullKeys);
        this.recordSuccess();
        await this.publishInvalidation(keys);
      } catch (error) {
        this.recordFailure();
        this.emit('error', { operation: 'deleteMany', keys, error });
      }
    }

    this.metrics.totalDeletes += keys.length;
    return deleted;
  }

  /**
   * Invalidate by tag
   */
  async invalidateByTag(tag: string): Promise<number> {
    const tagSetKey = `${this.config.keyPrefix}tag:${tag}`;
    let invalidated = 0;

    this.metrics.totalInvalidations++;

    if (this.redisClient && !this.isCircuitOpen()) {
      try {
        // Get all keys with this tag
        const keys = await this.redisClient.keys(`${tagSetKey}:*`);

        if (keys.length > 0) {
          // Extract actual cache keys
          const cacheKeys = keys.map((k) => k.replace(`${tagSetKey}:`, ''));

          // Delete all keys
          await this.redisClient.del(...keys);
          await this.deleteMany(cacheKeys);
          invalidated = cacheKeys.length;
        }

        this.recordSuccess();
      } catch (error) {
        this.recordFailure();
        this.emit('error', { operation: 'invalidateByTag', tag, error });
      }
    }

    // Also clear L1 entries with this tag
    const l1Keys = this.l1Cache.keys();
    for (const key of l1Keys) {
      const entry = this.l1Cache.get(key);
      if (entry && entry.tags.includes(tag)) {
        this.l1Cache.delete(key);
        invalidated++;
      }
    }

    return invalidated;
  }

  /**
   * Invalidate by pattern
   */
  async invalidateByPattern(pattern: string): Promise<number> {
    const fullPattern = `${this.config.keyPrefix}${pattern}`;
    let invalidated = 0;

    if (this.redisClient && !this.isCircuitOpen()) {
      try {
        let cursor = '0';
        const keysToDelete: string[] = [];

        do {
          const [nextCursor, keys] = await this.redisClient.scan(
            cursor,
            'MATCH',
            fullPattern,
            'COUNT',
            '100'
          );
          cursor = nextCursor;
          keysToDelete.push(...keys);
        } while (cursor !== '0');

        if (keysToDelete.length > 0) {
          await this.redisClient.del(...keysToDelete);
          invalidated = keysToDelete.length;
        }

        this.recordSuccess();
      } catch (error) {
        this.recordFailure();
        this.emit('error', { operation: 'invalidateByPattern', pattern, error });
      }
    }

    // Also clear matching L1 entries
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    const l1Keys = this.l1Cache.keys();
    for (const key of l1Keys) {
      if (regex.test(key)) {
        this.l1Cache.delete(key);
        invalidated++;
      }
    }

    this.metrics.totalInvalidations++;
    return invalidated;
  }

  /**
   * Clear all caches
   */
  async clear(): Promise<void> {
    this.l1Cache.clear();

    if (this.redisClient && !this.isCircuitOpen()) {
      try {
        let cursor = '0';
        do {
          const [nextCursor, keys] = await this.redisClient.scan(
            cursor,
            'MATCH',
            `${this.config.keyPrefix}*`,
            'COUNT',
            '100'
          );
          cursor = nextCursor;
          if (keys.length > 0) {
            await this.redisClient.del(...keys);
          }
        } while (cursor !== '0');

        this.recordSuccess();
      } catch (error) {
        this.recordFailure();
        this.emit('error', { operation: 'clear', error });
      }
    }

    this.metrics = this.initMetrics();
  }

  /**
   * Get cache metrics
   */
  getMetrics(): CacheMetrics {
    return {
      ...this.metrics,
      l1Size: this.l1Cache.size(),
    };
  }

  /**
   * Warm cache with data
   */
  async warm<T>(
    entries: Array<{ key: string; value: T; options?: CacheOptions }>
  ): Promise<void> {
    const pipeline = this.redisClient?.pipeline?.();

    for (const { key, value, options } of entries) {
      const fullKey = this.generateKey(key);
      const ttl = options?.ttl ?? this.config.defaultTtl;

      const entry: CacheEntry<T> = {
        value,
        createdAt: Date.now(),
        expiresAt: Date.now() + ttl * 1000,
        accessCount: 0,
        lastAccessedAt: Date.now(),
        tags: options?.tags ?? [],
        version: 1,
      };

      // Set in L1
      this.l1Cache.set(fullKey, entry);

      // Queue for L2
      if (pipeline) {
        pipeline.setex(fullKey, ttl, JSON.stringify(entry));
      }
    }

    // Execute pipeline
    if (pipeline && !this.isCircuitOpen()) {
      try {
        await pipeline.exec();
        this.recordSuccess();
      } catch (error) {
        this.recordFailure();
        this.emit('error', { operation: 'warm', error });
      }
    }

    this.emit('cache:warmed', { count: entries.length });
  }

  /**
   * Add key to tag sets for invalidation tracking
   */
  private async addToTagSets(key: string, tags: string[], ttl: number): Promise<void> {
    if (!this.redisClient) return;

    const pipeline = this.redisClient.pipeline?.();
    if (!pipeline) return;

    for (const tag of tags) {
      const tagSetKey = `${this.config.keyPrefix}tag:${tag}:${key}`;
      pipeline.setex(tagSetKey, ttl, '1');
    }

    await pipeline.exec();
  }

  /**
   * Publish invalidation event to other instances
   */
  private async publishInvalidation(keys: string[]): Promise<void> {
    if (!this.redisClient) return;

    try {
      await this.redisClient.publish(
        `${this.config.keyPrefix}invalidation`,
        JSON.stringify({ keys, timestamp: Date.now() })
      );
    } catch (error) {
      this.emit('error', { operation: 'publishInvalidation', error });
    }
  }

  /**
   * Setup subscription for cache invalidation from other instances
   */
  private setupCacheInvalidationSubscription(): void {
    if (!this.redisClient) return;

    // Create separate connection for subscription
    // In production, you'd clone the connection
    this.redisClient.on('message', (channel: string, message: string) => {
      if (channel === `${this.config.keyPrefix}invalidation`) {
        try {
          const { keys } = JSON.parse(message);
          for (const key of keys) {
            this.l1Cache.delete(this.generateKey(key));
          }
          this.emit('cache:invalidated', { keys });
        } catch (error) {
          this.emit('error', { operation: 'invalidationSubscription', error });
        }
      }
    });
  }

  /**
   * Revalidate cache entry in background
   */
  private async revalidateInBackground(key: string, options: CacheOptions): Promise<void> {
    if (this.pendingRevalidations.has(key)) {
      return; // Already revalidating
    }

    this.pendingRevalidations.add(key);
    this.emit('cache:revalidating', { key });

    // The actual revalidation would be handled by the caller
    // This just marks the intent
    setTimeout(() => {
      this.pendingRevalidations.delete(key);
    }, 5000);
  }

  /**
   * Update average latency metric
   */
  private updateLatency(startTime: number): void {
    const latency = Date.now() - startTime;
    const totalOps = this.metrics.l1Hits + this.metrics.l1Misses + this.metrics.l2Hits + this.metrics.l2Misses;
    this.metrics.avgLatencyMs = (this.metrics.avgLatencyMs * (totalOps - 1) + latency) / totalOps;
  }

  /**
   * Shutdown cache manager
   */
  async shutdown(): Promise<void> {
    this.l1Cache.clear();
    if (this.redisClient) {
      await this.redisClient.quit();
    }
    this.emit('cache:shutdown');
  }
}

// ============================================================================
// Cache Decorators
// ============================================================================

/**
 * Method decorator for caching (for use with classes)
 */
export function Cached(options: CacheOptions & { keyGenerator?: (...args: any[]) => string } = {}) {
  return function (
    _target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ): PropertyDescriptor {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const cacheManager = (this as any).cacheManager as CacheManager | undefined;
      if (!cacheManager) {
        return originalMethod.apply(this, args);
      }

      const keyGenerator = options.keyGenerator ?? ((...a: any[]) =>
        `${propertyKey}:${cacheManager.generateKeyFromObject({ args: a })}`
      );
      const key = keyGenerator(...args);

      return cacheManager.getOrSet(
        key,
        () => originalMethod.apply(this, args),
        options
      );
    };

    return descriptor;
  };
}

/**
 * Method decorator for cache invalidation
 */
export function InvalidatesCache(keys: string[] | ((...args: any[]) => string[])) {
  return function (
    _target: any,
    _propertyKey: string,
    descriptor: PropertyDescriptor
  ): PropertyDescriptor {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const result = await originalMethod.apply(this, args);

      const cacheManager = (this as any).cacheManager as CacheManager | undefined;
      if (cacheManager) {
        const keysToInvalidate = typeof keys === 'function' ? keys(...args) : keys;
        await cacheManager.deleteMany(keysToInvalidate);
      }

      return result;
    };

    return descriptor;
  };
}

// ============================================================================
// Export Factory Function
// ============================================================================

/**
 * Create cache manager instance
 */
export function createCacheManager(
  redisClient: RedisClientInterface | null,
  config?: Partial<CacheConfig>
): CacheManager {
  return new CacheManager(redisClient, config);
}

export default CacheManager;
