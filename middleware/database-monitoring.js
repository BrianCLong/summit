"use strict";
/**
 * Database Monitoring and Performance Metrics
 *
 * Tracks:
 * - Query performance metrics
 * - Connection pool utilization
 * - Cache hit/miss rates
 * - Slow query detection
 * - Resource usage trends
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.databaseHealthMonitor = exports.DatabaseHealthMonitor = exports.CachePerformanceMonitor = exports.QueryPerformanceTracker = exports.PostgresPoolMonitor = exports.dataLoaderCacheHitRate = exports.dataLoaderBatchSize = exports.redisConnectionsActive = exports.redisCacheSize = exports.redisCacheHitRate = exports.redisCacheMisses = exports.redisCacheHits = exports.neo4jSlowQueryTotal = exports.neo4jQueryTotal = exports.neo4jQueryDuration = exports.postgresPoolWaiting = exports.postgresPoolIdle = exports.postgresPoolSize = exports.postgresSlowQueryTotal = exports.postgresQueryTotal = exports.postgresQueryDuration = void 0;
exports.createQueryTrackingMiddleware = createQueryTrackingMiddleware;
exports.handleHealthCheck = handleHealthCheck;
const pino_1 = __importDefault(require("pino"));
const prom_client_1 = require("prom-client");
const logger = (0, pino_1.default)();
/**
 * Prometheus metrics for database monitoring
 */
// PostgreSQL metrics
exports.postgresQueryDuration = new prom_client_1.Histogram({
    name: 'postgres_query_duration_seconds',
    help: 'Duration of PostgreSQL queries in seconds',
    labelNames: ['query_type', 'table', 'operation'],
    buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5, 10],
});
exports.postgresQueryTotal = new prom_client_1.Counter({
    name: 'postgres_query_total',
    help: 'Total number of PostgreSQL queries executed',
    labelNames: ['query_type', 'table', 'operation', 'status'],
});
exports.postgresSlowQueryTotal = new prom_client_1.Counter({
    name: 'postgres_slow_query_total',
    help: 'Total number of slow PostgreSQL queries (>100ms)',
    labelNames: ['query_type', 'table'],
});
exports.postgresPoolSize = new prom_client_1.Gauge({
    name: 'postgres_pool_size',
    help: 'Current size of PostgreSQL connection pool',
    labelNames: ['pool_type'],
});
exports.postgresPoolIdle = new prom_client_1.Gauge({
    name: 'postgres_pool_idle',
    help: 'Number of idle connections in PostgreSQL pool',
    labelNames: ['pool_type'],
});
exports.postgresPoolWaiting = new prom_client_1.Gauge({
    name: 'postgres_pool_waiting',
    help: 'Number of clients waiting for PostgreSQL connection',
    labelNames: ['pool_type'],
});
// Neo4j metrics
exports.neo4jQueryDuration = new prom_client_1.Histogram({
    name: 'neo4j_query_duration_seconds',
    help: 'Duration of Neo4j queries in seconds',
    labelNames: ['operation', 'label'],
    buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5, 10],
});
exports.neo4jQueryTotal = new prom_client_1.Counter({
    name: 'neo4j_query_total',
    help: 'Total number of Neo4j queries executed',
    labelNames: ['operation', 'label', 'status'],
});
exports.neo4jSlowQueryTotal = new prom_client_1.Counter({
    name: 'neo4j_slow_query_total',
    help: 'Total number of slow Neo4j queries (>100ms)',
    labelNames: ['operation'],
});
// Redis cache metrics
exports.redisCacheHits = new prom_client_1.Counter({
    name: 'redis_cache_hits_total',
    help: 'Total number of Redis cache hits',
    labelNames: ['cache_type', 'tenant_id'],
});
exports.redisCacheMisses = new prom_client_1.Counter({
    name: 'redis_cache_misses_total',
    help: 'Total number of Redis cache misses',
    labelNames: ['cache_type', 'tenant_id'],
});
exports.redisCacheHitRate = new prom_client_1.Gauge({
    name: 'redis_cache_hit_rate',
    help: 'Redis cache hit rate (0-1)',
    labelNames: ['cache_type'],
});
exports.redisCacheSize = new prom_client_1.Gauge({
    name: 'redis_cache_size_bytes',
    help: 'Estimated size of Redis cache in bytes',
    labelNames: ['cache_type'],
});
exports.redisConnectionsActive = new prom_client_1.Gauge({
    name: 'redis_connections_active',
    help: 'Number of active Redis connections',
});
// DataLoader metrics
exports.dataLoaderBatchSize = new prom_client_1.Histogram({
    name: 'dataloader_batch_size',
    help: 'Size of DataLoader batches',
    labelNames: ['loader_type'],
    buckets: [1, 5, 10, 25, 50, 100, 250, 500],
});
exports.dataLoaderCacheHitRate = new prom_client_1.Gauge({
    name: 'dataloader_cache_hit_rate',
    help: 'DataLoader cache hit rate (0-1)',
    labelNames: ['loader_type'],
});
/**
 * PostgreSQL Pool Monitor
 */
class PostgresPoolMonitor {
    pool;
    poolType;
    intervalId;
    constructor(pool, poolType = 'default') {
        this.pool = pool;
        this.poolType = poolType;
    }
    /**
     * Start monitoring pool metrics
     */
    startMonitoring(intervalMs = 10000) {
        this.intervalId = setInterval(() => {
            this.recordMetrics();
        }, intervalMs);
    }
    /**
     * Stop monitoring
     */
    stopMonitoring() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = undefined;
        }
    }
    /**
     * Record current pool metrics
     */
    recordMetrics() {
        try {
            const stats = {
                total: this.pool.totalCount,
                idle: this.pool.idleCount,
                waiting: this.pool.waitingCount,
            };
            exports.postgresPoolSize.set({ pool_type: this.poolType }, stats.total);
            exports.postgresPoolIdle.set({ pool_type: this.poolType }, stats.idle);
            exports.postgresPoolWaiting.set({ pool_type: this.poolType }, stats.waiting);
            const utilization = stats.total > 0 ? (stats.total - stats.idle) / stats.total : 0;
            logger.debug({
                msg: 'PostgreSQL pool metrics',
                poolType: this.poolType,
                ...stats,
                utilization: utilization.toFixed(2),
            });
            // Alert if pool is heavily utilized
            if (utilization > 0.9) {
                logger.warn({
                    msg: 'PostgreSQL pool heavily utilized',
                    poolType: this.poolType,
                    utilization: utilization.toFixed(2),
                    stats,
                });
            }
            // Alert if clients are waiting
            if (stats.waiting > 0) {
                logger.warn({
                    msg: 'Clients waiting for PostgreSQL connections',
                    poolType: this.poolType,
                    waiting: stats.waiting,
                });
            }
        }
        catch (error) {
            logger.error('Failed to record PostgreSQL pool metrics:', error);
        }
    }
    /**
     * Get current pool statistics
     */
    getStats() {
        return {
            total: this.pool.totalCount,
            idle: this.pool.idleCount,
            waiting: this.pool.waitingCount,
            utilization: this.pool.totalCount > 0
                ? (this.pool.totalCount - this.pool.idleCount) / this.pool.totalCount
                : 0,
        };
    }
}
exports.PostgresPoolMonitor = PostgresPoolMonitor;
/**
 * Query Performance Tracker
 */
class QueryPerformanceTracker {
    slowQueries;
    slowQueryThreshold;
    constructor(slowQueryThreshold = 100) {
        this.slowQueries = new Map();
        this.slowQueryThreshold = slowQueryThreshold;
    }
    /**
     * Track query execution
     */
    trackQuery(database, query, duration, metadata = {}) {
        const { queryType = 'unknown', table = 'unknown', operation = 'unknown', status = 'success', } = metadata;
        // Record metrics
        if (database === 'postgres') {
            exports.postgresQueryDuration.observe({ query_type: queryType, table, operation }, duration / 1000);
            exports.postgresQueryTotal.inc({ query_type: queryType, table, operation, status });
            if (duration > this.slowQueryThreshold) {
                exports.postgresSlowQueryTotal.inc({ query_type: queryType, table });
                this.recordSlowQuery(query, duration);
            }
        }
        else if (database === 'neo4j') {
            exports.neo4jQueryDuration.observe({ operation, label: table }, duration / 1000);
            exports.neo4jQueryTotal.inc({ operation, label: table, status });
            if (duration > this.slowQueryThreshold) {
                exports.neo4jSlowQueryTotal.inc({ operation });
                this.recordSlowQuery(query, duration);
            }
        }
        // Log slow queries
        if (duration > this.slowQueryThreshold) {
            logger.warn({
                msg: 'Slow query detected',
                database,
                query: query.substring(0, 200),
                duration,
                threshold: this.slowQueryThreshold,
                ...metadata,
            });
        }
    }
    /**
     * Record slow query for analysis
     */
    recordSlowQuery(query, duration) {
        const normalizedQuery = this.normalizeQuery(query);
        const existing = this.slowQueries.get(normalizedQuery);
        if (existing) {
            existing.count++;
            existing.totalTime += duration;
            existing.maxTime = Math.max(existing.maxTime, duration);
        }
        else {
            this.slowQueries.set(normalizedQuery, {
                count: 1,
                totalTime: duration,
                maxTime: duration,
            });
        }
        // Keep only top 100 slow queries
        if (this.slowQueries.size > 100) {
            const entries = Array.from(this.slowQueries.entries());
            entries.sort((a, b) => b[1].totalTime - a[1].totalTime);
            this.slowQueries = new Map(entries.slice(0, 100));
        }
    }
    /**
     * Normalize query for grouping
     */
    normalizeQuery(query) {
        return query
            .replace(/\s+/g, ' ')
            .replace(/\$\d+/g, '$N')
            .replace(/['"][^'"]*['"]/g, '?')
            .substring(0, 200);
    }
    /**
     * Get slow query report
     */
    getSlowQueryReport(limit = 10) {
        const entries = Array.from(this.slowQueries.entries());
        entries.sort((a, b) => b[1].totalTime - a[1].totalTime);
        return entries.slice(0, limit).map(([query, stats]) => ({
            query,
            count: stats.count,
            totalTime: stats.totalTime,
            avgTime: stats.totalTime / stats.count,
            maxTime: stats.maxTime,
        }));
    }
    /**
     * Clear slow query history
     */
    clearSlowQueries() {
        this.slowQueries.clear();
    }
}
exports.QueryPerformanceTracker = QueryPerformanceTracker;
/**
 * Cache Performance Monitor
 */
class CachePerformanceMonitor {
    stats;
    constructor() {
        this.stats = new Map();
    }
    /**
     * Record cache hit
     */
    recordHit(cacheType, tenantId) {
        exports.redisCacheHits.inc({ cache_type: cacheType, tenant_id: tenantId || 'global' });
        this.updateStats(cacheType, 'hit');
    }
    /**
     * Record cache miss
     */
    recordMiss(cacheType, tenantId) {
        exports.redisCacheMisses.inc({ cache_type: cacheType, tenant_id: tenantId || 'global' });
        this.updateStats(cacheType, 'miss');
    }
    /**
     * Update internal statistics
     */
    updateStats(cacheType, result) {
        if (!this.stats.has(cacheType)) {
            this.stats.set(cacheType, { hits: 0, misses: 0 });
        }
        const stats = this.stats.get(cacheType);
        if (!stats) {
            // This should not happen if the initialization worked correctly
            throw new Error(`Stats not initialized for cache type: ${cacheType}`);
        }
        if (result === 'hit') {
            stats.hits++;
        }
        else {
            stats.misses++;
        }
        // Update hit rate gauge
        const total = stats.hits + stats.misses;
        const hitRate = total > 0 ? stats.hits / total : 0;
        exports.redisCacheHitRate.set({ cache_type: cacheType }, hitRate);
    }
    /**
     * Get cache statistics
     */
    getStats(cacheType) {
        if (cacheType) {
            const stats = this.stats.get(cacheType);
            if (!stats) {
                return null;
            }
            const total = stats.hits + stats.misses;
            return {
                hits: stats.hits,
                misses: stats.misses,
                total,
                hitRate: total > 0 ? stats.hits / total : 0,
            };
        }
        // Return all stats
        const result = {};
        for (const [type, stats] of this.stats.entries()) {
            const total = stats.hits + stats.misses;
            result[type] = {
                hits: stats.hits,
                misses: stats.misses,
                total,
                hitRate: total > 0 ? stats.hits / total : 0,
            };
        }
        return result;
    }
    /**
     * Reset statistics
     */
    resetStats() {
        this.stats.clear();
    }
}
exports.CachePerformanceMonitor = CachePerformanceMonitor;
/**
 * Database Health Monitor
 */
class DatabaseHealthMonitor {
    postgresMonitor;
    queryTracker;
    cacheMonitor;
    constructor() {
        this.queryTracker = new QueryPerformanceTracker(100);
        this.cacheMonitor = new CachePerformanceMonitor();
    }
    /**
     * Monitor PostgreSQL pool
     */
    monitorPostgresPool(pool, poolType = 'default') {
        this.postgresMonitor = new PostgresPoolMonitor(pool, poolType);
        this.postgresMonitor.startMonitoring(10000);
    }
    /**
     * Get query tracker
     */
    getQueryTracker() {
        return this.queryTracker;
    }
    /**
     * Get cache monitor
     */
    getCacheMonitor() {
        return this.cacheMonitor;
    }
    /**
     * Get comprehensive health report
     */
    getHealthReport() {
        return {
            postgres: {
                pool: this.postgresMonitor?.getStats(),
                slowQueries: this.queryTracker.getSlowQueryReport(10),
            },
            cache: this.cacheMonitor.getStats(),
            timestamp: new Date().toISOString(),
        };
    }
    /**
     * Stop all monitoring
     */
    stop() {
        this.postgresMonitor?.stopMonitoring();
    }
}
exports.DatabaseHealthMonitor = DatabaseHealthMonitor;
/**
 * Create and export singleton instance
 */
exports.databaseHealthMonitor = new DatabaseHealthMonitor();
/**
 * Express middleware for query tracking
 */
function createQueryTrackingMiddleware() {
    return (req, res, next) => {
        // Attach query tracker to request context
        req.queryTracker = exports.databaseHealthMonitor.getQueryTracker();
        req.cacheMonitor = exports.databaseHealthMonitor.getCacheMonitor();
        next();
    };
}
/**
 * Health check endpoint handler
 */
function handleHealthCheck(req, res) {
    try {
        const report = exports.databaseHealthMonitor.getHealthReport();
        res.status(200).json({
            status: 'healthy',
            ...report,
        });
    }
    catch (error) {
        logger.error('Health check failed:', error);
        res.status(500).json({
            status: 'unhealthy',
            error: error.message,
        });
    }
}
exports.default = {
    PostgresPoolMonitor,
    QueryPerformanceTracker,
    CachePerformanceMonitor,
    DatabaseHealthMonitor,
    databaseHealthMonitor: exports.databaseHealthMonitor,
    createQueryTrackingMiddleware,
    handleHealthCheck,
};
