"use strict";
// @ts-nocheck
/**
 * Enhanced Prometheus Metrics with Query Latency Heatmaps
 * Provides comprehensive monitoring including P50, P95, P99 latencies
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.httpRequestDuration = exports.activeConnections = exports.jobsProcessed = exports.chaosRecoveryTime = exports.chaosImpactDuration = exports.chaosExperimentsTotal = exports.drRTOActual = exports.drRPOActual = exports.drFailoverCounter = exports.drRestoreTestCounter = exports.drBackupDuration = exports.drBackupSize = exports.drLastBackupTimestamp = exports.drReplicationLag = exports.archivalCost = exports.archivalLatency = exports.archivalDataSize = exports.archivalJobsTotal = exports.costAlertCounter = exports.costAccrued = exports.costBudgetUtilization = exports.costBudgetGauge = exports.dbConnectionWaitTime = exports.dbConnectionPoolUsage = exports.dbConnectionPoolSize = exports.queryErrorCounter = exports.slowQueryCounter = exports.queryLatencySummary = exports.queryLatencyHistogram = exports.registry = void 0;
exports.recordQueryExecution = recordQueryExecution;
exports.getMetrics = getMetrics;
exports.getMetricsJSON = getMetricsJSON;
exports.resetMetrics = resetMetrics;
const prom_client_1 = require("prom-client");
const logger_js_1 = __importDefault(require("../utils/logger.js"));
const metrics_js_1 = require("../monitoring/metrics.js");
Object.defineProperty(exports, "registry", { enumerable: true, get: function () { return metrics_js_1.registry; } });
// ==============================================================================
// QUERY LATENCY METRICS (for heatmaps)
// ==============================================================================
/**
 * Query latency histogram with fine-grained buckets for heatmap generation
 * Buckets designed to capture: fast (< 100ms), acceptable (< 500ms), slow (< 1.5s), critical (> 1.5s)
 */
exports.queryLatencyHistogram = new prom_client_1.Histogram({
    name: 'intelgraph_query_latency_seconds',
    help: 'Query execution latency distribution for heatmap visualization',
    labelNames: ['database', 'operation', 'query_type', 'tenant_id'],
    buckets: [
        0.01, 0.025, 0.05, 0.075, 0.1, // 10ms - 100ms (fast)
        0.15, 0.2, 0.25, 0.3, 0.4, 0.5, // 100ms - 500ms (acceptable)
        0.75, 1.0, 1.25, 1.5, // 500ms - 1.5s (slow)
        2.0, 3.0, 5.0, 10.0, 30.0, // > 1.5s (critical)
    ],
    registers: [metrics_js_1.registry],
});
/**
 * Query latency summary for precise percentile tracking (P50, P95, P99)
 */
exports.queryLatencySummary = new prom_client_1.Summary({
    name: 'intelgraph_query_latency_summary_seconds',
    help: 'Query execution latency percentiles (P50, P95, P99)',
    labelNames: ['database', 'operation', 'query_type'],
    percentiles: [0.5, 0.95, 0.99],
    maxAgeSeconds: 600,
    ageBuckets: 5,
    registers: [metrics_js_1.registry],
});
/**
 * Slow query counter (queries exceeding threshold)
 */
exports.slowQueryCounter = new prom_client_1.Counter({
    name: 'intelgraph_slow_queries_total',
    help: 'Total number of slow queries (exceeding threshold)',
    labelNames: ['database', 'operation', 'threshold_ms', 'tenant_id'],
    registers: [metrics_js_1.registry],
});
/**
 * Query error rate counter
 */
exports.queryErrorCounter = new prom_client_1.Counter({
    name: 'intelgraph_query_errors_total',
    help: 'Total number of failed queries',
    labelNames: ['database', 'operation', 'error_type', 'tenant_id'],
    registers: [metrics_js_1.registry],
});
// ==============================================================================
// DATABASE CONNECTION METRICS
// ==============================================================================
exports.dbConnectionPoolSize = new prom_client_1.Gauge({
    name: 'intelgraph_db_connection_pool_size',
    help: 'Current database connection pool size',
    labelNames: ['database', 'pool_type'],
    registers: [metrics_js_1.registry],
});
exports.dbConnectionPoolUsage = new prom_client_1.Gauge({
    name: 'intelgraph_db_connection_pool_usage',
    help: 'Current number of active database connections',
    labelNames: ['database', 'pool_type'],
    registers: [metrics_js_1.registry],
});
exports.dbConnectionWaitTime = new prom_client_1.Histogram({
    name: 'intelgraph_db_connection_wait_seconds',
    help: 'Time spent waiting for database connection',
    labelNames: ['database'],
    buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1.0, 5.0],
    registers: [metrics_js_1.registry],
});
// ==============================================================================
// COST MONITORING METRICS
// ==============================================================================
exports.costBudgetGauge = new prom_client_1.Gauge({
    name: 'intelgraph_cost_budget_remaining_usd',
    help: 'Remaining cost budget in USD',
    labelNames: ['tenant_id', 'budget_type'],
    registers: [metrics_js_1.registry],
});
exports.costBudgetUtilization = new prom_client_1.Gauge({
    name: 'intelgraph_cost_budget_utilization_ratio',
    help: 'Cost budget utilization ratio (0-1)',
    labelNames: ['tenant_id', 'budget_type'],
    registers: [metrics_js_1.registry],
});
exports.costAccrued = new prom_client_1.Counter({
    name: 'intelgraph_cost_accrued_usd_total',
    help: 'Total cost accrued in USD',
    labelNames: ['tenant_id', 'resource_type', 'operation'],
    registers: [metrics_js_1.registry],
});
exports.costAlertCounter = new prom_client_1.Counter({
    name: 'intelgraph_cost_alerts_total',
    help: 'Total number of cost alerts triggered',
    labelNames: ['tenant_id', 'alert_type', 'severity'],
    registers: [metrics_js_1.registry],
});
// ==============================================================================
// ARCHIVAL TIERING METRICS
// ==============================================================================
exports.archivalJobsTotal = new prom_client_1.Counter({
    name: 'intelgraph_archival_jobs_total',
    help: 'Total number of archival jobs executed',
    labelNames: ['storage_tier', 'status'],
    registers: [metrics_js_1.registry],
});
exports.archivalDataSize = new prom_client_1.Gauge({
    name: 'intelgraph_archival_data_bytes',
    help: 'Total size of archived data in bytes',
    labelNames: ['storage_tier', 'data_type'],
    registers: [metrics_js_1.registry],
});
exports.archivalLatency = new prom_client_1.Histogram({
    name: 'intelgraph_archival_latency_seconds',
    help: 'Time taken to archive data',
    labelNames: ['storage_tier', 'data_type'],
    buckets: [1, 5, 10, 30, 60, 300, 600, 1800, 3600],
    registers: [metrics_js_1.registry],
});
exports.archivalCost = new prom_client_1.Counter({
    name: 'intelgraph_archival_cost_usd_total',
    help: 'Total archival storage cost in USD',
    labelNames: ['storage_tier'],
    registers: [metrics_js_1.registry],
});
// ==============================================================================
// DISASTER RECOVERY METRICS
// ==============================================================================
exports.drReplicationLag = new prom_client_1.Gauge({
    name: 'intelgraph_dr_replication_lag_seconds',
    help: 'Replication lag to DR region in seconds',
    labelNames: ['database', 'primary_region', 'dr_region'],
    registers: [metrics_js_1.registry],
});
exports.drLastBackupTimestamp = new prom_client_1.Gauge({
    name: 'intelgraph_dr_last_backup_timestamp',
    help: 'Unix timestamp of last successful backup',
    labelNames: ['database', 'backup_type'],
    registers: [metrics_js_1.registry],
});
exports.drBackupSize = new prom_client_1.Gauge({
    name: 'intelgraph_dr_backup_size_bytes',
    help: 'Size of last backup in bytes',
    labelNames: ['database', 'backup_type'],
    registers: [metrics_js_1.registry],
});
exports.drBackupDuration = new prom_client_1.Histogram({
    name: 'intelgraph_dr_backup_duration_seconds',
    help: 'Time taken to complete backup',
    labelNames: ['database', 'backup_type'],
    buckets: [10, 30, 60, 300, 600, 1800, 3600, 7200],
    registers: [metrics_js_1.registry],
});
exports.drRestoreTestCounter = new prom_client_1.Counter({
    name: 'intelgraph_dr_restore_tests_total',
    help: 'Total number of DR restore tests performed',
    labelNames: ['database', 'test_type', 'result'],
    registers: [metrics_js_1.registry],
});
exports.drFailoverCounter = new prom_client_1.Counter({
    name: 'intelgraph_dr_failovers_total',
    help: 'Total number of DR failover events',
    labelNames: ['database', 'trigger_type', 'result'],
    registers: [metrics_js_1.registry],
});
exports.drRPOActual = new prom_client_1.Gauge({
    name: 'intelgraph_dr_rpo_actual_seconds',
    help: 'Actual Recovery Point Objective in seconds',
    labelNames: ['database'],
    registers: [metrics_js_1.registry],
});
exports.drRTOActual = new prom_client_1.Gauge({
    name: 'intelgraph_dr_rto_actual_seconds',
    help: 'Actual Recovery Time Objective in seconds',
    labelNames: ['database'],
    registers: [metrics_js_1.registry],
});
// ==============================================================================
// CHAOS ENGINEERING METRICS
// ==============================================================================
exports.chaosExperimentsTotal = new prom_client_1.Counter({
    name: 'intelgraph_chaos_experiments_total',
    help: 'Total number of chaos experiments executed',
    labelNames: ['experiment_type', 'target', 'result'],
    registers: [metrics_js_1.registry],
});
exports.chaosImpactDuration = new prom_client_1.Histogram({
    name: 'intelgraph_chaos_impact_duration_seconds',
    help: 'Duration of chaos experiment impact',
    labelNames: ['experiment_type', 'target'],
    buckets: [1, 5, 10, 30, 60, 300, 600],
    registers: [metrics_js_1.registry],
});
exports.chaosRecoveryTime = new prom_client_1.Histogram({
    name: 'intelgraph_chaos_recovery_time_seconds',
    help: 'Time taken to recover from chaos experiment',
    labelNames: ['experiment_type', 'target'],
    buckets: [1, 5, 10, 30, 60, 120, 300, 600],
    registers: [metrics_js_1.registry],
});
// ==============================================================================
// BUSINESS METRICS
// ==============================================================================
exports.jobsProcessed = new prom_client_1.Counter({
    name: 'intelgraph_jobs_processed_total',
    help: 'Total jobs processed by the system',
    labelNames: ['queue', 'status'],
    registers: [metrics_js_1.registry],
});
exports.activeConnections = new prom_client_1.Gauge({
    name: 'intelgraph_active_connections',
    help: 'Number of active WebSocket connections',
    labelNames: ['tenant'],
    registers: [metrics_js_1.registry],
});
exports.httpRequestDuration = new prom_client_1.Histogram({
    name: 'intelgraph_http_request_duration_seconds',
    help: 'HTTP request duration in seconds',
    labelNames: ['method', 'route', 'status'],
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
    registers: [metrics_js_1.registry],
});
// ==============================================================================
// HELPER FUNCTIONS
// ==============================================================================
/**
 * Record a query execution with automatic slow query detection
 */
function recordQueryExecution(database, operation, durationSeconds, options = {}) {
    const { queryType = 'unknown', tenantId = 'default', error, slowThresholdMs = 1500, // Default threshold: 1.5s
     } = options;
    // Record latency histogram (for heatmaps)
    exports.queryLatencyHistogram.observe({
        database,
        operation,
        query_type: queryType,
        tenant_id: tenantId,
    }, durationSeconds);
    // Record latency summary (for percentiles)
    exports.queryLatencySummary.observe({
        database,
        operation,
        query_type: queryType,
    }, durationSeconds);
    // Check for slow query
    const durationMs = durationSeconds * 1000;
    if (durationMs > slowThresholdMs) {
        exports.slowQueryCounter.inc({
            database,
            operation,
            threshold_ms: slowThresholdMs.toString(),
            tenant_id: tenantId,
        });
        logger_js_1.default.warn({
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
        exports.queryErrorCounter.inc({
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
async function getMetrics() {
    return metrics_js_1.registry.metrics();
}
/**
 * Get metrics as JSON for debugging
 */
async function getMetricsJSON() {
    const metrics = await metrics_js_1.registry.getMetricsAsJSON();
    return metrics;
}
/**
 * Reset all metrics (useful for testing)
 */
function resetMetrics() {
    metrics_js_1.registry.resetMetrics();
    logger_js_1.default.info('All metrics reset');
}
logger_js_1.default.info('Enhanced metrics registry initialized with query latency heatmaps');
exports.default = metrics_js_1.registry;
