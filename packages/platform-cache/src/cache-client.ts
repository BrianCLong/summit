import type {
  CacheConfig,
  CacheEntry,
  CacheOptions,
  CacheProvider,
  CacheMetrics,
} from './types.js';

/**
 * Cache client that wraps providers with consistent interface
 */
export class CacheClient {
  private localProvider: CacheProvider | null;
  private redisProvider: CacheProvider | null;
  private config: CacheConfig;
  private metrics: CacheMetrics;

  constructor(
    config: CacheConfig,
    localProvider: CacheProvider | null,
    redisProvider: CacheProvider | null,
    metrics: CacheMetrics
  ) {
    this.config = config;
    this.localProvider = localProvider;
    this.redisProvider = redisProvider;
    this.metrics = metrics;
  }

  /**
   * Get value from cache with multi-layer lookup
   */
  async get<T>(key: string, options: CacheOptions = {}): Promise<CacheEntry<T> | null> {
    const startTime = Date.now();
    const fullKey = this.buildKey(key);

    try {
      // Check local cache first
      if (this.localProvider && !options.skipLocal && !options.forceRefresh) {
        const localValue = await this.localProvider.get<CacheEntry<T>>(fullKey);
        if (localValue && localValue.expiresAt > Date.now()) {
          this.metrics.recordHit('local');
          this.metrics.recordGetLatency(Date.now() - startTime);
          return { ...localValue, source: 'local' };
        }
      }

      // Check Redis
      if (this.redisProvider && !options.skipRedis && !options.forceRefresh) {
        const redisValue = await this.redisProvider.get<CacheEntry<T>>(fullKey);
        if (redisValue && redisValue.expiresAt > Date.now()) {
          // Populate local cache
          if (this.localProvider && !options.skipLocal) {
            const localTtl = Math.min(
              this.config.local.ttl,
              Math.floor((redisValue.expiresAt - Date.now()) / 1000)
            );
            await this.localProvider.set(fullKey, redisValue, localTtl);
          }

          this.metrics.recordHit('redis');
          this.metrics.recordGetLatency(Date.now() - startTime);
          return { ...redisValue, source: 'redis' };
        }
      }

      this.metrics.recordMiss();
      this.metrics.recordGetLatency(Date.now() - startTime);
      return null;
    } catch (error) {
      this.metrics.recordGetLatency(Date.now() - startTime);
      throw error;
    }
  }

  /**
   * Set value in cache
   */
  async set<T>(key: string, value: T, options: CacheOptions = {}): Promise<void> {
    const startTime = Date.now();
    const fullKey = this.buildKey(key);
    const ttl = Math.min(options.ttl ?? this.config.defaultTtl, this.config.maxTtl);

    const entry: CacheEntry<T> = {
      value,
      createdAt: Date.now(),
      expiresAt: Date.now() + ttl * 1000,
      source: 'origin',
      metadata: options.tags ? { tags: options.tags } : undefined,
    };

    try {
      const promises: Promise<void>[] = [];

      // Set in local cache
      if (this.localProvider && !options.skipLocal) {
        const localTtl = Math.min(this.config.local.ttl, ttl);
        promises.push(this.localProvider.set(fullKey, entry, localTtl));
      }

      // Set in Redis
      if (this.redisProvider && !options.skipRedis) {
        promises.push(this.redisProvider.set(fullKey, entry, ttl));

        // Store tag mappings
        if (options.tags?.length) {
          for (const tag of options.tags) {
            const tagKey = this.buildTagKey(tag);
            promises.push(
              this.redisProvider.set(
                `${tagKey}:${fullKey}`,
                { key: fullKey, expiresAt: entry.expiresAt },
                ttl
              )
            );
          }
        }
      }

      await Promise.all(promises);
      this.metrics.recordSetLatency(Date.now() - startTime);
    } catch (error) {
      this.metrics.recordSetLatency(Date.now() - startTime);
      throw error;
    }
  }

  /**
   * Delete key from cache
   */
  async delete(key: string): Promise<boolean> {
    const fullKey = this.buildKey(key);
    const results: boolean[] = [];

    if (this.localProvider) {
      results.push(await this.localProvider.delete(fullKey));
    }

    if (this.redisProvider) {
      results.push(await this.redisProvider.delete(fullKey));
    }

    return results.some(r => r);
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    const fullKey = this.buildKey(key);

    if (this.localProvider) {
      const exists = await this.localProvider.exists(fullKey);
      if (exists) return true;
    }

    if (this.redisProvider) {
      return this.redisProvider.exists(fullKey);
    }

    return false;
  }

  /**
   * Get or set value with origin function
   */
  async getOrSet<T>(
    key: string,
    fn: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<CacheEntry<T>> {
    // Try to get from cache
    const cached = await this.get<T>(key, options);
    if (cached) {
      return cached;
    }

    // Fetch from origin
    const value = await fn();

    // Cache the result
    await this.set(key, value, options);

    return {
      value,
      createdAt: Date.now(),
      expiresAt: Date.now() + (options.ttl ?? this.config.defaultTtl) * 1000,
      source: 'origin',
    };
  }

  /**
   * Invalidate by pattern
   */
  async invalidatePattern(pattern: string): Promise<number> {
    const fullPattern = this.buildKey(pattern);
    let count = 0;

    if (this.redisProvider) {
      count += await this.redisProvider.deletePattern(fullPattern);
    }

    // Local cache doesn't support pattern deletion efficiently
    // Clear all if pattern is broad
    if (this.localProvider && pattern.includes('*')) {
      // This is a simplification - in production, use a more sophisticated approach
    }

    return count;
  }

  /**
   * Invalidate by tags
   */
  async invalidateByTags(tags: string[]): Promise<number> {
    if (!this.redisProvider) return 0;

    let count = 0;
    for (const tag of tags) {
      const tagPattern = `${this.buildTagKey(tag)}:*`;
      const deleted = await this.redisProvider.deletePattern(tagPattern);
      count += deleted;
    }

    return count;
  }

  /**
   * Build full cache key
   */
  private buildKey(key: string): string {
    return `${this.config.namespace}:v1:${key}`;
  }

  /**
   * Build tag key
   */
  private buildTagKey(tag: string): string {
    return `${this.config.namespace}:tag:${tag}`;
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return this.metrics.getStats();
  }

  /**
   * Close connections
   */
  async close(): Promise<void> {
    if (this.redisProvider) {
      await this.redisProvider.close();
    }
  }
}
