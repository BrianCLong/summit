/**
 * Persisted GraphQL Queries & CDN Caching Module
 *
 * Implements persistent storage for GraphQL queries and CDN caching for improved performance
 */

import { Request, Response, NextFunction } from 'express';
import { Redis } from 'ioredis';
import { SHA256 } from 'crypto-js';
import { logger } from '../config/logger.js';
import { metrics } from '../observability/metrics.js';
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';

// Interface for persisted query storage
export interface PersistedQuery {
  id: string;
  hash: string;
  query: string;
  variablesSchema?: string;
  createdAt: Date;
  updatedAt: Date;
  tenantId: string;
  version: number;
  tags?: string[];
}

// Interface for cache configuration
export interface CacheConfig {
  ttl: number; // Time to live in seconds
  maxSize?: number; // Maximum cache size
  enabled: boolean;
  compression?: boolean;
  tags?: string[];
}

// PostgreSQL table creation for persisted queries
export const PERSISTED_QUERIES_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS persisted_queries (
    id VARCHAR(255) PRIMARY KEY,
    hash VARCHAR(255) UNIQUE NOT NULL,
    query TEXT NOT NULL,
    variables_schema JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    tenant_id VARCHAR(255) NOT NULL,
    version INTEGER DEFAULT 1,
    tags TEXT[]
  );

  CREATE INDEX IF NOT EXISTS idx_persisted_queries_hash ON persisted_queries(hash);
  CREATE INDEX IF NOT EXISTS idx_persisted_queries_tenant ON persisted_queries(tenant_id);
  CREATE INDEX IF NOT EXISTS idx_persisted_queries_tags ON persisted_queries USING GIN(tags);
`;

// Class for managing persisted queries in PostgreSQL
export class PersistedQueryStore {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async initialize(): Promise<void> {
    // Create the table if it doesn't exist
    await this.pool.query(PERSISTED_QUERIES_TABLE_SQL);
    logger.info('PersistedQueryStore initialized successfully');
  }

  async saveQuery(query: string, tenantId: string, tags?: string[]): Promise<PersistedQuery> {
    const queryHash = SHA256(query).toString();
    const queryId = uuidv4();

    const result = await this.pool.query(
      `INSERT INTO persisted_queries (id, hash, query, tenant_id, tags)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (hash) DO UPDATE SET
         query = EXCLUDED.query,
         updated_at = CURRENT_TIMESTAMP,
         tags = EXCLUDED.tags
       RETURNING *`,
      [queryId, queryHash, query, tenantId, tags || []]
    );

    const row = result.rows[0];
    return {
      id: row.id,
      hash: row.hash,
      query: row.query,
      variablesSchema: row.variables_schema,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      tenantId: row.tenant_id,
      version: row.version,
      tags: row.tags,
    };
  }

  async getQueryByHash(hash: string): Promise<PersistedQuery | null> {
    const result = await this.pool.query(
      'SELECT * FROM persisted_queries WHERE hash = $1',
      [hash]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      hash: row.hash,
      query: row.query,
      variablesSchema: row.variables_schema,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      tenantId: row.tenant_id,
      version: row.version,
      tags: row.tags,
    };
  }

  async getQueryById(id: string): Promise<PersistedQuery | null> {
    const result = await this.pool.query(
      'SELECT * FROM persisted_queries WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      hash: row.hash,
      query: row.query,
      variablesSchema: row.variables_schema,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      tenantId: row.tenant_id,
      version: row.version,
      tags: row.tags,
    };
  }

  async getAllQueriesForTenant(tenantId: string): Promise<PersistedQuery[]> {
    const result = await this.pool.query(
      'SELECT * FROM persisted_queries WHERE tenant_id = $1 ORDER BY created_at DESC',
      [tenantId]
    );

    return result.rows.map(row => ({
      id: row.id,
      hash: row.hash,
      query: row.query,
      variablesSchema: row.variables_schema,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      tenantId: row.tenant_id,
      version: row.version,
      tags: row.tags,
    }));
  }

  async deleteQuery(id: string): Promise<boolean> {
    const result = await this.pool.query(
      'DELETE FROM persisted_queries WHERE id = $1 RETURNING id',
      [id]
    );

    return result.rows.length > 0;
  }
}

// Cache manager for CDN and response caching
export class GraphQLCacheManager {
  private redis: Redis;
  private defaultConfig: CacheConfig;

  constructor(redis: Redis, config?: Partial<CacheConfig>) {
    this.redis = redis;
    this.defaultConfig = {
      ttl: 300, // 5 minutes default
      maxSize: 1000,
      enabled: process.env.GRAPHQL_CACHE_ENABLED === 'true',
      compression: process.env.GRAPHQL_CACHE_COMPRESSION === 'true',
      ...config,
    };
  }

  async get(key: string): Promise<any | null> {
    if (!this.defaultConfig.enabled) {
      return null;
    }

    try {
      const cached = await this.redis.get(key);

      if (cached) {
        metrics.graphqlCacheHits.inc();

        // Decompress if needed
        if (this.defaultConfig.compression) {
          // In a real implementation, we would decompress the value
          // For now, we'll just return as JSON
          return JSON.parse(cached);
        }

        return JSON.parse(cached);
      } else {
        metrics.graphqlCacheMisses.inc();
      }
    } catch (error) {
      logger.error('Cache get error:', error);
      metrics.graphqlCacheErrors.inc();
    }

    return null;
  }

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
      return true;
    } catch (error) {
      logger.error('Cache set error:', error);
      metrics.graphqlCacheErrors.inc();
      return false;
    }
  }

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

  // Create cache key for GraphQL responses
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
      keyParts.push(varHash);
    }

    if (userId) {
      keyParts.push(`user:${userId}`);
    }

    if (tenantId) {
      keyParts.push(`tenant:${tenantId}`);
    }

    return keyParts.join(':');
  }

  // Create cache key for persisted queries
  createPersistedQueryCacheKey(hash: string, tenantId?: string): string {
    const keyParts = ['graphql', 'persisted', hash];

    if (tenantId) {
      keyParts.push(`tenant:${tenantId}`);
    }

    return keyParts.join(':');
  }
}

// Middleware for handling persisted queries
export const createPersistedQueryMiddleware = (
  queryStore: PersistedQueryStore,
  cacheManager: GraphQLCacheManager
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const startTime = Date.now();
      const tenantId = req.headers['x-tenant-id'] as string || 'default';
      const userId = (req.user as any)?.id || 'anonymous';

      // Handle persisted queries if the request has an operation hash
      if (req.body && req.body.extensions && req.body.extensions.persistedQuery) {
        const { version, sha256Hash } = req.body.extensions.persistedQuery;

        if (version !== 1) {
          return res.status(400).json({
            errors: [{ message: 'Unsupported persisted query version' }]
          });
        }

        // Try to get query from cache first
        const cacheKey = cacheManager.createPersistedQueryCacheKey(sha256Hash, tenantId);
        let persistedQuery = await cacheManager.get(cacheKey);

        if (!persistedQuery) {
          // Not in cache, fetch from database
          persistedQuery = await queryStore.getQueryByHash(sha256Hash);

          if (!persistedQuery) {
            // Query not found, return error
            return res.status(400).json({
              errors: [{ message: 'Persisted query not found' }]
            });
          }

          // Cache the query for future requests
          await cacheManager.set(cacheKey, persistedQuery, { ttl: 3600 }); // 1 hour cache
        }

        // Override the query in the request body with the persisted query
        req.body.query = persistedQuery.query;

        // Log the persisted query hit
        logger.debug('Served persisted query', {
          operationHash: sha256Hash,
          queryId: persistedQuery.id,
          tenantId,
          userId
        });
      }

      // Continue to next middleware
      next();
    } catch (error) {
      logger.error('Persisted query middleware error:', error);
      return res.status(500).json({
        errors: [{ message: 'Internal server error' }]
      });
    }
  };
};

// Middleware for GraphQL response caching
export const createResponseCacheMiddleware = (
  cacheManager: GraphQLCacheManager,
  options: {
    shouldCacheResult?: (req: Request, result: any) => boolean;
    cacheKeyFn?: (req: Request) => string;
  } = {}
) => {
  const { shouldCacheResult, cacheKeyFn } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== 'POST' || !req.body) {
      return next();
    }

    const tenantId = req.headers['x-tenant-id'] as string || 'default';
    const userId = (req.user as any)?.id || 'anonymous';
    const operationName = req.body.operationName || 'anonymous';

    // For mutations, never cache
    if (req.body.query && req.body.query.includes('mutation')) {
      return next();
    }

    // Generate cache key
    let cacheKey: string;
    if (cacheKeyFn) {
      cacheKey = cacheKeyFn(req);
    } else {
      const operationHash = SHA256(req.body.query || '').toString().substring(0, 16);
      cacheKey = `graphql:response:${operationHash}:${operationName}`;

      // Add variable hash if variables are present
      if (req.body.variables) {
        const varHash = SHA256(JSON.stringify(req.body.variables)).toString().substring(0, 16);
        cacheKey += `:${varHash}`;
      }

      // Add context-specific identifiers
      if (tenantId !== 'default') {
        cacheKey += `:tenant:${tenantId}`;
      }

      if (userId !== 'anonymous') {
        cacheKey += `:user:${userId}`;
      }
    }

    // Try to get response from cache
    const cachedResponse = await cacheManager.get(cacheKey);

    if (cachedResponse) {
      logger.debug('Served GraphQL response from cache', {
        cacheKey,
        operationName,
        tenantId,
        userId
      });

      res.set('X-Cache', 'HIT');
      res.set('X-Cache-Key', cacheKey);
      return res.json(cachedResponse);
    }

    // Modify res.json to capture and cache the response
    const originalJson = res.json.bind(res);

    res.json = (data: any) => {
      // Determine if we should cache this result
      const shouldCache = !shouldCacheResult || shouldCacheResult(req, data);

      if (shouldCache && data && typeof data === 'object') {
        // Cache the response
        cacheManager.set(cacheKey, data, {
          ttl: req.cacheTtl || 300 // Default 5 minutes
        }).then(success => {
          if (success) {
            logger.debug('Cached GraphQL response', {
              cacheKey,
              operationName,
              tenantId,
              userId,
              dataLength: JSON.stringify(data).length
            });
          }
        }).catch(err => {
          logger.error('Failed to cache GraphQL response:', err);
        });
      }

      res.set('X-Cache', 'MISS');
      res.set('X-Cache-Key', cacheKey);
      return originalJson(data);
    };

    next();
  };
};

// Helper function to register a persisted query
export const registerPersistedQuery = async (
  queryStore: PersistedQueryStore,
  query: string,
  tenantId: string,
  tags?: string[]
): Promise<string> => {
  const persisted = await queryStore.saveQuery(query, tenantId, tags);
  logger.info('Registered persisted query', {
    queryId: persisted.id,
    operationHash: persisted.hash,
    tenantId,
    tags
  });
  return persisted.id;
};

// Initialize the GraphQL caching system
export const initGraphQLCaching = async (
  pool: Pool,
  redis: Redis,
  config?: Partial<CacheConfig>
): Promise<{
  queryStore: PersistedQueryStore;
  cacheManager: GraphQLCacheManager;
  persistedQueryMiddleware: ReturnType<typeof createPersistedQueryMiddleware>;
  responseCacheMiddleware: ReturnType<typeof createResponseCacheMiddleware>;
}> => {
  const queryStore = new PersistedQueryStore(pool);
  const cacheManager = new GraphQLCacheManager(redis, config);

  await queryStore.initialize();

  const persistedQueryMiddleware = createPersistedQueryMiddleware(queryStore, cacheManager);
  const responseCacheMiddleware = createResponseCacheMiddleware(cacheManager);

  logger.info('GraphQL caching system initialized');

  return {
    queryStore,
    cacheManager,
    persistedQueryMiddleware,
    responseCacheMiddleware
  };
};