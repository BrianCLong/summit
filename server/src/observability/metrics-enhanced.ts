/**
 * Enhanced Prometheus Metrics with Query Latency Heatmaps
 * Provides comprehensive monitoring including P50, P95, P99 latencies
 */

import {
  Counter,
  Gauge,
  Histogram,
  Summary,
  Registry,
  collectDefaultMetrics,
} from 'prom-client';
import logger from '../utils/logger.js';

// Create dedicated registry
export const registry = new Registry();

// Collect default Node.js metrics (every 10s)
collectDefaultMetrics({
  register: registry,
  prefix: 'intelgraph_',
  gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5],
});

// ==============================================================================
// QUERY LATENCY METRICS (for heatmaps)
// ==============================================================================

/**
 * Query latency histogram with fine-grained buckets for heatmap generation
 * Buckets designed to capture: fast (< 100ms), acceptable (< 500ms), slow (< 1.5s), critical (> 1.5s)
 */
export const queryLatencyHistogram = new Histogram({
  name: 'intelgraph_query_latency_seconds',
  help: 'Query execution latency distribution for heatmap visualization',
  labelNames: ['database', 'operation', 'query_type', 'tenant_id'] as const,
  buckets: [
    0.01, 0.025, 0.05, 0.075, 0.1,   // 10ms - 100ms (fast)
    0.15, 0.2, 0.25, 0.3, 0.4, 0.5,  // 100ms - 500ms (acceptable)
    0.75, 1.0, 1.25, 1.5,             // 500ms - 1.5s (slow)
    2.0, 3.0, 5.0, 10.0, 30.0,       // > 1.5s (critical)
  ],
  registers: [registry],
});

/**
 * Query latency summary for precise percentile tracking (P50, P95, P99)
 */
export const queryLatencySummary = new Summary({
  name: 'intelgraph_query_latency_summary_seconds',
  help: 'Query execution latency percentiles (P50, P95, P99)',
  labelNames: ['database', 'operation', 'query_type'] as const,
  percentiles: [0.5, 0.95, 0.99],
  maxAgeSeconds: 600,
  ageBuckets: 5,
  registers: [registry],
});

/**
 * Slow query counter (queries exceeding threshold)
 */
export const slowQueryCounter = new Counter({
  name: 'intelgraph_slow_queries_total',
  help: 'Total number of slow queries (exceeding threshold)',
  labelNames: ['database', 'operation', 'threshold_ms', 'tenant_id'] as const,
  registers: [registry],
});

/**
 * Query error rate counter
 */
export const queryErrorCounter = new Counter({
  name: 'intelgraph_query_errors_total',
  help: 'Total number of failed queries',
  labelNames: ['database', 'operation', 'error_type', 'tenant_id'] as const,
  registers: [registry],
});

// ==============================================================================
// DATABASE CONNECTION METRICS
// ==============================================================================

export const dbConnectionPoolSize = new Gauge({
  name: 'intelgraph_db_connection_pool_size',
  help: 'Current database connection pool size',
  labelNames: ['database', 'pool_type'] as const,
  registers: [registry],
});

export const dbConnectionPoolUsage = new Gauge({
  name: 'intelgraph_db_connection_pool_usage',
  help: 'Current number of active database connections',
  labelNames: ['database', 'pool_type'] as const,
  registers: [registry],
});

export const dbConnectionWaitTime = new Histogram({
  name: 'intelgraph_db_connection_wait_seconds',
  help: 'Time spent waiting for database connection',
  labelNames: ['database'] as const,
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1.0, 5.0],
  registers: [registry],
});

// ==============================================================================
// COST MONITORING METRICS
// ==============================================================================

export const costBudgetGauge = new Gauge({
  name: 'intelgraph_cost_budget_remaining_usd',
  help: 'Remaining cost budget in USD',
  labelNames: ['tenant_id', 'budget_type'] as const,
  registers: [registry],
});

export const costBudgetUtilization = new Gauge({
  name: 'intelgraph_cost_budget_utilization_ratio',
  help: 'Cost budget utilization ratio (0-1)',
  labelNames: ['tenant_id', 'budget_type'] as const,
  registers: [registry],
});

export const costAccrued = new Counter({
  name: 'intelgraph_cost_accrued_usd_total',
  help: 'Total cost accrued in USD',
  labelNames: ['tenant_id', 'resource_type', 'operation'] as const,
  registers: [registry],
});

export const costAlertCounter = new Counter({
  name: 'intelgraph_cost_alerts_total',
  help: 'Total number of cost alerts triggered',
  labelNames: ['tenant_id', 'alert_type', 'severity'] as const,
  registers: [registry],
});

// ==============================================================================
// ARCHIVAL TIERING METRICS
// ==============================================================================

export const archivalJobsTotal = new Counter({
  name: 'intelgraph_archival_jobs_total',
  help: 'Total number of archival jobs executed',
  labelNames: ['storage_tier', 'status'] as const,
  registers: [registry],
});

export const archivalDataSize = new Gauge({
  name: 'intelgraph_archival_data_bytes',
  help: 'Total size of archived data in bytes',
  labelNames: ['storage_tier', 'data_type'] as const,
  registers: [registry],
});

export const archivalLatency = new Histogram({
  name: 'intelgraph_archival_latency_seconds',
  help: 'Time taken to archive data',
  labelNames: ['storage_tier', 'data_type'] as const,
  buckets: [1, 5, 10, 30, 60, 300, 600, 1800, 3600],
  registers: [registry],
});

export const archivalCost = new Counter({
  name: 'intelgraph_archival_cost_usd_total',
  help: 'Total archival storage cost in USD',
  labelNames: ['storage_tier'] as const,
  registers: [registry],
});

// ==============================================================================
// DISASTER RECOVERY METRICS
// ==============================================================================

export const drReplicationLag = new Gauge({
  name: 'intelgraph_dr_replication_lag_seconds',
  help: 'Replication lag to DR region in seconds',
  labelNames: ['database', 'primary_region', 'dr_region'] as const,
  registers: [registry],
});

export const drLastBackupTimestamp = new Gauge({
  name: 'intelgraph_dr_last_backup_timestamp',
  help: 'Unix timestamp of last successful backup',
  labelNames: ['database', 'backup_type'] as const,
  registers: [registry],
});

export const drBackupSize = new Gauge({
  name: 'intelgraph_dr_backup_size_bytes',
  help: 'Size of last backup in bytes',
  labelNames: ['database', 'backup_type'] as const,
  registers: [registry],
});

export const drBackupDuration = new Histogram({
  name: 'intelgraph_dr_backup_duration_seconds',
  help: 'Time taken to complete backup',
  labelNames: ['database', 'backup_type'] as const,
  buckets: [10, 30, 60, 300, 600, 1800, 3600, 7200],
  registers: [registry],
});

export const drRestoreTestCounter = new Counter({
  name: 'intelgraph_dr_restore_tests_total',
  help: 'Total number of DR restore tests performed',
  labelNames: ['database', 'test_type', 'result'] as const,
  registers: [registry],
});

export const drFailoverCounter = new Counter({
  name: 'intelgraph_dr_failovers_total',
  help: 'Total number of DR failover events',
  labelNames: ['database', 'trigger_type', 'result'] as const,
  registers: [registry],
});

export const drRPOActual = new Gauge({
  name: 'intelgraph_dr_rpo_actual_seconds',
  help: 'Actual Recovery Point Objective in seconds',
  labelNames: ['database'] as const,
  registers: [registry],
});

export const drRTOActual = new Gauge({
  name: 'intelgraph_dr_rto_actual_seconds',
  help: 'Actual Recovery Time Objective in seconds',
  labelNames: ['database'] as const,
  registers: [registry],
});

// ==============================================================================
// CHAOS ENGINEERING METRICS
// ==============================================================================

export const chaosExperimentsTotal = new Counter({
  name: 'intelgraph_chaos_experiments_total',
  help: 'Total number of chaos experiments executed',
  labelNames: ['experiment_type', 'target', 'result'] as const,
  registers: [registry],
});

export const chaosImpactDuration = new Histogram({
  name: 'intelgraph_chaos_impact_duration_seconds',
  help: 'Duration of chaos experiment impact',
  labelNames: ['experiment_type', 'target'] as const,
  buckets: [1, 5, 10, 30, 60, 300, 600],
  registers: [registry],
});

export const chaosRecoveryTime = new Histogram({
  name: 'intelgraph_chaos_recovery_time_seconds',
  help: 'Time taken to recover from chaos experiment',
  labelNames: ['experiment_type', 'target'] as const,
  buckets: [1, 5, 10, 30, 60, 120, 300, 600],
  registers: [registry],
});

// ==============================================================================
// BUSINESS METRICS
// ==============================================================================

export const jobsProcessed = new Counter({
  name: 'intelgraph_jobs_processed_total',
  help: 'Total jobs processed by the system',
  labelNames: ['queue', 'status'] as const,
  registers: [registry],
});

export const activeConnections = new Gauge({
  name: 'intelgraph_active_connections',
  help: 'Number of active WebSocket connections',
  labelNames: ['tenant'] as const,
  registers: [registry],
});

export const httpRequestDuration = new Histogram({
  name: 'intelgraph_http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status'] as const,
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
  registers: [registry],
});

// ==============================================================================
// HELPER FUNCTIONS
// ==============================================================================

/**
 * Record a query execution with automatic slow query detection
 */
export function recordQueryExecution(
  database: 'postgres' | 'neo4j' | 'redis' | 'timescale',
  operation: string,
  durationSeconds: number,
  options: {
    queryType?: string;
    tenantId?: string;
    error?: Error;
    slowThresholdMs?: number;
  } = {}
) {
  const {
    queryType = 'unknown',
    tenantId = 'default',
    error,
    slowThresholdMs = 1500, // Default threshold: 1.5s
  } = options;

  // Record latency histogram (for heatmaps)
  queryLatencyHistogram.observe(
    {
      database,
      operation,
      query_type: queryType,
      tenant_id: tenantId,
    },
    durationSeconds
  );

  // Record latency summary (for percentiles)
  queryLatencySummary.observe(
    {
      database,
      operation,
      query_type: queryType,
    },
    durationSeconds
  );

  // Check for slow query
  const durationMs = durationSeconds * 1000;
  if (durationMs > slowThresholdMs) {
    slowQueryCounter.inc({
      database,
      operation,
      threshold_ms: slowThresholdMs.toString(),
      tenant_id: tenantId,
    });

    logger.warn({
      msg: 'Slow query detected',
      database,
      operation,
      durationMs,
      threshold: slowThresholdMs,
      tenantId,
    });
  }

  // Record error if present
  if (error) {
    queryErrorCounter.inc({
      database,
      operation,
      error_type: error.name || 'UnknownError',
      tenant_id: tenantId,
    });
  }
}

/**
 * Get metrics endpoint for Prometheus scraping
 */
export async function getMetrics(): Promise<string> {
  return registry.metrics();
}

/**
 * Get metrics as JSON for debugging
 */
export async function getMetricsJSON(): Promise<any> {
  const metrics = await registry.getMetricsAsJSON();
  return metrics;
}

/**
 * Reset all metrics (useful for testing)
 */
export function resetMetrics() {
  registry.resetMetrics();
  logger.info('All metrics reset');
}

logger.info('Enhanced metrics registry initialized with query latency heatmaps');

export default registry;
