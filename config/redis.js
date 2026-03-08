"use strict";
/**
 * Redis Caching Configuration and Strategy
 *
 * This module provides:
 * - GraphQL query result caching (TTL: 5min)
 * - User session caching (TTL: 24h)
 * - Computed graph metrics caching (TTL: 1h)
 * - Cache invalidation on mutations
 * - Cache hit/miss rate monitoring
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisCacheManager = exports.CACHE_PREFIX = exports.CACHE_TTL = void 0;
exports.createRedisCacheManager = createRedisCacheManager;
exports.hashGraphQLQuery = hashGraphQLQuery;
const ioredis_1 = __importDefault(require("ioredis"));
const pino_1 = __importDefault(require("pino"));
const crypto_1 = require("crypto");
const logger = (0, pino_1.default)();
/**
 * Cache TTL constants (in seconds)
 */
exports.CACHE_TTL = {
    GRAPHQL_QUERY: 300, // 5 minutes
    USER_SESSION: 86400, // 24 hours
    GRAPH_METRICS: 3600, // 1 hour
    ENTITY_DATA: 1800, // 30 minutes
    RELATIONSHIP_DATA: 1800, // 30 minutes
    INVESTIGATION_DATA: 600, // 10 minutes
    SHORT_LIVED: 60, // 1 minute
    LONG_LIVED: 604800, // 7 days
};
/**
 * Cache key prefixes for organization
 */
exports.CACHE_PREFIX = {
    GRAPHQL: 'gql',
    SESSION: 'session',
    METRICS: 'metrics',
    ENTITY: 'entity',
    RELATIONSHIP: 'rel',
    INVESTIGATION: 'inv',
    USER: 'user',
    DATALOADER: 'dl',
};
/**
 * Redis Cache Manager with metrics and invalidation
 */
class RedisCacheManager {
    client;
    stats;
    enableMetrics;
    constructor(client, enableMetrics = true) {
        this.client = client;
        this.stats = new Map();
        this.enableMetrics = enableMetrics;
    }
    /**
     * Generate cache key with prefix and tenant isolation
     */
    getCacheKey(prefix, key, tenantId) {
        if (tenantId) {
            return `${prefix}:${tenantId}:${key}`;
        }
        return `${prefix}:${key}`;
    }
    /**
     * Get statistics for a cache prefix
     */
    getStats(prefix) {
        if (!this.stats.has(prefix)) {
            this.stats.set(prefix, {
                hits: 0,
                misses: 0,
                hitRate: 0,
                sets: 0,
                deletes: 0,
                errors: 0,
            });
        }
        const stats = this.stats.get(prefix);
        if (!stats) {
            // This should never happen due to the initialization above
            throw new Error(`Stats not initialized for prefix: ${prefix}`);
        }
        return stats;
    }
    /**
     * Update cache statistics
     */
    updateStats(prefix, operation) {
        if (!this.enableMetrics) {
            return;
        }
        const stats = this.getStats(prefix);
        stats[operation === 'hit' || operation === 'miss' ? `${operation}s` : `${operation}s`]++;
        const total = stats.hits + stats.misses;
        stats.hitRate = total > 0 ? stats.hits / total : 0;
    }
    /**
     * Cache GraphQL query result
     */
    async cacheGraphQLQuery(queryHash, result, tenantId, ttl = exports.CACHE_TTL.GRAPHQL_QUERY) {
        try {
            const key = this.getCacheKey(exports.CACHE_PREFIX.GRAPHQL, queryHash, tenantId);
            await this.client.setex(key, ttl, JSON.stringify(result));
            this.updateStats(exports.CACHE_PREFIX.GRAPHQL, 'set');
        }
        catch (error) {
            logger.error('Failed to cache GraphQL query:', error);
            this.updateStats(exports.CACHE_PREFIX.GRAPHQL, 'error');
        }
    }
    /**
     * Get cached GraphQL query result
     */
    async getGraphQLQuery(queryHash, tenantId) {
        try {
            const key = this.getCacheKey(exports.CACHE_PREFIX.GRAPHQL, queryHash, tenantId);
            const cached = await this.client.get(key);
            if (cached) {
                this.updateStats(exports.CACHE_PREFIX.GRAPHQL, 'hit');
                return JSON.parse(cached);
            }
            this.updateStats(exports.CACHE_PREFIX.GRAPHQL, 'miss');
            return null;
        }
        catch (error) {
            logger.error('Failed to get cached GraphQL query:', error);
            this.updateStats(exports.CACHE_PREFIX.GRAPHQL, 'error');
            return null;
        }
    }
    /**
     * Invalidate all GraphQL query caches (call on mutations)
     */
    async invalidateGraphQLQueries(tenantId) {
        try {
            const pattern = tenantId
                ? `${exports.CACHE_PREFIX.GRAPHQL}:${tenantId}:*`
                : `${exports.CACHE_PREFIX.GRAPHQL}:*`;
            await this.deleteByPattern(pattern);
            logger.info(`Invalidated GraphQL caches for pattern: ${pattern}`);
        }
        catch (error) {
            logger.error('Failed to invalidate GraphQL caches:', error);
        }
    }
    /**
     * Cache user session
     */
    async cacheUserSession(sessionId, sessionData, ttl = exports.CACHE_TTL.USER_SESSION) {
        try {
            const key = this.getCacheKey(exports.CACHE_PREFIX.SESSION, sessionId);
            await this.client.setex(key, ttl, JSON.stringify(sessionData));
            this.updateStats(exports.CACHE_PREFIX.SESSION, 'set');
        }
        catch (error) {
            logger.error('Failed to cache user session:', error);
            this.updateStats(exports.CACHE_PREFIX.SESSION, 'error');
        }
    }
    /**
     * Get cached user session
     */
    async getUserSession(sessionId) {
        try {
            const key = this.getCacheKey(exports.CACHE_PREFIX.SESSION, sessionId);
            const cached = await this.client.get(key);
            if (cached) {
                this.updateStats(exports.CACHE_PREFIX.SESSION, 'hit');
                return JSON.parse(cached);
            }
            this.updateStats(exports.CACHE_PREFIX.SESSION, 'miss');
            return null;
        }
        catch (error) {
            logger.error('Failed to get cached user session:', error);
            this.updateStats(exports.CACHE_PREFIX.SESSION, 'error');
            return null;
        }
    }
    /**
     * Delete user session
     */
    async deleteUserSession(sessionId) {
        try {
            const key = this.getCacheKey(exports.CACHE_PREFIX.SESSION, sessionId);
            await this.client.del(key);
            this.updateStats(exports.CACHE_PREFIX.SESSION, 'delete');
        }
        catch (error) {
            logger.error('Failed to delete user session:', error);
            this.updateStats(exports.CACHE_PREFIX.SESSION, 'error');
        }
    }
    /**
     * Cache computed graph metrics
     */
    async cacheGraphMetrics(metricName, metricData, tenantId, ttl = exports.CACHE_TTL.GRAPH_METRICS) {
        try {
            const key = this.getCacheKey(exports.CACHE_PREFIX.METRICS, metricName, tenantId);
            await this.client.setex(key, ttl, JSON.stringify(metricData));
            this.updateStats(exports.CACHE_PREFIX.METRICS, 'set');
        }
        catch (error) {
            logger.error('Failed to cache graph metrics:', error);
            this.updateStats(exports.CACHE_PREFIX.METRICS, 'error');
        }
    }
    /**
     * Get cached graph metrics
     */
    async getGraphMetrics(metricName, tenantId) {
        try {
            const key = this.getCacheKey(exports.CACHE_PREFIX.METRICS, metricName, tenantId);
            const cached = await this.client.get(key);
            if (cached) {
                this.updateStats(exports.CACHE_PREFIX.METRICS, 'hit');
                return JSON.parse(cached);
            }
            this.updateStats(exports.CACHE_PREFIX.METRICS, 'miss');
            return null;
        }
        catch (error) {
            logger.error('Failed to get cached graph metrics:', error);
            this.updateStats(exports.CACHE_PREFIX.METRICS, 'error');
            return null;
        }
    }
    /**
     * Invalidate graph metrics cache
     */
    async invalidateGraphMetrics(tenantId) {
        try {
            const pattern = tenantId
                ? `${exports.CACHE_PREFIX.METRICS}:${tenantId}:*`
                : `${exports.CACHE_PREFIX.METRICS}:*`;
            await this.deleteByPattern(pattern);
            logger.info(`Invalidated graph metrics for pattern: ${pattern}`);
        }
        catch (error) {
            logger.error('Failed to invalidate graph metrics:', error);
        }
    }
    /**
     * Generic cache get
     */
    async get(prefix, key, tenantId) {
        try {
            const cacheKey = this.getCacheKey(prefix, key, tenantId);
            const cached = await this.client.get(cacheKey);
            if (cached) {
                this.updateStats(prefix, 'hit');
                return JSON.parse(cached);
            }
            this.updateStats(prefix, 'miss');
            return null;
        }
        catch (error) {
            logger.error(`Failed to get cached value for ${prefix}:${key}:`, error);
            this.updateStats(prefix, 'error');
            return null;
        }
    }
    /**
     * Generic cache set
     */
    async set(prefix, key, value, tenantId, ttl) {
        try {
            const cacheKey = this.getCacheKey(prefix, key, tenantId);
            if (ttl) {
                await this.client.setex(cacheKey, ttl, JSON.stringify(value));
            }
            else {
                await this.client.set(cacheKey, JSON.stringify(value));
            }
            this.updateStats(prefix, 'set');
        }
        catch (error) {
            logger.error(`Failed to cache value for ${prefix}:${key}:`, error);
            this.updateStats(prefix, 'error');
        }
    }
    /**
     * Generic cache delete
     */
    async delete(prefix, key, tenantId) {
        try {
            const cacheKey = this.getCacheKey(prefix, key, tenantId);
            await this.client.del(cacheKey);
            this.updateStats(prefix, 'delete');
        }
        catch (error) {
            logger.error(`Failed to delete cache for ${prefix}:${key}:`, error);
            this.updateStats(prefix, 'error');
        }
    }
    /**
     * Delete keys by pattern (using SCAN for safety)
     */
    async deleteByPattern(pattern) {
        let cursor = '0';
        let deletedCount = 0;
        try {
            do {
                const [newCursor, keys] = await this.client.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
                cursor = newCursor;
                if (keys.length > 0) {
                    await this.client.del(...keys);
                    deletedCount += keys.length;
                }
            } while (cursor !== '0');
            return deletedCount;
        }
        catch (error) {
            logger.error(`Failed to delete by pattern ${pattern}:`, error);
            return deletedCount;
        }
    }
    /**
     * Cache with TTL and automatic fetch on miss
     */
    async cacheAside(prefix, key, fetcher, ttl, tenantId) {
        // Try cache first
        const cached = await this.get(prefix, key, tenantId);
        if (cached !== null) {
            return cached;
        }
        // Cache miss - fetch and cache
        const value = await fetcher();
        await this.set(prefix, key, value, tenantId, ttl);
        return value;
    }
    /**
     * Invalidate all caches related to an entity (called on mutation)
     */
    async invalidateEntity(entityId, tenantId) {
        try {
            // Invalidate entity cache
            await this.delete(exports.CACHE_PREFIX.ENTITY, entityId, tenantId);
            // Invalidate related GraphQL queries
            await this.invalidateGraphQLQueries(tenantId);
            // Invalidate metrics that might include this entity
            await this.invalidateGraphMetrics(tenantId);
            logger.info(`Invalidated caches for entity: ${entityId}`);
        }
        catch (error) {
            logger.error(`Failed to invalidate entity caches for ${entityId}:`, error);
        }
    }
    /**
     * Invalidate all caches related to a relationship (called on mutation)
     */
    async invalidateRelationship(relationshipId, tenantId) {
        try {
            // Invalidate relationship cache
            await this.delete(exports.CACHE_PREFIX.RELATIONSHIP, relationshipId, tenantId);
            // Invalidate related GraphQL queries
            await this.invalidateGraphQLQueries(tenantId);
            // Invalidate metrics
            await this.invalidateGraphMetrics(tenantId);
            logger.info(`Invalidated caches for relationship: ${relationshipId}`);
        }
        catch (error) {
            logger.error(`Failed to invalidate relationship caches for ${relationshipId}:`, error);
        }
    }
    /**
     * Invalidate all caches on mutation
     */
    async invalidateOnMutation(mutationType, id, tenantId) {
        switch (mutationType) {
            case 'entity':
                await this.invalidateEntity(id, tenantId);
                break;
            case 'relationship':
                await this.invalidateRelationship(id, tenantId);
                break;
            case 'investigation':
                await this.delete(exports.CACHE_PREFIX.INVESTIGATION, id, tenantId);
                await this.invalidateGraphQLQueries(tenantId);
                break;
        }
    }
    /**
     * Get all cache statistics
     */
    getAllStats() {
        return new Map(this.stats);
    }
    /**
     * Get statistics for a specific cache prefix
     */
    getStatsForPrefix(prefix) {
        return this.getStats(prefix);
    }
    /**
     * Reset all statistics
     */
    resetStats() {
        this.stats.clear();
    }
    /**
     * Get cache hit rate summary
     */
    getCacheHitRateSummary() {
        const summary = {
            overall: { hits: 0, misses: 0, hitRate: 0 },
            byPrefix: {},
        };
        for (const [prefix, stats] of this.stats.entries()) {
            summary.overall.hits += stats.hits;
            summary.overall.misses += stats.misses;
            summary.byPrefix[prefix] = {
                hits: stats.hits,
                misses: stats.misses,
                hitRate: stats.hitRate,
                sets: stats.sets,
            };
        }
        const total = summary.overall.hits + summary.overall.misses;
        summary.overall.hitRate = total > 0 ? summary.overall.hits / total : 0;
        return summary;
    }
}
exports.RedisCacheManager = RedisCacheManager;
/**
 * Create Redis cache manager instance
 */
function createRedisCacheManager(config) {
    const client = new ioredis_1.default({
        host: config.host,
        port: config.port,
        password: config.password,
        db: config.db ?? 0,
        keyPrefix: config.keyPrefix ?? 'intelgraph:',
        retryStrategy: (times) => {
            const delay = Math.min(times * 50, 2000);
            return delay;
        },
        maxRetriesPerRequest: 3,
        lazyConnect: true,
    });
    return new RedisCacheManager(client, config.enableMetrics ?? true);
}
/**
 * GraphQL query hash generator for caching
 */
function hashGraphQLQuery(query, variables) {
    const content = query + JSON.stringify(variables || {});
    return (0, crypto_1.createHash)('sha256').update(content).digest('hex');
}
exports.default = {
    RedisCacheManager,
    createRedisCacheManager,
    hashGraphQLQuery,
    CACHE_TTL: exports.CACHE_TTL,
    CACHE_PREFIX: exports.CACHE_PREFIX,
};
