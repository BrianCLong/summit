/**
 * Distributed Cache Service
 *
 * Redis-based distributed cache with L1 local cache for hot data.
 * Provides cache-aside, write-through, and write-behind patterns.
 *
 * SOC 2 Controls: CC6.1 (Access Control), CC7.1 (System Operations)
 *
 * @module cache/DistributedCacheService
 */

import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import { LRUCache } from 'lru-cache';
import zlib from 'zlib';
import {
  DataEnvelope,
  GovernanceVerdict,
  GovernanceResult,
  DataClassification,
  createDataEnvelope,
} from '../types/data-envelope.js';
import logger from '../utils/logger.js';

// ============================================================================
// Types
// ============================================================================

export interface CacheConfig {
  /** Default TTL in seconds */
  defaultTTLSeconds: number;
  /** Maximum L1 cache entries */
  maxL1Entries: number;
  /** L1 cache TTL in milliseconds */
  l1TTLMs: number;
  /** Compression threshold in bytes */
  compressionThreshold: number;
  /** Redis key prefix */
  keyPrefix: string;
  /** Enable pub/sub for invalidation */
  enableInvalidation: boolean;
  /** Invalidation channel name */
  invalidationChannel: string;
}

export interface CacheEntry<T = unknown> {
  value: T;
  createdAt: number;
  expiresAt: number;
  tags: string[];
  compressed: boolean;
}

export interface CacheStats {
  l1Hits: number;
  l1Misses: number;
  l2Hits: number;
  l2Misses: number;
  invalidations: number;
  compressions: number;
}

export type CacheStrategy = 'cache-aside' | 'write-through' | 'write-behind';

// ============================================================================
// Helper Functions
// ============================================================================

function createVerdict(result: GovernanceResult, reason?: string): GovernanceVerdict {
  return {
    verdictId: `verdict-${uuidv4()}`,
    policyId: 'cache-policy',
    result,
    decidedAt: new Date(),
    reason,
    evaluator: 'DistributedCacheService',
  };
}

// ============================================================================
// Distributed Cache Service
// ============================================================================

export class DistributedCacheService {
  private redis: Redis | any;
  private subscriber: Redis | any | null = null;
  private l1Cache: any; // LRUCache instance
  private config: CacheConfig;
  private stats: CacheStats;
  private writeBuffer: Map<string, { value: unknown; ttl: number }> = new Map();
  private flushInterval: NodeJS.Timeout | null = null;

  constructor(redis: Redis | any, config: Partial<CacheConfig> = {}) {
    this.redis = redis;
    this.config = {
      defaultTTLSeconds: config.defaultTTLSeconds ?? 300,
      maxL1Entries: config.maxL1Entries ?? 10000,
      l1TTLMs: config.l1TTLMs ?? 60000,
      compressionThreshold: config.compressionThreshold ?? 1024,
      keyPrefix: config.keyPrefix ?? 'cache:',
      enableInvalidation: config.enableInvalidation ?? true,
      invalidationChannel: config.invalidationChannel ?? 'cache:invalidation',
    };

    // Initialize L1 cache (local, in-memory)
    this.l1Cache = new LRUCache({
      max: this.config.maxL1Entries,
      ttl: this.config.l1TTLMs,
      updateAgeOnGet: true,
    });

    // Initialize stats
    this.stats = {
      l1Hits: 0,
      l1Misses: 0,
      l2Hits: 0,
      l2Misses: 0,
      invalidations: 0,
      compressions: 0,
    };

    // Set up invalidation listener
    if (this.config.enableInvalidation) {
      this.setupInvalidationListener();
    }

    logger.info({ config: this.config }, 'DistributedCacheService initialized');
  }

  // --------------------------------------------------------------------------
  // Core Cache Operations
  // --------------------------------------------------------------------------

  /**
   * Get a value from cache (L1 first, then L2)
   */
  async get<T>(key: string): Promise<DataEnvelope<T | null>> {
    const fullKey = this.buildKey(key);

    // Try L1 cache first
    const l1Entry = this.l1Cache.get(fullKey);
    if (l1Entry && l1Entry.expiresAt > Date.now()) {
      this.stats.l1Hits++;
      logger.debug({ key, source: 'l1' }, 'Cache hit');
      return createDataEnvelope(l1Entry.value as T, {
        source: 'DistributedCacheService:L1',
        governanceVerdict: createVerdict(GovernanceResult.ALLOW, 'Cache hit from L1'),
        classification: DataClassification.INTERNAL,
      });
    }
    this.stats.l1Misses++;

    // Try L2 (Redis)
    try {
      const redisValue = await this.redis.get(fullKey);
      if (redisValue) {
        this.stats.l2Hits++;
        const entry = JSON.parse(redisValue) as CacheEntry<T>;

        // Decompress if needed
        const value = entry.compressed
          ? this.decompress(entry.value as string)
          : entry.value;

        // Promote to L1
        this.l1Cache.set(fullKey, {
          ...entry,
          value,
          compressed: false,
        });

        logger.debug({ key, source: 'l2' }, 'Cache hit');
        return createDataEnvelope(value as T, {
          source: 'DistributedCacheService:L2',
          governanceVerdict: createVerdict(GovernanceResult.ALLOW, 'Cache hit from L2'),
          classification: DataClassification.INTERNAL,
        });
      }
      this.stats.l2Misses++;
    } catch (error: any) {
      logger.error({ error, key }, 'Redis get error');
    }

    logger.debug({ key }, 'Cache miss');
    return createDataEnvelope(null, {
      source: 'DistributedCacheService',
      governanceVerdict: createVerdict(GovernanceResult.ALLOW, 'Cache miss'),
      classification: DataClassification.INTERNAL,
    });
  }

  /**
   * Set a value in cache
   */
  async set<T>(
    key: string,
    value: T,
    options: {
      ttlSeconds?: number;
      tags?: string[];
      strategy?: CacheStrategy;
    } = {}
  ): Promise<DataEnvelope<boolean>> {
    const fullKey = this.buildKey(key);
    const ttl = options.ttlSeconds ?? this.config.defaultTTLSeconds;
    const tags = options.tags ?? [];
    const strategy = options.strategy ?? 'cache-aside';

    const now = Date.now();
    const entry: CacheEntry<T> = {
      value,
      createdAt: now,
      expiresAt: now + ttl * 1000,
      tags,
      compressed: false,
    };

    try {
      // Check if compression needed
      const serialized = JSON.stringify(entry);
      let toStore = serialized;

      if (serialized.length > this.config.compressionThreshold) {
        entry.value = this.compress(value) as T;
        entry.compressed = true;
        toStore = JSON.stringify(entry);
        this.stats.compressions++;
      }

      // Apply strategy
      switch (strategy) {
        case 'write-through':
          // Write to both L1 and L2 synchronously
          this.l1Cache.set(fullKey, { ...entry, value, compressed: false });
          await this.redis.setex(fullKey, ttl, toStore);
          break;

        case 'write-behind':
          // Write to L1 immediately, buffer L2 write
          this.l1Cache.set(fullKey, { ...entry, value, compressed: false });
          this.bufferWrite(fullKey, toStore, ttl);
          break;

        case 'cache-aside':
        default:
          // Write to L2 first, then L1
          await this.redis.setex(fullKey, ttl, toStore);
          this.l1Cache.set(fullKey, { ...entry, value, compressed: false });
          break;
      }

      // Store tag associations
      if (tags.length > 0) {
        await this.indexTags(fullKey, tags, ttl);
      }

      logger.debug({ key, ttl, strategy }, 'Cache set');
      return createDataEnvelope(true, {
        source: 'DistributedCacheService',
        governanceVerdict: createVerdict(GovernanceResult.ALLOW, 'Cache set successful'),
        classification: DataClassification.INTERNAL,
      });
    } catch (error: any) {
      logger.error({ error, key }, 'Cache set error');
      return createDataEnvelope(false, {
        source: 'DistributedCacheService',
        governanceVerdict: createVerdict(GovernanceResult.FLAG, 'Cache set failed'),
        classification: DataClassification.INTERNAL,
      });
    }
  }

  /**
   * Delete a key from cache
   */
  async delete(key: string): Promise<DataEnvelope<boolean>> {
    const fullKey = this.buildKey(key);

    try {
      // Delete from both caches
      this.l1Cache.delete(fullKey);
      await this.redis.del(fullKey);

      // Broadcast invalidation
      await this.broadcastInvalidation(fullKey);

      logger.debug({ key }, 'Cache delete');
      return createDataEnvelope(true, {
        source: 'DistributedCacheService',
        governanceVerdict: createVerdict(GovernanceResult.ALLOW, 'Cache delete successful'),
        classification: DataClassification.INTERNAL,
      });
    } catch (error: any) {
      logger.error({ error, key }, 'Cache delete error');
      return createDataEnvelope(false, {
        source: 'DistributedCacheService',
        governanceVerdict: createVerdict(GovernanceResult.FLAG, 'Cache delete failed'),
        classification: DataClassification.INTERNAL,
      });
    }
  }

  /**
   * Delete all keys with a specific tag
   */
  async deleteByTag(tag: string): Promise<DataEnvelope<number>> {
    const tagKey = `${this.config.keyPrefix}tag:${tag}`;

    try {
      const keys = await this.redis.smembers(tagKey);

      if (keys.length === 0) {
        return createDataEnvelope(0, {
          source: 'DistributedCacheService',
          governanceVerdict: createVerdict(GovernanceResult.ALLOW, 'No keys found for tag'),
          classification: DataClassification.INTERNAL,
        });
      }

      // Delete all tagged keys from L1 and send invalidation
      for (const key of keys) {
        this.l1Cache.delete(key);
        // We can optimize invalidation by sending just the tag, but existing logic relies on key invalidation
        await this.broadcastInvalidation(key);
      }

      // Delete keys from Redis and the tag set itself
      // We pass all keys plus the tagKey to del
      await this.redis.del(...keys, tagKey);

      this.stats.invalidations += keys.length;
      logger.info({ tag, count: keys.length }, 'Cache invalidated by tag');

      return createDataEnvelope(keys.length, {
        source: 'DistributedCacheService',
        governanceVerdict: createVerdict(GovernanceResult.ALLOW, 'Tag invalidation successful'),
        classification: DataClassification.INTERNAL,
      });
    } catch (error: any) {
      logger.error({ error, tag }, 'Cache tag invalidation error');
      return createDataEnvelope(0, {
        source: 'DistributedCacheService',
        governanceVerdict: createVerdict(GovernanceResult.FLAG, 'Tag invalidation failed'),
        classification: DataClassification.INTERNAL,
      });
    }
  }

  /**
   * Get or set pattern - fetch from cache or compute
   */
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: {
      ttlSeconds?: number;
      tags?: string[];
      forceRefresh?: boolean;
    } = {}
  ): Promise<DataEnvelope<T>> {
    // Check cache first (unless force refresh)
    if (!options.forceRefresh) {
      const cached = await this.get<T>(key);
      if (cached.data !== null) {
        return cached as DataEnvelope<T>;
      }
    }

    // Fetch fresh data
    const value = await fetcher();

    // Store in cache
    await this.set(key, value, {
      ttlSeconds: options.ttlSeconds,
      tags: options.tags,
    });

    return createDataEnvelope(value, {
      source: 'DistributedCacheService:fetcher',
      governanceVerdict: createVerdict(GovernanceResult.ALLOW, 'Value fetched and cached'),
      classification: DataClassification.INTERNAL,
    });
  }

  // --------------------------------------------------------------------------
  // Invalidation
  // --------------------------------------------------------------------------

  private async setupInvalidationListener(): Promise<void> {
    try {
      this.subscriber = this.redis.duplicate();
      await this.subscriber.subscribe(this.config.invalidationChannel);

      this.subscriber.on('message', (channel: string, message: string) => {
        if (channel === this.config.invalidationChannel) {
          const key = message;
          this.l1Cache.delete(key);
          this.stats.invalidations++;
          logger.debug({ key }, 'L1 cache invalidated via pub/sub');
        }
      });

      logger.info('Cache invalidation listener started');
    } catch (error: any) {
      logger.error({ error }, 'Failed to setup invalidation listener');
    }
  }

  private async broadcastInvalidation(key: string): Promise<void> {
    if (this.config.enableInvalidation) {
      try {
        await this.redis.publish(this.config.invalidationChannel, key);
      } catch (error: any) {
        logger.error({ error, key }, 'Failed to broadcast invalidation');
      }
    }
  }

  // --------------------------------------------------------------------------
  // Write-Behind Buffer
  // --------------------------------------------------------------------------

  private bufferWrite(key: string, value: string, ttl: number): void {
    this.writeBuffer.set(key, { value, ttl });

    // Start flush interval if not running
    if (!this.flushInterval) {
      this.flushInterval = setInterval(() => this.flushWriteBuffer(), 100);
    }
  }

  private async flushWriteBuffer(): Promise<void> {
    if (this.writeBuffer.size === 0) {
      if (this.flushInterval) {
        clearInterval(this.flushInterval);
        this.flushInterval = null;
      }
      return;
    }

    const pipeline = this.redis.pipeline();
    for (const [key, { value, ttl }] of this.writeBuffer) {
      pipeline.setex(key, ttl, value);
    }
    this.writeBuffer.clear();

    try {
      await pipeline.exec();
    } catch (error: any) {
      logger.error({ error }, 'Failed to flush write buffer');
    }
  }

  // --------------------------------------------------------------------------
  // Tag Indexing
  // --------------------------------------------------------------------------

  private async indexTags(key: string, tags: string[], ttl: number): Promise<void> {
    const pipeline = this.redis.pipeline();
    for (const tag of tags) {
      const tagKey = `${this.config.keyPrefix}tag:${tag}`;
      pipeline.sadd(tagKey, key);
      pipeline.expire(tagKey, ttl);
    }
    await pipeline.exec();
  }

  // --------------------------------------------------------------------------
  // Compression
  // --------------------------------------------------------------------------

  private compress(value: unknown): string {
    const json = JSON.stringify(value);
    const buffer = zlib.gzipSync(json);
    return buffer.toString('base64');
  }

  private decompress(compressed: string): unknown {
    const buffer = Buffer.from(compressed, 'base64');
    const json = zlib.gunzipSync(buffer).toString();
    return JSON.parse(json);
  }

  // --------------------------------------------------------------------------
  // Utilities
  // --------------------------------------------------------------------------

  private buildKey(key: string): string {
    return `${this.config.keyPrefix}${key}`;
  }

  /**
   * Get cache statistics
   */
  getStats(): DataEnvelope<CacheStats> {
    return createDataEnvelope(this.stats, {
      source: 'DistributedCacheService',
      governanceVerdict: createVerdict(GovernanceResult.ALLOW, 'Stats retrieved'),
      classification: DataClassification.INTERNAL,
    });
  }

  /**
   * Clear all caches
   */
  async clear(): Promise<DataEnvelope<boolean>> {
    try {
      this.l1Cache.clear();
      const keys = await this.redis.keys(`${this.config.keyPrefix}*`);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
      logger.info('All caches cleared');
      return createDataEnvelope(true, {
        source: 'DistributedCacheService',
        governanceVerdict: createVerdict(GovernanceResult.ALLOW, 'Cache cleared'),
        classification: DataClassification.INTERNAL,
      });
    } catch (error: any) {
      logger.error({ error }, 'Failed to clear cache');
      return createDataEnvelope(false, {
        source: 'DistributedCacheService',
        governanceVerdict: createVerdict(GovernanceResult.FLAG, 'Cache clear failed'),
        classification: DataClassification.INTERNAL,
      });
    }
  }

  /**
   * Shutdown the cache service
   */
  async shutdown(): Promise<void> {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      await this.flushWriteBuffer();
    }
    if (this.subscriber) {
      await this.subscriber.unsubscribe();
      await this.subscriber.quit();
    }
    logger.info('DistributedCacheService shutdown complete');
  }
}

// Export singleton factory
let instance: DistributedCacheService | null = null;

export function getDistributedCache(redis: Redis | any, config?: Partial<CacheConfig>): DistributedCacheService {
  if (!instance) {
    instance = new DistributedCacheService(redis, config);
  }
  return instance;
}

export default DistributedCacheService;
