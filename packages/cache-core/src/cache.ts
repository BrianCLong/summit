import Redis from "ioredis";
import type {
  CacheConfig,
  CacheGetOptions,
  CacheSetOptions,
  CacheStats,
  ICache,
  InvalidationMessage,
} from "./types.js";
import { CacheTier } from "./types.js";
import { LRUCache } from "./lru-cache.js";
import { CacheMetrics, NoOpMetrics } from "./metrics.js";

const DEFAULT_L1_MAX_BYTES = 100 * 1024 * 1024; // 100MB
const DEFAULT_TTL_SECONDS = 300; // 5 minutes
const INVALIDATION_CHANNEL = "cache:invalidation";
const CLEANUP_INTERVAL_MS = 60 * 1000; // 1 minute

/**
 * Unified cache implementation with L1 (in-memory) and L2 (Redis) tiers.
 * Provides consistent caching with metrics, tag-based invalidation, and pub/sub.
 */
export class Cache implements ICache {
  private readonly namespace: string;
  private readonly defaultTtlSeconds: number;
  private readonly enabledTiers: Set<CacheTier>;
  private readonly l1Cache: LRUCache | null;
  private readonly l2Client: Redis | null;
  private readonly subscriber: Redis | null;
  private readonly metrics: CacheMetrics | NoOpMetrics;
  private readonly inflight: Map<string, Promise<unknown>> = new Map();
  private readonly tagIndex: Map<string, Set<string>> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;
  private enabled = true;

  constructor(config: CacheConfig) {
    this.namespace = config.namespace;
    this.defaultTtlSeconds = config.defaultTtlSeconds ?? DEFAULT_TTL_SECONDS;
    this.enabledTiers = new Set(config.tiers ?? [CacheTier.L1, CacheTier.L2]);

    // Initialize L1 cache
    if (this.enabledTiers.has(CacheTier.L1)) {
      this.l1Cache = new LRUCache({
        maxBytes: config.l1?.maxBytes ?? DEFAULT_L1_MAX_BYTES,
      });
    } else {
      this.l1Cache = null;
    }

    // Initialize L2 (Redis) cache
    if (this.enabledTiers.has(CacheTier.L2)) {
      if (config.l2?.client) {
        this.l2Client = config.l2.client;
      } else if (config.l2?.connection) {
        this.l2Client = new Redis({
          host: config.l2.connection.host ?? "localhost",
          port: config.l2.connection.port ?? 6379,
          password: config.l2.connection.password,
          db: config.l2.connection.db ?? 0,
          retryStrategy: (times) => Math.min(times * 50, 2000),
          maxRetriesPerRequest: 3,
          enableOfflineQueue: false,
        });
      } else {
        this.l2Client = null;
      }

      // Set up subscriber for invalidation
      if (this.l2Client) {
        this.subscriber = this.l2Client.duplicate();
        this.setupPubSub(config.l2?.invalidationChannel ?? INVALIDATION_CHANNEL);
      } else {
        this.subscriber = null;
      }
    } else {
      this.l2Client = null;
      this.subscriber = null;
    }

    // Initialize metrics
    this.metrics = config.metrics !== false ? new CacheMetrics(this.namespace) : new NoOpMetrics();

    // Start cleanup interval
    this.startCleanup();
  }

  /**
   * Get a value from cache
   */
  async get<T>(key: string, options?: CacheGetOptions): Promise<T | null> {
    if (!this.enabled) return null;

    const fullKey = this.getKey(key);

    // Try L1 first
    if (!options?.skipL1 && this.l1Cache) {
      const endTimer = this.metrics.timeOperation("l1", "get");
      const value = this.l1Cache.get(fullKey);
      endTimer();

      if (value !== undefined) {
        this.metrics.recordHit("l1");
        this.updateL1Metrics();
        return value as T;
      }
      this.metrics.recordMiss("l1");
    }

    // Try L2
    if (!options?.skipL2 && this.l2Client) {
      const endTimer = this.metrics.timeOperation("l2", "get");
      try {
        const raw = await this.l2Client.get(fullKey);
        endTimer();

        if (raw) {
          const parsed = JSON.parse(raw);
          const value = parsed.value as T;

          // Populate L1 on L2 hit
          if (!options?.skipL1 && this.l1Cache) {
            const remainingTtl = Math.max(0, Math.floor((parsed.expiresAt - Date.now()) / 1000));
            this.l1Cache.set(fullKey, value, {
              ttlSeconds: remainingTtl,
              tags: parsed.tags,
            });
            this.trackTags(fullKey, parsed.tags);
            this.updateL1Metrics();
          }

          this.metrics.recordHit("l2");
          return value;
        }
        this.metrics.recordMiss("l2");
      } catch (error) {
        endTimer();
        // Redis errors should not break the application
      }
    }

    return null;
  }

  /**
   * Set a value in cache
   */
  async set<T>(key: string, value: T, options?: CacheSetOptions): Promise<void> {
    if (!this.enabled) return;

    const fullKey = this.getKey(key);
    const ttlSeconds = options?.ttlSeconds ?? this.defaultTtlSeconds;
    const tags = options?.tags;

    // Set L1
    if (!options?.skipL1 && this.l1Cache) {
      const endTimer = this.metrics.timeOperation("l1", "set");
      this.l1Cache.set(fullKey, value, { ttlSeconds, tags });
      endTimer();
      this.metrics.recordSet("l1");
      this.trackTags(fullKey, tags);
      this.updateL1Metrics();
    }

    // Set L2
    if (!options?.skipL2 && this.l2Client) {
      const endTimer = this.metrics.timeOperation("l2", "set");
      try {
        const payload = JSON.stringify({
          value,
          expiresAt: Date.now() + ttlSeconds * 1000,
          tags,
        });
        await this.l2Client.setex(fullKey, ttlSeconds, payload);
        endTimer();
        this.metrics.recordSet("l2");

        // Index tags in Redis
        if (tags && tags.length > 0) {
          await this.indexTagsInRedis(fullKey, tags, ttlSeconds);
        }
      } catch (error) {
        endTimer();
        // Redis errors should not break the application
      }
    }
  }

  /**
   * Delete a value from cache
   */
  async delete(key: string): Promise<void> {
    const fullKey = this.getKey(key);

    // Delete from L1
    if (this.l1Cache) {
      const endTimer = this.metrics.timeOperation("l1", "delete");
      this.l1Cache.delete(fullKey);
      endTimer();
      this.metrics.recordDelete("l1");
      this.dropTagTracking(fullKey);
      this.updateL1Metrics();
    }

    // Delete from L2
    if (this.l2Client) {
      const endTimer = this.metrics.timeOperation("l2", "delete");
      try {
        await this.l2Client.del(fullKey);
        endTimer();
        this.metrics.recordDelete("l2");

        // Publish invalidation
        await this.publishInvalidation({ type: "key", keys: [fullKey] });
      } catch (error) {
        endTimer();
      }
    }
  }

  /**
   * Delete by pattern (glob style)
   */
  async deleteByPattern(pattern: string): Promise<number> {
    const fullPattern = this.getKey(pattern);
    let deleted = 0;

    // Delete from L1
    if (this.l1Cache) {
      deleted += this.l1Cache.deleteByPattern(fullPattern);
      this.updateL1Metrics();
    }

    // Delete from L2
    if (this.l2Client) {
      try {
        const keys = await this.l2Client.keys(fullPattern);
        if (keys.length > 0) {
          deleted += await this.l2Client.del(...keys);
        }

        // Publish invalidation
        await this.publishInvalidation({ type: "pattern", pattern: fullPattern });
      } catch (error) {
        // Redis errors should not break the application
      }
    }

    this.metrics.recordInvalidation("pattern");
    return deleted;
  }

  /**
   * Get or set with loader function (cache-aside pattern with stampede protection)
   */
  async getOrSet<T>(key: string, loader: () => Promise<T>, options?: CacheSetOptions): Promise<T> {
    // Try to get from cache
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const fullKey = this.getKey(key);

    // Check for inflight request (stampede protection)
    if (this.inflight.has(fullKey)) {
      return (await this.inflight.get(fullKey)) as T;
    }

    // Create inflight promise
    const inflightPromise = (async () => {
      const value = await loader();
      await this.set(key, value, options);
      return value;
    })();

    this.inflight.set(fullKey, inflightPromise);

    try {
      return await inflightPromise;
    } finally {
      this.inflight.delete(fullKey);
    }
  }

  /**
   * Invalidate all entries with a specific tag
   */
  async invalidateByTag(tag: string): Promise<void> {
    // Invalidate from L1 using local tag index
    if (this.l1Cache) {
      this.l1Cache.deleteByTag(tag);
      this.tagIndex.delete(tag);
      this.updateL1Metrics();
    }

    // Invalidate from L2
    if (this.l2Client) {
      try {
        const tagKey = this.getTagKey(tag);
        const keys = await this.l2Client.smembers(tagKey);

        if (keys.length > 0) {
          await this.l2Client.del(...keys);
        }
        await this.l2Client.del(tagKey);

        // Publish invalidation
        await this.publishInvalidation({ type: "tag", tag });
      } catch (error) {
        // Redis errors should not break the application
      }
    }

    this.metrics.recordInvalidation("tag");
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const stats = this.metrics.getStats();

    const l1Stats = {
      hits: stats.l1.hits,
      misses: stats.l1.misses,
      sets: stats.l1.sets,
      deletes: stats.l1.deletes,
      size: this.l1Cache?.size ?? 0,
      bytes: this.l1Cache?.bytes ?? 0,
    };

    const l2Stats = {
      hits: stats.l2.hits,
      misses: stats.l2.misses,
      sets: stats.l2.sets,
      deletes: stats.l2.deletes,
    };

    const totalHits = l1Stats.hits + l2Stats.hits;
    const totalMisses = l1Stats.misses + l2Stats.misses;
    const total = totalHits + totalMisses;

    return {
      l1: l1Stats,
      l2: l2Stats,
      hitRate: total > 0 ? totalHits / total : 0,
      missRate: total > 0 ? totalMisses / total : 0,
    };
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    // Clear L1
    if (this.l1Cache) {
      this.l1Cache.clear();
      this.tagIndex.clear();
      this.updateL1Metrics();
    }

    // Clear L2 (only our namespace)
    if (this.l2Client) {
      try {
        const pattern = this.getKey("*");
        const keys = await this.l2Client.keys(pattern);
        if (keys.length > 0) {
          await this.l2Client.del(...keys);
        }
      } catch (error) {
        // Redis errors should not break the application
      }
    }
  }

  /**
   * Check if cache is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Disable the cache (useful for testing)
   */
  disable(): void {
    this.enabled = false;
  }

  /**
   * Enable the cache
   */
  enable(): void {
    this.enabled = true;
  }

  /**
   * Shutdown the cache
   */
  async shutdown(): Promise<void> {
    // Stop cleanup interval
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    // Close Redis connections
    if (this.subscriber) {
      await this.subscriber.quit();
    }
    if (this.l2Client) {
      await this.l2Client.quit();
    }
  }

  // Private methods

  private getKey(key: string): string {
    return `${this.namespace}:${key}`;
  }

  private getTagKey(tag: string): string {
    return `${this.namespace}:tag:${tag}`;
  }

  private trackTags(key: string, tags?: string[]): void {
    if (!tags || tags.length === 0) return;

    for (const tag of tags) {
      const keys = this.tagIndex.get(tag) ?? new Set();
      keys.add(key);
      this.tagIndex.set(tag, keys);
    }
  }

  private dropTagTracking(key: string): void {
    for (const [tag, keys] of this.tagIndex.entries()) {
      keys.delete(key);
      if (keys.size === 0) {
        this.tagIndex.delete(tag);
      }
    }
  }

  private async indexTagsInRedis(key: string, tags: string[], ttlSeconds: number): Promise<void> {
    if (!this.l2Client) return;

    for (const tag of tags) {
      const tagKey = this.getTagKey(tag);
      await this.l2Client.sadd(tagKey, key);
      await this.l2Client.expire(tagKey, ttlSeconds);
    }
  }

  private async publishInvalidation(message: InvalidationMessage): Promise<void> {
    if (!this.l2Client) return;

    try {
      await this.l2Client.publish(INVALIDATION_CHANNEL, JSON.stringify(message));
    } catch (error) {
      // Publish errors should not break the application
    }
  }

  private setupPubSub(channel: string): void {
    if (!this.subscriber) return;

    this.subscriber.on("message", (ch, message) => {
      if (ch !== channel) return;

      try {
        const payload = JSON.parse(message) as InvalidationMessage;

        if (payload.type === "key" && this.l1Cache) {
          for (const key of payload.keys) {
            this.l1Cache.delete(key);
            this.dropTagTracking(key);
          }
          this.updateL1Metrics();
        } else if (payload.type === "tag" && this.l1Cache) {
          this.l1Cache.deleteByTag(payload.tag);
          this.tagIndex.delete(payload.tag);
          this.updateL1Metrics();
        } else if (payload.type === "pattern" && this.l1Cache) {
          this.l1Cache.deleteByPattern(payload.pattern);
          this.updateL1Metrics();
        }
      } catch (error) {
        // Parse errors should not break the application
      }
    });

    this.subscriber.subscribe(channel).catch(() => {
      // Subscription errors should not break the application
    });
  }

  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      if (this.l1Cache) {
        this.l1Cache.cleanup();
        this.updateL1Metrics();
      }
    }, CLEANUP_INTERVAL_MS);

    // Ensure cleanup doesn't prevent process exit
    this.cleanupInterval.unref?.();
  }

  private updateL1Metrics(): void {
    if (this.l1Cache) {
      this.metrics.setEntries("l1", this.l1Cache.size);
      this.metrics.setBytes("l1", this.l1Cache.bytes);
    }
  }
}

/**
 * Create a cache instance with the given configuration
 */
export function createCache(config: CacheConfig): ICache {
  return new Cache(config);
}
