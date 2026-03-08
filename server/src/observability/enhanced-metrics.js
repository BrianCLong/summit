"use strict";
// @ts-nocheck
/**
 * Enhanced Observability Metrics
 * Additional metrics for database connection pools, cache performance, and service health
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.eventLoopUtilization = exports.heapFragmentation = exports.queueJobWaitTime = exports.queueJobDuration = exports.queueJobsFailed = exports.queueJobsCompleted = exports.queueJobsActive = exports.queueJobsWaiting = exports.websocketConnectionDuration = exports.websocketLatency = exports.websocketMessageSize = exports.graphqlCacheUtilization = exports.graphqlFieldResolutionCount = exports.graphqlOperationComplexity = exports.serviceResponseTime = exports.serviceErrors = exports.neo4jResultSize = exports.neo4jTransactionDuration = exports.neo4jSessionsActive = exports.redisKeySize = exports.redisCommandsTotal = exports.redisConnectionsActive = exports.redisOperationDuration = exports.redisCacheHitRatio = exports.redisCacheMisses = exports.redisCacheHits = exports.dbConnectionErrors = exports.dbConnectionAcquisitionDuration = exports.dbConnectionPoolSize = exports.dbConnectionPoolWaiting = exports.dbConnectionPoolIdle = exports.dbConnectionPoolActive = void 0;
exports.updateCacheHitRatio = updateCacheHitRatio;
exports.recordDbPoolStats = recordDbPoolStats;
exports.recordServiceError = recordServiceError;
const prom_client_1 = require("prom-client");
const metrics_js_1 = require("../monitoring/metrics.js");
// ============================================================================
// DATABASE CONNECTION POOL METRICS
// ============================================================================
exports.dbConnectionPoolActive = new prom_client_1.Gauge({
    name: 'db_connection_pool_active',
    help: 'Number of active database connections in the pool',
    labelNames: ['database', 'pool'],
    registers: [metrics_js_1.registry],
});
exports.dbConnectionPoolIdle = new prom_client_1.Gauge({
    name: 'db_connection_pool_idle',
    help: 'Number of idle database connections in the pool',
    labelNames: ['database', 'pool'],
    registers: [metrics_js_1.registry],
});
exports.dbConnectionPoolWaiting = new prom_client_1.Gauge({
    name: 'db_connection_pool_waiting',
    help: 'Number of queued requests waiting for a database connection',
    labelNames: ['database', 'pool'],
    registers: [metrics_js_1.registry],
});
exports.dbConnectionPoolSize = new prom_client_1.Gauge({
    name: 'db_connection_pool_size',
    help: 'Total size of the database connection pool',
    labelNames: ['database', 'pool'],
    registers: [metrics_js_1.registry],
});
exports.dbConnectionAcquisitionDuration = new prom_client_1.Histogram({
    name: 'db_connection_acquisition_duration_seconds',
    help: 'Time taken to acquire a database connection from the pool',
    labelNames: ['database', 'pool'],
    buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5],
    registers: [metrics_js_1.registry],
});
exports.dbConnectionErrors = new prom_client_1.Counter({
    name: 'db_connection_errors_total',
    help: 'Total number of database connection errors',
    labelNames: ['database', 'pool', 'error_type'],
    registers: [metrics_js_1.registry],
});
// ============================================================================
// REDIS CACHE METRICS
// ============================================================================
exports.redisCacheHits = new prom_client_1.Counter({
    name: 'redis_cache_hits_total',
    help: 'Total number of Redis cache hits',
    labelNames: ['operation', 'cache_name'],
    registers: [metrics_js_1.registry],
});
exports.redisCacheMisses = new prom_client_1.Counter({
    name: 'redis_cache_misses_total',
    help: 'Total number of Redis cache misses',
    labelNames: ['operation', 'cache_name'],
    registers: [metrics_js_1.registry],
});
exports.redisCacheHitRatio = new prom_client_1.Gauge({
    name: 'redis_cache_hit_ratio',
    help: 'Redis cache hit ratio (hits / (hits + misses))',
    labelNames: ['cache_name'],
    registers: [metrics_js_1.registry],
});
exports.redisOperationDuration = new prom_client_1.Histogram({
    name: 'redis_operation_duration_seconds',
    help: 'Duration of Redis operations in seconds',
    labelNames: ['operation', 'status'],
    buckets: [0.001, 0.002, 0.005, 0.01, 0.02, 0.05, 0.1, 0.5, 1],
    registers: [metrics_js_1.registry],
});
exports.redisConnectionsActive = new prom_client_1.Gauge({
    name: 'redis_connections_active',
    help: 'Number of active Redis connections',
    labelNames: ['client_type'],
    registers: [metrics_js_1.registry],
});
exports.redisCommandsTotal = new prom_client_1.Counter({
    name: 'redis_commands_total',
    help: 'Total number of Redis commands executed',
    labelNames: ['command', 'status'],
    registers: [metrics_js_1.registry],
});
exports.redisKeySize = new prom_client_1.Histogram({
    name: 'redis_key_size_bytes',
    help: 'Size of Redis keys in bytes',
    labelNames: ['key_pattern'],
    buckets: [100, 500, 1000, 5000, 10000, 50000, 100000, 500000],
    registers: [metrics_js_1.registry],
});
// ============================================================================
// NEO4J SPECIFIC METRICS
// ============================================================================
exports.neo4jSessionsActive = new prom_client_1.Gauge({
    name: 'neo4j_sessions_active',
    help: 'Number of active Neo4j sessions',
    registers: [metrics_js_1.registry],
});
exports.neo4jTransactionDuration = new prom_client_1.Histogram({
    name: 'neo4j_transaction_duration_seconds',
    help: 'Duration of Neo4j transactions',
    labelNames: ['mode'], // 'read' or 'write'
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10, 30],
    registers: [metrics_js_1.registry],
});
exports.neo4jResultSize = new prom_client_1.Histogram({
    name: 'neo4j_result_size_records',
    help: 'Number of records returned by Neo4j queries',
    labelNames: ['operation'],
    buckets: [1, 10, 50, 100, 500, 1000, 5000, 10000, 50000],
    registers: [metrics_js_1.registry],
});
// ============================================================================
// SERVICE ERROR TRACKING
// ============================================================================
exports.serviceErrors = new prom_client_1.Counter({
    name: 'service_errors_total',
    help: 'Total number of service-level errors',
    labelNames: ['service', 'error_type', 'severity'],
    registers: [metrics_js_1.registry],
});
exports.serviceResponseTime = new prom_client_1.Histogram({
    name: 'service_response_time_seconds',
    help: 'Service method response time in seconds',
    labelNames: ['service', 'method', 'status'],
    buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5],
    registers: [metrics_js_1.registry],
});
// ============================================================================
// GRAPHQL OPERATION METRICS (Enhanced)
// ============================================================================
exports.graphqlOperationComplexity = new prom_client_1.Histogram({
    name: 'graphql_operation_complexity',
    help: 'Complexity score of GraphQL operations',
    labelNames: ['operation', 'operation_type'],
    buckets: [1, 5, 10, 25, 50, 100, 250, 500, 1000],
    registers: [metrics_js_1.registry],
});
exports.graphqlFieldResolutionCount = new prom_client_1.Counter({
    name: 'graphql_field_resolution_count_total',
    help: 'Total number of fields resolved in GraphQL operations',
    labelNames: ['operation'],
    registers: [metrics_js_1.registry],
});
exports.graphqlCacheUtilization = new prom_client_1.Counter({
    name: 'graphql_cache_utilization_total',
    help: 'GraphQL data loader cache utilization',
    labelNames: ['loader', 'cached'],
    registers: [metrics_js_1.registry],
});
// ============================================================================
// WEBSOCKET METRICS (Enhanced)
// ============================================================================
exports.websocketMessageSize = new prom_client_1.Histogram({
    name: 'websocket_message_size_bytes',
    help: 'Size of WebSocket messages in bytes',
    labelNames: ['direction', 'event_type'],
    buckets: [100, 500, 1000, 5000, 10000, 50000, 100000],
    registers: [metrics_js_1.registry],
});
exports.websocketLatency = new prom_client_1.Histogram({
    name: 'websocket_latency_seconds',
    help: 'WebSocket message round-trip latency',
    labelNames: ['event_type'],
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
    registers: [metrics_js_1.registry],
});
exports.websocketConnectionDuration = new prom_client_1.Histogram({
    name: 'websocket_connection_duration_seconds',
    help: 'Duration of WebSocket connections',
    buckets: [10, 30, 60, 300, 600, 1800, 3600, 7200],
    registers: [metrics_js_1.registry],
});
// ============================================================================
// BULLMQ QUEUE METRICS
// ============================================================================
exports.queueJobsWaiting = new prom_client_1.Gauge({
    name: 'queue_jobs_waiting',
    help: 'Number of jobs waiting in queue',
    labelNames: ['queue'],
    registers: [metrics_js_1.registry],
});
exports.queueJobsActive = new prom_client_1.Gauge({
    name: 'queue_jobs_active',
    help: 'Number of jobs currently being processed',
    labelNames: ['queue'],
    registers: [metrics_js_1.registry],
});
exports.queueJobsCompleted = new prom_client_1.Counter({
    name: 'queue_jobs_completed_total',
    help: 'Total number of completed jobs',
    labelNames: ['queue'],
    registers: [metrics_js_1.registry],
});
exports.queueJobsFailed = new prom_client_1.Counter({
    name: 'queue_jobs_failed_total',
    help: 'Total number of failed jobs',
    labelNames: ['queue', 'error_type'],
    registers: [metrics_js_1.registry],
});
exports.queueJobDuration = new prom_client_1.Histogram({
    name: 'queue_job_duration_seconds',
    help: 'Job processing duration in seconds',
    labelNames: ['queue', 'job_type'],
    buckets: [0.1, 0.5, 1, 5, 10, 30, 60, 300, 600],
    registers: [metrics_js_1.registry],
});
exports.queueJobWaitTime = new prom_client_1.Histogram({
    name: 'queue_job_wait_time_seconds',
    help: 'Time jobs spend waiting in queue before processing',
    labelNames: ['queue'],
    buckets: [0.1, 1, 5, 10, 30, 60, 300, 600, 1800],
    registers: [metrics_js_1.registry],
});
// ============================================================================
// MEMORY & RESOURCE METRICS
// ============================================================================
exports.heapFragmentation = new prom_client_1.Gauge({
    name: 'nodejs_heap_fragmentation_ratio',
    help: 'Heap fragmentation ratio (external / heap_used)',
    registers: [metrics_js_1.registry],
});
exports.eventLoopUtilization = new prom_client_1.Gauge({
    name: 'nodejs_eventloop_utilization',
    help: 'Event loop utilization percentage',
    registers: [metrics_js_1.registry],
});
// Update heap fragmentation periodically
if (typeof setInterval !== 'undefined') {
    setInterval(() => {
        const usage = process.memoryUsage();
        const fragmentation = usage.external / usage.heapUsed;
        exports.heapFragmentation.set(fragmentation);
    }, 30000);
}
// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
/**
 * Update cache hit ratio based on hits and misses
 */
function updateCacheHitRatio(cacheName, hits, misses) {
    const total = hits + misses;
    if (total > 0) {
        exports.redisCacheHitRatio.set({ cache_name: cacheName }, hits / total);
    }
}
/**
 * Record database connection pool stats
 */
function recordDbPoolStats(database, pool, stats) {
    exports.dbConnectionPoolSize.set({ database, pool }, stats.total);
    exports.dbConnectionPoolActive.set({ database, pool }, stats.active);
    exports.dbConnectionPoolIdle.set({ database, pool }, stats.idle);
    exports.dbConnectionPoolWaiting.set({ database, pool }, stats.waiting);
}
/**
 * Record service error with context
 */
function recordServiceError(service, errorType, severity = 'error') {
    exports.serviceErrors.inc({ service, error_type: errorType, severity });
}
