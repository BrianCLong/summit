/**
 * Redis Cache Implementation
 *
 * Redis-based caching for feature flag evaluations
 */

import Redis from 'ioredis';
import type {
  FlagCache,
  FlagContext,
  FlagEvaluation,
  FlagVariation,
  CacheStats,
} from '../types.js';

/**
 * Redis cache configuration
 */
export interface RedisCacheConfig {
  /** Redis client instance */
  redis?: Redis;
  /** Redis connection URL */
  url?: string;
  /** Redis host */
  host?: string;
  /** Redis port */
  port?: number;
  /** Redis password */
  password?: string;
  /** Redis database */
  db?: number;
  /** Key prefix */
  keyPrefix?: string;
  /** Default TTL in seconds */
  defaultTTL?: number;
  /** Enable stats tracking */
  enableStats?: boolean;
}

/**
 * Redis-based feature flag cache
 */
export class RedisCache implements FlagCache {
  private redis: Redis;
  private keyPrefix: string;
  private defaultTTL: number;
  private enableStats: boolean;
  private ownRedis: boolean;

  // Stats
  private stats = {
    hits: 0,
    misses: 0,
  };

  constructor(config: RedisCacheConfig) {
    this.keyPrefix = config.keyPrefix ?? 'ff:';
    this.defaultTTL = config.defaultTTL ?? 300; // 5 minutes
    this.enableStats = config.enableStats ?? true;

    if (config.redis) {
      this.redis = config.redis;
      this.ownRedis = false;
    } else {
      // Create new Redis instance
      if (config.url) {
        this.redis = new Redis(config.url);
      } else {
        this.redis = new Redis({
          host: config.host ?? 'localhost',
          port: config.port ?? 6379,
          password: config.password,
          db: config.db ?? 0,
        });
      }
      this.ownRedis = true;
    }
  }

  /**
   * Get cached evaluation
   */
  async get<T = FlagVariation>(
    key: string,
    context: FlagContext,
  ): Promise<FlagEvaluation<T> | null> {
    try {
      const cacheKey = this.buildCacheKey(key, context);
      const cached = await this.redis.get(cacheKey);

      if (cached) {
        if (this.enableStats) {
          this.stats.hits++;
        }
        return JSON.parse(cached) as FlagEvaluation<T>;
      }

      if (this.enableStats) {
        this.stats.misses++;
      }
      return null;
    } catch (error) {
      // Return null on cache errors to allow fallback to provider
      return null;
    }
  }

  /**
   * Set cached evaluation
   */
  async set<T = FlagVariation>(
    key: string,
    context: FlagContext,
    evaluation: FlagEvaluation<T>,
    ttl?: number,
  ): Promise<void> {
    try {
      const cacheKey = this.buildCacheKey(key, context);
      const value = JSON.stringify(evaluation);
      const effectiveTTL = ttl ?? this.defaultTTL;

      await this.redis.setex(cacheKey, effectiveTTL, value);
    } catch (error) {
      // Silently fail on cache errors
    }
  }

  /**
   * Delete cached evaluation
   */
  async delete(key: string, context?: FlagContext): Promise<void> {
    try {
      if (context) {
        const cacheKey = this.buildCacheKey(key, context);
        await this.redis.del(cacheKey);
      } else {
        // Delete all cached evaluations for this flag
        const pattern = `${this.keyPrefix}${key}:*`;
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      }
    } catch (error) {
      // Silently fail on cache errors
    }
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    try {
      const pattern = `${this.keyPrefix}*`;
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      // Silently fail on cache errors
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<CacheStats> {
    const size = await this.getCacheSize();
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? this.stats.hits / total : 0;

    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      size,
      hitRate,
    };
  }

  /**
   * Get cache size
   */
  private async getCacheSize(): Promise<number> {
    try {
      const pattern = `${this.keyPrefix}*`;
      const keys = await this.redis.keys(pattern);
      return keys.length;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Build cache key
   */
  private buildCacheKey(key: string, context: FlagContext): string {
    // Build a deterministic key based on context
    const contextKey = this.buildContextKey(context);
    return `${this.keyPrefix}${key}:${contextKey}`;
  }

  /**
   * Build context key for caching
   */
  private buildContextKey(context: FlagContext): string {
    // Use the most important context attributes for cache key
    const parts: string[] = [];

    if (context.userId) parts.push(`u:${context.userId}`);
    if (context.tenantId) parts.push(`t:${context.tenantId}`);
    if (context.environment) parts.push(`e:${context.environment}`);
    if (context.userRole) {
      const role = Array.isArray(context.userRole)
        ? context.userRole.join(',')
        : context.userRole;
      parts.push(`r:${role}`);
    }

    // Add custom attributes if they exist
    if (context.attributes) {
      const attrKeys = Object.keys(context.attributes).sort();
      for (const attrKey of attrKeys) {
        parts.push(`a:${attrKey}:${context.attributes[attrKey]}`);
      }
    }

    return parts.join('|') || 'default';
  }

  /**
   * Close Redis connection
   */
  async close(): Promise<void> {
    if (this.ownRedis) {
      await this.redis.quit();
    }
  }
}
