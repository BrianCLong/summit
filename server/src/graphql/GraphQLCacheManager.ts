import { Pool } from 'pg';
import { Redis } from 'ioredis';
import { SHA256 } from 'crypto-js';
import { logger } from '../config/logger.js';
import { metrics } from '../observability/metrics.js';

export interface CacheConfig {
  ttl: number; // Time to live in seconds
  maxSize?: number; // Maximum cache size
  enabled: boolean;
  compression?: boolean;
  tags?: string[];
}

export interface GraphQLCacheManagerOptions {
  redis: Redis;
  dbPool: Pool;
  config?: Partial<CacheConfig>;
}

export class GraphQLCacheManager {
  private redis: Redis;
  private dbPool: Pool;
  private defaultConfig: CacheConfig;

  constructor(options: GraphQLCacheManagerOptions) {
    this.redis = options.redis;
    this.dbPool = options.dbPool;
    this.defaultConfig = {
      ttl: 300, // 5 minutes default
      maxSize: 1000,
      enabled: process.env.GRAPHQL_CACHE_ENABLED === 'true',
      compression: process.env.GRAPHQL_CACHE_COMPRESSION === 'true',
      tags: [],
      ...options.config,
    };
  }

  /**
   * Get cached GraphQL response
   */
  async get(key: string): Promise<any | null> {
    if (!this.defaultConfig.enabled) {
      return null;
    }

    try {
      const cached = await this.redis.get(key);

      if (cached) {
        logger.debug('GraphQL response cache HIT', { cacheKey: key });
        metrics.graphqlCacheHits.inc();

        // Decompress if needed
        if (this.defaultConfig.compression) {
          // In a real implementation, we would decompress the value
          // For now, we'll just return as JSON
          return JSON.parse(cached);
        }

        return JSON.parse(cached);
      } else {
        logger.debug('GraphQL response cache MISS', { cacheKey: key });
        metrics.graphqlCacheMisses.inc();
      }
    } catch (error) {
      logger.error('Cache GET error:', error);
      metrics.graphqlCacheErrors.inc();
    }

    return null;
  }

  /**
   * Set GraphQL response in cache
   */
  async set(key: string, value: any, config?: Partial<CacheConfig>): Promise<boolean> {
    const effectiveConfig = { ...this.defaultConfig, ...config };

    if (!effectiveConfig.enabled) {
      return false;
    }

    try {
      // Serialize value
      const serialized = JSON.stringify(value);

      // Set with TTL
      await this.redis.setex(key, effectiveConfig.ttl, serialized);
      metrics.graphqlCacheSets.inc();
      logger.debug('GraphQL response cached', {
        cacheKey: key,
        size: serialized.length,
        ttl: effectiveConfig.ttl,
      });

      return true;
    } catch (error) {
      logger.error('Cache SET error:', error);
      metrics.graphqlCacheErrors.inc();
      return false;
    }
  }

  /**
   * Create cache key for GraphQL response
   */
  createResponseCacheKey(
    operationHash: string,
    variables: Record<string, any>,
    userId?: string,
    tenantId?: string
  ): string {
    const keyParts = ['graphql', 'response', operationHash];

    if (variables) {
      // Create a deterministic hash of variables
      const varHash = SHA256(JSON.stringify(variables)).toString().substring(0, 16);
      keyParts.push(`vars:${varHash}`);
    }

    if (userId) {
      keyParts.push(`user:${userId}`);
    }

    if (tenantId) {
      keyParts.push(`tenant:${tenantId}`);
    }

    return keyParts.join(':');
  }

  /**
   * Invalidate cache entries matching pattern
   */
  async invalidate(pattern: string): Promise<number> {
    try {
      // Find keys matching the pattern
      const keys = await this.redis.keys(pattern);

      if (keys.length > 0) {
        const result = await this.redis.del(...keys);
        logger.info(`Invalidated ${result} cache entries matching pattern: ${pattern}`);
        return result;
      }

      return 0;
    } catch (error) {
      logger.error('Cache invalidation error:', error);
      return 0;
    }
  }

  /**
   * Create cache key for persisted queries
   */
  createPersistedQueryCacheKey(hash: string, tenantId?: string): string {
    const keyParts = ['graphql', 'persisted', hash];

    if (tenantId) {
      keyParts.push(`tenant:${tenantId}`);
    }

    return keyParts.join(':');
  }

  /**
   * Get persisted query from cache or database
   */
  async getPersistedQuery(hash: string, tenantId?: string): Promise<string | null> {
    const cacheKey = this.createPersistedQueryCacheKey(hash, tenantId);

    // First, try to get from cache
    const cachedQuery = await this.get(cacheKey);
    if (cachedQuery) {
      return cachedQuery.query;
    }

    // If not in cache, get from database
    let queryResult;
    if (tenantId) {
      queryResult = await this.dbPool.query(
        'SELECT query FROM persisted_queries WHERE hash = $1 AND tenant_id = $2',
        [hash, tenantId]
      );
    } else {
      queryResult = await this.dbPool.query(
        'SELECT query FROM persisted_queries WHERE hash = $1',
        [hash]
      );
    }

    if (queryResult.rows.length > 0) {
      const query = queryResult.rows[0].query;
      
      // Cache the query for future requests
      await this.set(cacheKey, { query }, { ttl: 3600 }); // Cache persisted queries for 1 hour
      
      return query;
    }

    return null;
  }

  /**
   * Save persisted query to database and cache
   */
  async savePersistedQuery(hash: string, query: string, tenantId: string): Promise<void> {
    const client = await this.dbPool.connect();
    
    try {
      await client.query('BEGIN');

      // Insert or update the persisted query in the database
      await client.query(
        `INSERT INTO persisted_queries (hash, query, tenant_id)
         VALUES ($1, $2, $3)
         ON CONFLICT (hash) 
         DO UPDATE SET query = EXCLUDED.query, tenant_id = EXCLUDED.tenant_id, updated_at = CURRENT_TIMESTAMP`,
        [hash, query, tenantId]
      );

      await client.query('COMMIT');

      // Update cache
      const cacheKey = this.createPersistedQueryCacheKey(hash, tenantId);
      await this.set(cacheKey, { query }, { ttl: 3600 });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}