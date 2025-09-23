/**
 * GraphQL Response Cache Implementation
 *
 * Provides intelligent caching of GraphQL responses with support for
 * per-tenant isolation, cache invalidation strategies, and performance
 * monitoring to meet SLO targets (reads p95 ≤350ms).
 */

import { createHash } from 'crypto';
import { LRUCache } from 'lru-cache';
import { Redis } from 'ioredis';
import { logger } from '../../utils/logger';

interface CacheKey {
  query: string;
  variables: Record<string, any>;
  tenantId: string;
  userId?: string;
  scopes?: string[];
}

interface CacheEntry {
  data: any;
  errors?: any[];
  extensions?: any;
  cachedAt: Date;
  ttl: number;
  tags: string[];
  hitCount: number;
  lastAccess: Date;
}

interface CacheOptions {
  redis?: Redis;
  defaultTTL?: number; // seconds
  maxMemoryEntries?: number;
  enableTaggedInvalidation?: boolean;
  enableMetrics?: boolean;
  compressionThreshold?: number; // bytes
}

interface CachePolicy {
  ttl?: number;
  tags?: string[];
  scope?: 'public' | 'tenant' | 'user';
  invalidateOn?: string[];
}

export class GraphQLResponseCache {
  private memoryCache: LRUCache<string, CacheEntry>;
  private redis?: Redis;
  private defaultTTL: number;
  private enableTaggedInvalidation: boolean;
  private enableMetrics: boolean;
  private compressionThreshold: number;
  private metrics: {
    hits: number;
    misses: number;
    sets: number;
    evictions: number;
    invalidations: number;
    errors: number;
    avgResponseTime: number;
  };

  // Cache policies for different operation types
  private static readonly CACHE_POLICIES: Record<string, CachePolicy> = {
    // Fast read operations
    'getUser': {
      ttl: 300, // 5 minutes
      scope: 'user',
      tags: ['user'],
      invalidateOn: ['updateUser', 'deleteUser']
    },
    'getTenant': {
      ttl: 600, // 10 minutes
      scope: 'tenant',
      tags: ['tenant'],
      invalidateOn: ['updateTenant']
    },

    // Entity queries - frequently accessed
    'searchEntities': {
      ttl: 180, // 3 minutes
      scope: 'tenant',
      tags: ['entities', 'search'],
      invalidateOn: ['createEntity', 'updateEntity', 'deleteEntity']
    },
    'getEntity': {
      ttl: 300, // 5 minutes
      scope: 'tenant',
      tags: ['entity'],
      invalidateOn: ['updateEntity', 'deleteEntity']
    },
    'getEntityRelationships': {
      ttl: 240, // 4 minutes
      scope: 'tenant',
      tags: ['entity', 'relationships'],
      invalidateOn: ['createRelationship', 'updateRelationship', 'deleteRelationship']
    },

    // NLQ operations - most critical for performance
    'executeNLQuery': {
      ttl: 900, // 15 minutes (NLQ results are expensive to compute)
      scope: 'tenant',
      tags: ['nlq', 'cypher'],
      invalidateOn: ['createEntity', 'updateEntity', 'deleteEntity', 'createRelationship']
    },
    'getCypherPlan': {
      ttl: 3600, // 1 hour (query plans are stable)
      scope: 'public',
      tags: ['cypher', 'plan']
    },

    // Analytics and aggregations
    'getAnalytics': {
      ttl: 1800, // 30 minutes
      scope: 'tenant',
      tags: ['analytics'],
      invalidateOn: ['createEntity', 'updateEntity', 'deleteEntity']
    },

    // Schema and metadata
    'getSchema': {
      ttl: 3600, // 1 hour
      scope: 'public',
      tags: ['schema']
    },
    'introspection': {
      ttl: 3600, // 1 hour
      scope: 'public',
      tags: ['schema']
    }
  };

  constructor(options: CacheOptions = {}) {
    this.memoryCache = new LRUCache({
      max: options.maxMemoryEntries || 1000,
      ttl: (options.defaultTTL || 300) * 1000, // Convert to milliseconds
      updateAgeOnGet: true,
      updateAgeOnHas: true,
      dispose: () => {
        if (this.enableMetrics) {
          this.metrics.evictions++;
        }
      }
    });

    this.redis = options.redis;
    this.defaultTTL = options.defaultTTL || 300;
    this.enableTaggedInvalidation = options.enableTaggedInvalidation ?? true;
    this.enableMetrics = options.enableMetrics ?? true;
    this.compressionThreshold = options.compressionThreshold || 1024; // 1KB

    this.metrics = {
      hits: 0,
      misses: 0,
      sets: 0,
      evictions: 0,
      invalidations: 0,
      errors: 0,
      avgResponseTime: 0
    };
  }

  /**
   * Generate cache key from request parameters
   */
  private generateCacheKey(keyData: CacheKey): string {
    const { query, variables, tenantId, userId, scopes } = keyData;

    // Normalize variables for consistent hashing
    const normalizedVariables = this.normalizeVariables(variables);

    // Create deterministic key
    const keyComponents = [
      createHash('sha256').update(query.replace(/\s+/g, ' ').trim()).digest('hex').substring(0, 16),
      createHash('sha256').update(JSON.stringify(normalizedVariables)).digest('hex').substring(0, 16),
      tenantId,
      userId || 'anonymous',
      (scopes || []).sort().join(',')
    ];

    return `gql:${keyComponents.join(':')}`;
  }

  /**
   * Normalize variables to ensure consistent cache keys
   */
  private normalizeVariables(variables: Record<string, any>): Record<string, any> {
    if (!variables) return {};

    // Sort object keys and handle nested objects
    const normalized: Record<string, any> = {};
    const sortedKeys = Object.keys(variables).sort();

    for (const key of sortedKeys) {
      const value = variables[key];
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        normalized[key] = this.normalizeVariables(value);
      } else if (Array.isArray(value)) {
        normalized[key] = value.slice().sort();
      } else {
        normalized[key] = value;
      }
    }

    return normalized;
  }

  /**
   * Get cache policy for operation
   */
  private getCachePolicy(operationName?: string): CachePolicy {
    if (!operationName) {
      return { ttl: this.defaultTTL, scope: 'tenant', tags: [] };
    }

    return GraphQLResponseCache.CACHE_POLICIES[operationName] || {
      ttl: this.defaultTTL,
      scope: 'tenant',
      tags: [operationName]
    };
  }

  /**
   * Check if response should be cached
   */
  private shouldCache(result: any, operationName?: string): boolean {
    // Don't cache errors (unless they're business logic errors)
    if (result.errors && result.errors.some((error: any) =>
      !error.extensions?.isBusinessLogicError)) {
      return false;
    }

    // Don't cache mutations by default
    if (operationName && operationName.startsWith('create') ||
        operationName?.startsWith('update') ||
        operationName?.startsWith('delete')) {
      return false;
    }

    // Don't cache empty results
    if (!result.data || Object.keys(result.data).length === 0) {
      return false;
    }

    return true;
  }

  /**
   * Get cached response
   */
  async get(keyData: CacheKey, operationName?: string): Promise<any | null> {
    const startTime = Date.now();

    try {
      const cacheKey = this.generateCacheKey(keyData);

      // Check memory cache first
      const memoryEntry = this.memoryCache.get(cacheKey);
      if (memoryEntry) {
        memoryEntry.hitCount++;
        memoryEntry.lastAccess = new Date();
        this.memoryCache.set(cacheKey, memoryEntry);

        if (this.enableMetrics) {
          this.metrics.hits++;
          this.updateAvgResponseTime(Date.now() - startTime);
        }

        logger.debug(`Memory cache hit for operation: ${operationName}`);
        return {
          data: memoryEntry.data,
          errors: memoryEntry.errors,
          extensions: {
            ...memoryEntry.extensions,
            cache: {
              hit: true,
              source: 'memory',
              cachedAt: memoryEntry.cachedAt,
              ttl: memoryEntry.ttl
            }
          }
        };
      }

      // Check Redis if available
      if (this.redis) {
        const redisResult = await this.redis.get(cacheKey);
        if (redisResult) {
          let entry: CacheEntry;

          try {
            entry = JSON.parse(redisResult);
          } catch (parseError) {
            logger.warn('Failed to parse Redis cache entry:', parseError);
            await this.redis.del(cacheKey);
            return null;
          }

          // Check if entry is still valid
          const now = new Date();
          const expiresAt = new Date(entry.cachedAt);
          expiresAt.setSeconds(expiresAt.getSeconds() + entry.ttl);

          if (expiresAt < now) {
            await this.redis.del(cacheKey);
            return null;
          }

          // Store in memory cache for faster future access
          this.memoryCache.set(cacheKey, {
            ...entry,
            hitCount: entry.hitCount + 1,
            lastAccess: now
          });

          if (this.enableMetrics) {
            this.metrics.hits++;
            this.updateAvgResponseTime(Date.now() - startTime);
          }

          logger.debug(`Redis cache hit for operation: ${operationName}`);
          return {
            data: entry.data,
            errors: entry.errors,
            extensions: {
              ...entry.extensions,
              cache: {
                hit: true,
                source: 'redis',
                cachedAt: entry.cachedAt,
                ttl: entry.ttl
              }
            }
          };
        }
      }

      if (this.enableMetrics) {
        this.metrics.misses++;
        this.updateAvgResponseTime(Date.now() - startTime);
      }

      return null;

    } catch (error) {
      if (this.enableMetrics) {
        this.metrics.errors++;
      }
      logger.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * Store response in cache
   */
  async set(
    keyData: CacheKey,
    result: any,
    operationName?: string
  ): Promise<void> {
    try {
      if (!this.shouldCache(result, operationName)) {
        return;
      }

      const cacheKey = this.generateCacheKey(keyData);
      const policy = this.getCachePolicy(operationName);
      const now = new Date();

      const entry: CacheEntry = {
        data: result.data,
        errors: result.errors,
        extensions: result.extensions,
        cachedAt: now,
        ttl: policy.ttl || this.defaultTTL,
        tags: policy.tags || [],
        hitCount: 0,
        lastAccess: now
      };

      // Store in memory cache
      this.memoryCache.set(cacheKey, entry);

      // Store in Redis if available
      if (this.redis) {
        const serialized = JSON.stringify(entry);
        const ttlSeconds = policy.ttl || this.defaultTTL;

        await this.redis.setex(cacheKey, ttlSeconds, serialized);

        // Store tags for invalidation if enabled
        if (this.enableTaggedInvalidation && policy.tags) {
          for (const tag of policy.tags) {
            const tagKey = `tag:${keyData.tenantId}:${tag}`;
            await this.redis.sadd(tagKey, cacheKey);
            await this.redis.expire(tagKey, ttlSeconds);
          }
        }
      }

      if (this.enableMetrics) {
        this.metrics.sets++;
      }

      logger.debug(`Cached response for operation: ${operationName}`);

    } catch (error) {
      if (this.enableMetrics) {
        this.metrics.errors++;
      }
      logger.error('Cache set error:', error);
    }
  }

  /**
   * Invalidate cache entries by tags
   */
  async invalidateByTags(tenantId: string, tags: string[]): Promise<number> {
    let invalidatedCount = 0;

    try {
      for (const tag of tags) {
        const tagKey = `tag:${tenantId}:${tag}`;

        if (this.redis) {
          const cacheKeys = await this.redis.smembers(tagKey);

          if (cacheKeys.length > 0) {
            // Remove from Redis
            await this.redis.del(...cacheKeys);
            await this.redis.del(tagKey);

            // Remove from memory cache
            for (const cacheKey of cacheKeys) {
              this.memoryCache.delete(cacheKey);
            }

            invalidatedCount += cacheKeys.length;
          }
        } else {
          // For memory-only cache, we need to scan all entries
          for (const [key, entry] of this.memoryCache.entries()) {
            if (entry.tags.includes(tag)) {
              this.memoryCache.delete(key);
              invalidatedCount++;
            }
          }
        }
      }

      if (this.enableMetrics) {
        this.metrics.invalidations += invalidatedCount;
      }

      logger.debug(`Invalidated ${invalidatedCount} cache entries for tags: ${tags.join(', ')}`);
      return invalidatedCount;

    } catch (error) {
      if (this.enableMetrics) {
        this.metrics.errors++;
      }
      logger.error('Cache invalidation error:', error);
      return 0;
    }
  }

  /**
   * Invalidate cache entries for tenant
   */
  async invalidateByTenant(tenantId: string): Promise<number> {
    let invalidatedCount = 0;

    try {
      if (this.redis) {
        const pattern = `gql:*:${tenantId}:*`;
        const keys = await this.redis.keys(pattern);

        if (keys.length > 0) {
          await this.redis.del(...keys);
          invalidatedCount = keys.length;
        }

        // Also clean up tag keys
        const tagPattern = `tag:${tenantId}:*`;
        const tagKeys = await this.redis.keys(tagPattern);
        if (tagKeys.length > 0) {
          await this.redis.del(...tagKeys);
        }
      }

      // Clean memory cache
      for (const [key] of this.memoryCache.entries()) {
        if (key.includes(`:${tenantId}:`)) {
          this.memoryCache.delete(key);
          invalidatedCount++;
        }
      }

      if (this.enableMetrics) {
        this.metrics.invalidations += invalidatedCount;
      }

      logger.info(`Invalidated ${invalidatedCount} cache entries for tenant: ${tenantId}`);
      return invalidatedCount;

    } catch (error) {
      if (this.enableMetrics) {
        this.metrics.errors++;
      }
      logger.error('Tenant cache invalidation error:', error);
      return 0;
    }
  }

  /**
   * Update average response time metric
   */
  private updateAvgResponseTime(responseTime: number): void {
    const alpha = 0.1; // Exponential moving average factor
    this.metrics.avgResponseTime = this.metrics.avgResponseTime === 0
      ? responseTime
      : (alpha * responseTime) + ((1 - alpha) * this.metrics.avgResponseTime);
  }

  /**
   * Get cache metrics
   */
  getMetrics() {
    const total = this.metrics.hits + this.metrics.misses;
    const hitRate = total > 0 ? (this.metrics.hits / total) * 100 : 0;

    return {
      ...this.metrics,
      hitRate: Number(hitRate.toFixed(2)),
      memorySize: this.memoryCache.size,
      memoryMax: this.memoryCache.max,
      avgResponseTime: Number(this.metrics.avgResponseTime.toFixed(2))
    };
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    try {
      this.memoryCache.clear();

      if (this.redis) {
        const gqlKeys = await this.redis.keys('gql:*');
        const tagKeys = await this.redis.keys('tag:*');
        const allKeys = [...gqlKeys, ...tagKeys];

        if (allKeys.length > 0) {
          await this.redis.del(...allKeys);
        }
      }

      logger.info('Cleared all GraphQL response cache entries');
    } catch (error) {
      logger.error('Failed to clear response cache:', error);
      throw error;
    }
  }
}

/**
 * Create caching middleware for GraphQL
 */
export function createResponseCacheMiddleware(cache: GraphQLResponseCache) {
  return {
    requestDidStart() {
      return {
        async willSendResponse(requestContext: any) {
          const { request, response, contextValue } = requestContext;

          if (response.errors || !response.data) {
            return;
          }

          const { tenantId, userId, scopes } = contextValue;
          const operationName = request.operationName;

          await cache.set(
            {
              query: request.query,
              variables: request.variables || {},
              tenantId,
              userId,
              scopes
            },
            {
              data: response.data,
              errors: response.errors,
              extensions: response.extensions
            },
            operationName
          );
        }
      };
    }
  };
}

export default GraphQLResponseCache;