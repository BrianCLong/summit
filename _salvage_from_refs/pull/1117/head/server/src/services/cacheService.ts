import Redis from 'redis';

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export class CacheService {
  private memoryCache: Map<string, CacheEntry<any>> = new Map();
  private redisClient: any = null;
  private defaultTTL = 300; // 5 minutes default TTL

  constructor() {
    // Initialize Redis client if available
    try {
      if (process.env.REDIS_HOST) {
        // Redis client would be initialized here in production
        console.log('[CACHE] Redis cache configured');
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
    // Check memory cache first
    const entry = this.memoryCache.get(key);
    if (entry) {
      const now = Date.now();
      if (now - entry.timestamp < entry.ttl * 1000) {
        console.log(`[CACHE] Memory cache hit for key: ${key}`);
        return entry.data as T;
      } else {
        // Expired, remove from cache
        this.memoryCache.delete(key);
        console.log(`[CACHE] Memory cache expired for key: ${key}`);
      }
    }

    // TODO: Check Redis cache in production
    console.log(`[CACHE] Cache miss for key: ${key}`);
    return null;
  }

  /**
   * Set cached data with optional TTL
   */
  async set<T>(key: string, data: T, ttl?: number): Promise<void> {
    const cacheTTL = ttl || this.defaultTTL;

    // Store in memory cache
    this.memoryCache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: cacheTTL,
    });

    console.log(`[CACHE] Cached data for key: ${key} (TTL: ${cacheTTL}s)`);

    // TODO: Store in Redis cache in production
  }

  /**
   * Delete cached data
   */
  async delete(key: string): Promise<void> {
    this.memoryCache.delete(key);
    console.log(`[CACHE] Deleted cache for key: ${key}`);

    // TODO: Delete from Redis cache in production
  }

  /**
   * Clear all cached data
   */
  async clear(): Promise<void> {
    this.memoryCache.clear();
    console.log('[CACHE] Cleared all memory cache');

    // TODO: Clear Redis cache in production
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

    return {
      totalEntries: this.memoryCache.size,
      validEntries,
      expiredEntries,
      cacheType: 'memory',
    };
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
