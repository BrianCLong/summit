/**
 * Enhanced Observability Metrics
 * Additional metrics for database connection pools, cache performance, and service health
 */

import { Counter, Gauge, Histogram, Registry } from 'prom-client';
import { registry } from '../monitoring/metrics.js';

// ============================================================================
// DATABASE CONNECTION POOL METRICS
// ============================================================================

export const dbConnectionPoolActive = new Gauge({
  name: 'db_connection_pool_active',
  help: 'Number of active database connections in the pool',
  labelNames: ['database', 'pool'] as const,
  registers: [registry],
});

export const dbConnectionPoolIdle = new Gauge({
  name: 'db_connection_pool_idle',
  help: 'Number of idle database connections in the pool',
  labelNames: ['database', 'pool'] as const,
  registers: [registry],
});

export const dbConnectionPoolWaiting = new Gauge({
  name: 'db_connection_pool_waiting',
  help: 'Number of queued requests waiting for a database connection',
  labelNames: ['database', 'pool'] as const,
  registers: [registry],
});

export const dbConnectionPoolSize = new Gauge({
  name: 'db_connection_pool_size',
  help: 'Total size of the database connection pool',
  labelNames: ['database', 'pool'] as const,
  registers: [registry],
});

export const dbConnectionAcquisitionDuration = new Histogram({
  name: 'db_connection_acquisition_duration_seconds',
  help: 'Time taken to acquire a database connection from the pool',
  labelNames: ['database', 'pool'] as const,
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5],
  registers: [registry],
});

export const dbConnectionErrors = new Counter({
  name: 'db_connection_errors_total',
  help: 'Total number of database connection errors',
  labelNames: ['database', 'pool', 'error_type'] as const,
  registers: [registry],
});

// ============================================================================
// REDIS CACHE METRICS
// ============================================================================

export const redisCacheHits = new Counter({
  name: 'redis_cache_hits_total',
  help: 'Total number of Redis cache hits',
  labelNames: ['operation', 'cache_name'] as const,
  registers: [registry],
});

export const redisCacheMisses = new Counter({
  name: 'redis_cache_misses_total',
  help: 'Total number of Redis cache misses',
  labelNames: ['operation', 'cache_name'] as const,
  registers: [registry],
});

export const redisCacheHitRatio = new Gauge({
  name: 'redis_cache_hit_ratio',
  help: 'Redis cache hit ratio (hits / (hits + misses))',
  labelNames: ['cache_name'] as const,
  registers: [registry],
});

export const redisOperationDuration = new Histogram({
  name: 'redis_operation_duration_seconds',
  help: 'Duration of Redis operations in seconds',
  labelNames: ['operation', 'status'] as const,
  buckets: [0.001, 0.002, 0.005, 0.01, 0.02, 0.05, 0.1, 0.5, 1],
  registers: [registry],
});

export const redisConnectionsActive = new Gauge({
  name: 'redis_connections_active',
  help: 'Number of active Redis connections',
  labelNames: ['client_type'] as const,
  registers: [registry],
});

export const redisCommandsTotal = new Counter({
  name: 'redis_commands_total',
  help: 'Total number of Redis commands executed',
  labelNames: ['command', 'status'] as const,
  registers: [registry],
});

export const redisKeySize = new Histogram({
  name: 'redis_key_size_bytes',
  help: 'Size of Redis keys in bytes',
  labelNames: ['key_pattern'] as const,
  buckets: [100, 500, 1000, 5000, 10000, 50000, 100000, 500000],
  registers: [registry],
});

// ============================================================================
// NEO4J SPECIFIC METRICS
// ============================================================================

export const neo4jSessionsActive = new Gauge({
  name: 'neo4j_sessions_active',
  help: 'Number of active Neo4j sessions',
  registers: [registry],
});

export const neo4jTransactionDuration = new Histogram({
  name: 'neo4j_transaction_duration_seconds',
  help: 'Duration of Neo4j transactions',
  labelNames: ['mode'] as const, // 'read' or 'write'
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10, 30],
  registers: [registry],
});

export const neo4jResultSize = new Histogram({
  name: 'neo4j_result_size_records',
  help: 'Number of records returned by Neo4j queries',
  labelNames: ['operation'] as const,
  buckets: [1, 10, 50, 100, 500, 1000, 5000, 10000, 50000],
  registers: [registry],
});

// ============================================================================
// SERVICE ERROR TRACKING
// ============================================================================

export const serviceErrors = new Counter({
  name: 'service_errors_total',
  help: 'Total number of service-level errors',
  labelNames: ['service', 'error_type', 'severity'] as const,
  registers: [registry],
});

export const serviceResponseTime = new Histogram({
  name: 'service_response_time_seconds',
  help: 'Service method response time in seconds',
  labelNames: ['service', 'method', 'status'] as const,
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5],
  registers: [registry],
});

// ============================================================================
// GRAPHQL OPERATION METRICS (Enhanced)
// ============================================================================

export const graphqlOperationComplexity = new Histogram({
  name: 'graphql_operation_complexity',
  help: 'Complexity score of GraphQL operations',
  labelNames: ['operation', 'operation_type'] as const,
  buckets: [1, 5, 10, 25, 50, 100, 250, 500, 1000],
  registers: [registry],
});

export const graphqlFieldResolutionCount = new Counter({
  name: 'graphql_field_resolution_count_total',
  help: 'Total number of fields resolved in GraphQL operations',
  labelNames: ['operation'] as const,
  registers: [registry],
});

export const graphqlCacheUtilization = new Counter({
  name: 'graphql_cache_utilization_total',
  help: 'GraphQL data loader cache utilization',
  labelNames: ['loader', 'cached'] as const,
  registers: [registry],
});

// ============================================================================
// WEBSOCKET METRICS (Enhanced)
// ============================================================================

export const websocketMessageSize = new Histogram({
  name: 'websocket_message_size_bytes',
  help: 'Size of WebSocket messages in bytes',
  labelNames: ['direction', 'event_type'] as const,
  buckets: [100, 500, 1000, 5000, 10000, 50000, 100000],
  registers: [registry],
});

export const websocketLatency = new Histogram({
  name: 'websocket_latency_seconds',
  help: 'WebSocket message round-trip latency',
  labelNames: ['event_type'] as const,
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
  registers: [registry],
});

export const websocketConnectionDuration = new Histogram({
  name: 'websocket_connection_duration_seconds',
  help: 'Duration of WebSocket connections',
  buckets: [10, 30, 60, 300, 600, 1800, 3600, 7200],
  registers: [registry],
});

// ============================================================================
// BULLMQ QUEUE METRICS
// ============================================================================

export const queueJobsWaiting = new Gauge({
  name: 'queue_jobs_waiting',
  help: 'Number of jobs waiting in queue',
  labelNames: ['queue'] as const,
  registers: [registry],
});

export const queueJobsActive = new Gauge({
  name: 'queue_jobs_active',
  help: 'Number of jobs currently being processed',
  labelNames: ['queue'] as const,
  registers: [registry],
});

export const queueJobsCompleted = new Counter({
  name: 'queue_jobs_completed_total',
  help: 'Total number of completed jobs',
  labelNames: ['queue'] as const,
  registers: [registry],
});

export const queueJobsFailed = new Counter({
  name: 'queue_jobs_failed_total',
  help: 'Total number of failed jobs',
  labelNames: ['queue', 'error_type'] as const,
  registers: [registry],
});

export const queueJobDuration = new Histogram({
  name: 'queue_job_duration_seconds',
  help: 'Job processing duration in seconds',
  labelNames: ['queue', 'job_type'] as const,
  buckets: [0.1, 0.5, 1, 5, 10, 30, 60, 300, 600],
  registers: [registry],
});

export const queueJobWaitTime = new Histogram({
  name: 'queue_job_wait_time_seconds',
  help: 'Time jobs spend waiting in queue before processing',
  labelNames: ['queue'] as const,
  buckets: [0.1, 1, 5, 10, 30, 60, 300, 600, 1800],
  registers: [registry],
});

// ============================================================================
// MEMORY & RESOURCE METRICS
// ============================================================================

export const heapFragmentation = new Gauge({
  name: 'nodejs_heap_fragmentation_ratio',
  help: 'Heap fragmentation ratio (external / heap_used)',
  registers: [registry],
});

export const eventLoopUtilization = new Gauge({
  name: 'nodejs_eventloop_utilization',
  help: 'Event loop utilization percentage',
  registers: [registry],
});

// Update heap fragmentation periodically
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const usage = process.memoryUsage();
    const fragmentation = usage.external / usage.heapUsed;
    heapFragmentation.set(fragmentation);
  }, 30000);
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Update cache hit ratio based on hits and misses
 */
export function updateCacheHitRatio(cacheName: string, hits: number, misses: number): void {
  const total = hits + misses;
  if (total > 0) {
    redisCacheHitRatio.set({ cache_name: cacheName }, hits / total);
  }
}

/**
 * Record database connection pool stats
 */
export function recordDbPoolStats(
  database: string,
  pool: string,
  stats: {
    total: number;
    active: number;
    idle: number;
    waiting: number;
  },
): void {
  dbConnectionPoolSize.set({ database, pool }, stats.total);
  dbConnectionPoolActive.set({ database, pool }, stats.active);
  dbConnectionPoolIdle.set({ database, pool }, stats.idle);
  dbConnectionPoolWaiting.set({ database, pool }, stats.waiting);
}

/**
 * Record service error with context
 */
export function recordServiceError(
  service: string,
  errorType: string,
  severity: 'critical' | 'error' | 'warning' = 'error',
): void {
  serviceErrors.inc({ service, error_type: errorType, severity });
}
