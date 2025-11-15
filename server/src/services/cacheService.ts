import { createClient, RedisClientType } from 'redis';
import {
  recHit,
  recMiss,
  recSet,
  cacheLocalSize,
} from '../metrics/cacheMetrics.js';

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export class CacheService {
  private memoryCache: Map<string, CacheEntry<any>> = new Map();
  private redisClient: RedisClientType | null = null;
  private namespace = process.env.CACHE_NAMESPACE || 'maestro';
  private defaultTTL = 300; // 5 minutes default TTL

  constructor() {
    // Initialize Redis client if available
    try {
      const url =
        process.env.REDIS_URL ||
        (process.env.REDIS_HOST
          ? `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT || '6379'}`
          : undefined);
      if (url) {
        this.redisClient = createClient({ url });
        this.redisClient.on('error', (err) =>
          console.warn('[CACHE] Redis client error:', err),
        );
        this.redisClient
          .connect()
          .then(() => console.log('[CACHE] Redis cache connected'))
          .catch((e) => console.warn('[CACHE] Redis connect failed', e));
      } else {
        console.log('[CACHE] Using in-memory cache only');
      }
    } catch (error) {
      console.warn('[CACHE] Redis unavailable, using in-memory cache:', error);
    }
  }

  /**
   * Get cached data by key
   */
  async get<T>(key: string): Promise<T | null> {
    const op = 'get';
    // Check memory cache first
    const entry = this.memoryCache.get(key);
    if (entry) {
      const now = Date.now();
      if (now - entry.timestamp < entry.ttl * 1000) {
        console.log(`[CACHE] Memory cache hit for key: ${key}`);
        recHit('memory', op);
        return entry.data as T;
      } else {
        // Expired, remove from cache
        this.memoryCache.delete(key);
        console.log(`[CACHE] Memory cache expired for key: ${key}`);
      }
    }

    // Try Redis if available
    if (this.redisClient) {
      try {
        const rkey = `${this.namespace}:${key}`;
        const raw = await this.redisClient.get(rkey);
        if (raw) {
          const parsed = JSON.parse(raw as string) as CacheEntry<T>;
          const now = Date.now();
          if (now - parsed.timestamp < parsed.ttl * 1000) {
            recHit('redis', op);
            return parsed.data as T;
          } else {
            await this.redisClient.del(rkey);
          }
        }
      } catch (e) {
        console.warn('[CACHE] Redis get error:', e);
      }
    }

    console.log(`[CACHE] Cache miss for key: ${key}`);
    recMiss(this.redisClient ? 'redis' : 'memory', op);
    return null;
  }

  /**
   * Set cached data with optional TTL
   */
  async set<T>(key: string, data: T, ttl?: number): Promise<void> {
    const op = 'set';
    const cacheTTL = ttl || this.defaultTTL;

    // Store in memory cache
    this.memoryCache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: cacheTTL,
    });

    console.log(`[CACHE] Cached data for key: ${key} (TTL: ${cacheTTL}s)`);
    recSet('memory', op);

    if (this.redisClient) {
      try {
        const rkey = `${this.namespace}:${key}`;
        const payload: CacheEntry<T> = {
          data,
          timestamp: Date.now(),
          ttl: cacheTTL,
        };
        await this.redisClient.set(rkey, JSON.stringify(payload), {
          EX: cacheTTL,
        });
        recSet('redis', op);
      } catch (e) {
        console.warn('[CACHE] Redis set error:', e);
      }
    }
  }

  /**
   * Delete cached data
   */
  async delete(key: string): Promise<void> {
    const op = 'delete';
    this.memoryCache.delete(key);
    console.log(`[CACHE] Deleted cache for key: ${key}`);
    if (this.redisClient) {
      try {
        await this.redisClient.del(`${this.namespace}:${key}`);
      } catch (e) {
        console.warn('[CACHE] Redis del error:', e);
      }
    }
  }

  /**
   * Clear all cached data
   */
  async clear(): Promise<void> {
    this.memoryCache.clear();
    console.log('[CACHE] Cleared all memory cache');
    if (this.redisClient) {
      try {
        const pattern = `${this.namespace}:*`;
        // Iterate keys (SCAN pattern) to avoid FLUSHALL
        for await (const key of this.scanKeys(pattern)) {
          await this.redisClient.del(key);
        }
      } catch (e) {
        console.warn('[CACHE] Redis clear error:', e);
      }
    }
  }

  private async *scanKeys(pattern: string): AsyncGenerator<string> {
    if (!this.redisClient) return;
    let cursor = 0;
    do {
      const res: any = await (this.redisClient as any).scan(cursor, {
        MATCH: pattern,
        COUNT: 1000,
      });
      cursor = res.cursor;
      const keys: string[] = res.keys || res[1] || [];
      for (const k of keys) yield k;
    } while (cursor !== 0);
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const now = Date.now();
    let validEntries = 0;
    let expiredEntries = 0;

    for (const [key, entry] of this.memoryCache.entries()) {
      if (now - entry.timestamp < entry.ttl * 1000) {
        validEntries++;
      } else {
        expiredEntries++;
      }
    }

    const stats = {
      totalEntries: this.memoryCache.size,
      validEntries,
      expiredEntries,
      cacheType: 'memory',
    };
    cacheLocalSize.labels(this.namespace).set(this.memoryCache.size);
    return stats;
  }

  /**
   * Clean up expired entries
   */
  cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.memoryCache.entries()) {
      if (now - entry.timestamp >= entry.ttl * 1000) {
        this.memoryCache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`[CACHE] Cleaned up ${cleaned} expired entries`);
    }
  }
}

// Global cache instance
export const cacheService = new CacheService();

// Periodic cleanup every 5 minutes
setInterval(
  () => {
    cacheService.cleanup();
  },
  5 * 60 * 1000,
);
