"use strict";
/**
 * Persisted GraphQL Queries & CDN Caching Module
 *
 * Implements persistent storage for GraphQL queries and CDN caching for improved performance
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.initGraphQLCaching = exports.registerPersistedQuery = exports.createResponseCacheMiddleware = exports.createPersistedQueryMiddleware = exports.GraphQLCacheManager = exports.PersistedQueryStore = exports.PERSISTED_QUERIES_TABLE_SQL = void 0;
const crypto_js_1 = require("crypto-js");
const logger_js_1 = require("../config/logger.js");
const metrics_js_1 = require("../observability/metrics.js");
const uuid_1 = require("uuid");
// PostgreSQL table creation for persisted queries
exports.PERSISTED_QUERIES_TABLE_SQL = `
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
class PersistedQueryStore {
    pool;
    constructor(pool) {
        this.pool = pool;
    }
    async initialize() {
        // Create the table if it doesn't exist
        await this.pool.query(exports.PERSISTED_QUERIES_TABLE_SQL);
        logger_js_1.logger.info('PersistedQueryStore initialized successfully');
    }
    async saveQuery(query, tenantId, tags) {
        const queryHash = (0, crypto_js_1.SHA256)(query).toString();
        const queryId = (0, uuid_1.v4)();
        const result = await this.pool.query(`INSERT INTO persisted_queries (id, hash, query, tenant_id, tags) 
       VALUES ($1, $2, $3, $4, $5) 
       ON CONFLICT (hash) DO UPDATE SET 
         query = EXCLUDED.query,
         updated_at = CURRENT_TIMESTAMP,
         tags = EXCLUDED.tags
       RETURNING *`, [queryId, queryHash, query, tenantId, tags || []]);
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
    async getQueryByHash(hash) {
        const result = await this.pool.query('SELECT * FROM persisted_queries WHERE hash = $1', [hash]);
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
    async getQueryById(id) {
        const result = await this.pool.query('SELECT * FROM persisted_queries WHERE id = $1', [id]);
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
    async getAllQueriesForTenant(tenantId) {
        const result = await this.pool.query('SELECT * FROM persisted_queries WHERE tenant_id = $1 ORDER BY created_at DESC', [tenantId]);
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
    async deleteQuery(id) {
        const result = await this.pool.query('DELETE FROM persisted_queries WHERE id = $1 RETURNING id', [id]);
        return result.rows.length > 0;
    }
}
exports.PersistedQueryStore = PersistedQueryStore;
// Cache manager for CDN and response caching
class GraphQLCacheManager {
    redis;
    defaultConfig;
    constructor(redis, config) {
        this.redis = redis;
        this.defaultConfig = {
            ttl: 300, // 5 minutes default
            maxSize: 1000,
            enabled: process.env.GRAPHQL_CACHE_ENABLED === 'true',
            compression: process.env.GRAPHQL_CACHE_COMPRESSION === 'true',
            ...config,
        };
    }
    async get(key) {
        if (!this.defaultConfig.enabled) {
            return null;
        }
        try {
            const cached = await this.redis.get(key);
            if (cached) {
                metrics_js_1.metrics.graphqlCacheHits.inc();
                // Decompress if needed
                if (this.defaultConfig.compression) {
                    // In a real implementation, we would decompress the value
                    // For now, we'll just return as JSON
                    return JSON.parse(cached);
                }
                return JSON.parse(cached);
            }
            else {
                metrics_js_1.metrics.graphqlCacheMisses.inc();
            }
        }
        catch (error) {
            logger_js_1.logger.error('Cache get error:', error);
            metrics_js_1.metrics.graphqlCacheErrors.inc();
        }
        return null;
    }
    async set(key, value, config) {
        const effectiveConfig = { ...this.defaultConfig, ...config };
        if (!effectiveConfig.enabled) {
            return false;
        }
        try {
            // Serialize value
            const serialized = JSON.stringify(value);
            // Set with TTL
            await this.redis.setex(key, effectiveConfig.ttl, serialized);
            metrics_js_1.metrics.graphqlCacheSets.inc();
            return true;
        }
        catch (error) {
            logger_js_1.logger.error('Cache set error:', error);
            metrics_js_1.metrics.graphqlCacheErrors.inc();
            return false;
        }
    }
    async invalidate(pattern) {
        try {
            // Find keys matching the pattern
            const keys = await this.redis.keys(pattern);
            if (keys.length > 0) {
                const result = await this.redis.del(...keys);
                logger_js_1.logger.info(`Invalidated ${result} cache entries matching pattern: ${pattern}`);
                return result;
            }
            return 0;
        }
        catch (error) {
            logger_js_1.logger.error('Cache invalidation error:', error);
            return 0;
        }
    }
    // Create cache key for GraphQL responses
    createResponseCacheKey(operationHash, variables, userId, tenantId) {
        const keyParts = ['graphql', 'response', operationHash];
        if (variables) {
            // Create a deterministic hash of variables
            const varHash = (0, crypto_js_1.SHA256)(JSON.stringify(variables)).toString().substring(0, 16);
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
    createPersistedQueryCacheKey(hash, tenantId) {
        const keyParts = ['graphql', 'persisted', hash];
        if (tenantId) {
            keyParts.push(`tenant:${tenantId}`);
        }
        return keyParts.join(':');
    }
}
exports.GraphQLCacheManager = GraphQLCacheManager;
// Middleware for handling persisted queries
const createPersistedQueryMiddleware = (queryStore, cacheManager) => {
    return async (req, res, next) => {
        try {
            const startTime = Date.now();
            const tenantId = req.headers['x-tenant-id'] || 'default';
            const userId = req.user?.id || 'anonymous';
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
                logger_js_1.logger.debug('Served persisted query', {
                    operationHash: sha256Hash,
                    queryId: persistedQuery.id,
                    tenantId,
                    userId
                });
            }
            // Continue to next middleware
            next();
        }
        catch (error) {
            logger_js_1.logger.error('Persisted query middleware error:', error);
            return res.status(500).json({
                errors: [{ message: 'Internal server error' }]
            });
        }
    };
};
exports.createPersistedQueryMiddleware = createPersistedQueryMiddleware;
// Middleware for GraphQL response caching
const createResponseCacheMiddleware = (cacheManager, options = {}) => {
    const { shouldCacheResult, cacheKeyFn } = options;
    return async (req, res, next) => {
        if (req.method !== 'POST' || !req.body) {
            return next();
        }
        const tenantId = req.headers['x-tenant-id'] || 'default';
        const userId = req.user?.id || 'anonymous';
        const operationName = req.body.operationName || 'anonymous';
        // For mutations, never cache
        if (req.body.query && req.body.query.includes('mutation')) {
            return next();
        }
        // Generate cache key
        let cacheKey;
        if (cacheKeyFn) {
            cacheKey = cacheKeyFn(req);
        }
        else {
            const operationHash = (0, crypto_js_1.SHA256)(req.body.query || '').toString().substring(0, 16);
            cacheKey = `graphql:response:${operationHash}:${operationName}`;
            // Add variable hash if variables are present
            if (req.body.variables) {
                const varHash = (0, crypto_js_1.SHA256)(JSON.stringify(req.body.variables)).toString().substring(0, 16);
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
            logger_js_1.logger.debug('Served GraphQL response from cache', {
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
        res.json = (data) => {
            // Determine if we should cache this result
            const shouldCache = !shouldCacheResult || shouldCacheResult(req, data);
            if (shouldCache && data && typeof data === 'object') {
                // Cache the response
                cacheManager.set(cacheKey, data, {
                    ttl: req.cacheTtl || 300 // Default 5 minutes
                }).then(success => {
                    if (success) {
                        logger_js_1.logger.debug('Cached GraphQL response', {
                            cacheKey,
                            operationName,
                            tenantId,
                            userId,
                            dataLength: JSON.stringify(data).length
                        });
                    }
                }).catch(err => {
                    logger_js_1.logger.error('Failed to cache GraphQL response:', err);
                });
            }
            res.set('X-Cache', 'MISS');
            res.set('X-Cache-Key', cacheKey);
            return originalJson(data);
        };
        next();
    };
};
exports.createResponseCacheMiddleware = createResponseCacheMiddleware;
// Helper function to register a persisted query
const registerPersistedQuery = async (queryStore, query, tenantId, tags) => {
    const persisted = await queryStore.saveQuery(query, tenantId, tags);
    logger_js_1.logger.info('Registered persisted query', {
        queryId: persisted.id,
        operationHash: persisted.hash,
        tenantId,
        tags
    });
    return persisted.id;
};
exports.registerPersistedQuery = registerPersistedQuery;
// Initialize the GraphQL caching system
const initGraphQLCaching = async (pool, redis, config) => {
    const queryStore = new PersistedQueryStore(pool);
    const cacheManager = new GraphQLCacheManager(redis, config);
    await queryStore.initialize();
    const persistedQueryMiddleware = (0, exports.createPersistedQueryMiddleware)(queryStore, cacheManager);
    const responseCacheMiddleware = (0, exports.createResponseCacheMiddleware)(cacheManager);
    logger_js_1.logger.info('GraphQL caching system initialized');
    return {
        queryStore,
        cacheManager,
        persistedQueryMiddleware,
        responseCacheMiddleware
    };
};
exports.initGraphQLCaching = initGraphQLCaching;
