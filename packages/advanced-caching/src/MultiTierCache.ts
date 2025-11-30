import { LRUCache } from 'lru-cache';
import { Redis } from 'ioredis';
import { trace } from '@opentelemetry/api';
import pino from 'pino';
import { gzipSync, gunzipSync } from 'zlib';
import {
  CacheConfig,
  CacheEntry,
  CacheOptions,
  CacheStats,
  TierStats,
} from './types';
import { StampedeProtection } from './StampedeProtection';

const logger = pino({ name: 'MultiTierCache' });
const tracer = trace.getTracer('advanced-caching');

/**
 * Multi-tier cache with L1 (memory), L2 (Redis), L3 (CDN)
 */
export class MultiTierCache {
  private l1Cache?: LRUCache<string, CacheEntry>;
  private l2Redis?: Redis;
  private stampedeProtection?: StampedeProtection;

  private stats: CacheStats = {
    l1: this.initTierStats(),
    l2: this.initTierStats(),
    l3: this.initTierStats(),
    overall: { hitRate: 0, missRate: 0, avgLatency: 0 },
  };

  constructor(private config: CacheConfig) {
    this.initializeL1();
    this.initializeL2();

    if (config.stampedePrevention) {
      this.stampedeProtection = new StampedeProtection(
        this.l2Redis!,
        {
          lockTTL: 30000,
          lockRetryDelay: 100,
          maxRetries: 10,
        }
      );
    }
  }

  private initTierStats(): TierStats {
    return {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      size: 0,
      avgLatency: 0,
    };
  }

  private initializeL1(): void {
    if (this.config.l1?.enabled) {
      this.l1Cache = new LRUCache<string, CacheEntry>({
        max: this.config.l1.maxSize,
        ttl: this.config.l1.ttl,
        updateAgeOnGet: this.config.l1.updateAgeOnGet !== false,
      });
      logger.info({ maxSize: this.config.l1.maxSize }, 'L1 cache initialized');
    }
  }

  private initializeL2(): void {
    if (this.config.l2?.enabled) {
      this.l2Redis = this.config.l2.redis;
      logger.info('L2 cache (Redis) initialized');
    }
  }

  /**
   * Get value from cache (checks all tiers)
   */
  async get<T = any>(key: string, options?: CacheOptions): Promise<T | null> {
    const span = tracer.startSpan('MultiTierCache.get');
    const startTime = Date.now();

    try {
      // Try L1 first
      if (!options?.skipL1 && this.l1Cache) {
        const l1Result = this.l1Cache.get(key);
        if (l1Result) {
          this.stats.l1.hits++;
          span.setAttributes({ tier: 'l1', hit: true });
          logger.debug({ key }, 'L1 cache hit');
          return l1Result.value as T;
        }
        this.stats.l1.misses++;
      }

      // Try L2
      if (!options?.skipL2 && this.l2Redis) {
        const l2Result = await this.getFromL2<T>(key);
        if (l2Result !== null) {
          this.stats.l2.hits++;
          span.setAttributes({ tier: 'l2', hit: true });

          // Populate L1 on L2 hit
          if (this.l1Cache && !options?.skipL1) {
            this.setL1(key, l2Result, options);
          }

          logger.debug({ key }, 'L2 cache hit');
          return l2Result;
        }
        this.stats.l2.misses++;
      }

      // L3 would be handled by CDN at edge
      span.setAttributes({ tier: 'miss', hit: false });
      return null;
    } catch (error) {
      span.recordException(error as Error);
      logger.error({ key, error }, 'Cache get error');
      return null;
    } finally {
      const latency = Date.now() - startTime;
      this.updateLatency(latency);
      span.end();
    }
  }

  /**
   * Set value in cache (all tiers)
   */
  async set<T = any>(
    key: string,
    value: T,
    options?: CacheOptions
  ): Promise<void> {
    const span = tracer.startSpan('MultiTierCache.set');

    try {
      const ttl = options?.ttl || this.config.defaultTTL || 3600;
      const entry: CacheEntry<T> = {
        value,
        version: options?.version,
        metadata: {
          tags: options?.tags,
          dependencies: options?.dependencies,
        },
        createdAt: Date.now(),
        expiresAt: Date.now() + ttl * 1000,
      };

      // Set L1
      if (!options?.skipL1 && this.l1Cache) {
        this.setL1(key, value, options);
        this.stats.l1.sets++;
      }

      // Set L2
      if (!options?.skipL2 && this.l2Redis) {
        await this.setL2(key, entry, ttl);
        this.stats.l2.sets++;
      }

      span.setAttributes({
        ttl,
        hasMetadata: !!options?.tags || !!options?.dependencies,
      });

      logger.debug({ key, ttl }, 'Cache set');
    } catch (error) {
      span.recordException(error as Error);
      logger.error({ key, error }, 'Cache set error');
      throw error;
    } finally {
      span.end();
    }
  }

  /**
   * Get or set with loader function (prevents stampede)
   */
  async getOrSet<T = any>(
    key: string,
    loader: () => Promise<T>,
    options?: CacheOptions
  ): Promise<T> {
    const span = tracer.startSpan('MultiTierCache.getOrSet');

    try {
      // Try to get from cache
      const cached = await this.get<T>(key, options);
      if (cached !== null) {
        span.setAttribute('cached', true);
        return cached;
      }

      // Use stampede protection if enabled
      if (this.stampedeProtection) {
        const value = await this.stampedeProtection.execute(key, loader);
        await this.set(key, value, options);
        return value;
      }

      // Load and cache
      const value = await loader();
      await this.set(key, value, options);
      span.setAttribute('cached', false);
      return value;
    } catch (error) {
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  }

  /**
   * Delete from all tiers
   */
  async delete(key: string): Promise<void> {
    const span = tracer.startSpan('MultiTierCache.delete');

    try {
      if (this.l1Cache) {
        this.l1Cache.delete(key);
        this.stats.l1.deletes++;
      }

      if (this.l2Redis) {
        await this.l2Redis.del(this.getL2Key(key));
        this.stats.l2.deletes++;
      }

      logger.debug({ key }, 'Cache deleted');
    } catch (error) {
      span.recordException(error as Error);
      logger.error({ key, error }, 'Cache delete error');
    } finally {
      span.end();
    }
  }

  /**
   * Delete by pattern
   */
  async deleteByPattern(pattern: string): Promise<number> {
    const span = tracer.startSpan('MultiTierCache.deleteByPattern');

    try {
      let deletedCount = 0;

      if (this.l2Redis) {
        const keys = await this.l2Redis.keys(this.getL2Key(pattern));
        if (keys.length > 0) {
          deletedCount = await this.l2Redis.del(...keys);
        }
      }

      // L1 pattern deletion
      if (this.l1Cache) {
        const regex = new RegExp(pattern.replace('*', '.*'));
        for (const key of this.l1Cache.keys()) {
          if (regex.test(key)) {
            this.l1Cache.delete(key);
            deletedCount++;
          }
        }
      }

      span.setAttribute('deleted', deletedCount);
      logger.debug({ pattern, deletedCount }, 'Cache deleted by pattern');

      return deletedCount;
    } catch (error) {
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const totalHits =
      this.stats.l1.hits + this.stats.l2.hits + this.stats.l3.hits;
    const totalMisses =
      this.stats.l1.misses + this.stats.l2.misses + this.stats.l3.misses;
    const total = totalHits + totalMisses;

    this.stats.overall = {
      hitRate: total > 0 ? totalHits / total : 0,
      missRate: total > 0 ? totalMisses / total : 0,
      avgLatency: this.stats.overall.avgLatency,
    };

    if (this.l1Cache) {
      this.stats.l1.size = this.l1Cache.size;
    }

    return { ...this.stats };
  }

  /**
   * Clear all caches
   */
  async clear(): Promise<void> {
    if (this.l1Cache) {
      this.l1Cache.clear();
    }

    if (this.l2Redis) {
      const pattern = this.getL2Key('*');
      const keys = await this.l2Redis.keys(pattern);
      if (keys.length > 0) {
        await this.l2Redis.del(...keys);
      }
    }

    logger.info('All caches cleared');
  }

  // Private methods

  private setL1<T>(key: string, value: T, options?: CacheOptions): void {
    if (!this.l1Cache) return;

    const ttl = options?.ttl || this.config.l1?.ttl || 300;
    const entry: CacheEntry<T> = {
      value,
      version: options?.version,
      metadata: {
        tags: options?.tags,
        dependencies: options?.dependencies,
      },
      createdAt: Date.now(),
      expiresAt: Date.now() + ttl * 1000,
    };

    this.l1Cache.set(key, entry);
  }

  private async getFromL2<T>(key: string): Promise<T | null> {
    if (!this.l2Redis) return null;

    const data = await this.l2Redis.getBuffer(this.getL2Key(key));
    if (!data) return null;

    try {
      const entry: CacheEntry<T> = JSON.parse(data.toString());

      // Check if compressed
      if (entry.metadata?.compressed) {
        const decompressed = gunzipSync(Buffer.from(entry.value as any));
        entry.value = JSON.parse(decompressed.toString()) as T;
      }

      return entry.value;
    } catch (error) {
      logger.error({ key, error }, 'L2 deserialization error');
      return null;
    }
  }

  private async setL2<T>(
    key: string,
    entry: CacheEntry<T>,
    ttl: number
  ): Promise<void> {
    if (!this.l2Redis) return;

    try {
      let dataToStore = entry;

      // Compress if above threshold
      const threshold = this.config.l2?.compressionThreshold || 1024;
      const serialized = JSON.stringify(entry);

      if (serialized.length > threshold) {
        const compressed = gzipSync(serialized);
        dataToStore = {
          ...entry,
          value: compressed as any,
          metadata: {
            ...entry.metadata,
            compressed: true,
            size: serialized.length,
          },
        };
      }

      await this.l2Redis.setex(
        this.getL2Key(key),
        ttl,
        JSON.stringify(dataToStore)
      );
    } catch (error) {
      logger.error({ key, error }, 'L2 set error');
      throw error;
    }
  }

  private getL2Key(key: string): string {
    const prefix = this.config.l2?.keyPrefix || 'cache';
    return `${prefix}:${key}`;
  }

  private updateLatency(latency: number): void {
    const currentAvg = this.stats.overall.avgLatency;
    const totalRequests =
      this.stats.l1.hits +
      this.stats.l1.misses +
      this.stats.l2.hits +
      this.stats.l2.misses;

    this.stats.overall.avgLatency =
      totalRequests > 0
        ? (currentAvg * (totalRequests - 1) + latency) / totalRequests
        : latency;
  }
}
