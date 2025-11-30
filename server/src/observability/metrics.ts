/**
 * Centralized metrics configuration using prom-client
 * Provides typed metrics instances and a shared registry
 */
import {
  Counter,
  Gauge,
  Histogram,
  Registry,
  collectDefaultMetrics,
} from 'prom-client';

// Create dedicated registry
export const registry = new Registry();

// Collect default Node.js metrics
collectDefaultMetrics({ register: registry });

// RED-style HTTP metrics for compatibility with Grafana dashboards and SLO rules
export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests received',
  labelNames: ['method', 'route', 'status_code', 'service'] as const,
  registers: [registry],
});

export const httpRequestDurationSeconds = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code', 'service'] as const,
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10],
  registers: [registry],
});

export const sloAvailability = new Gauge({
  name: 'slo_availability_percentage',
  help: 'Rolling availability SLO computed from HTTP success rates',
  labelNames: ['slo'] as const,
  registers: [registry],
});

// Track request success/error counts for computing availability gauges
export const httpAvailabilityTotals = {
  total: 0,
  errors: 0,
};

// Application-specific metrics
export const jobsProcessed = new Counter({
  name: 'intelgraph_jobs_processed_total',
  help: 'Total jobs processed by the system',
  labelNames: ['queue', 'status'] as const,
  registers: [registry],
});

export const outboxSyncLatency = new Histogram({
  name: 'intelgraph_outbox_sync_latency_seconds',
  help: 'Latency of outbox to Neo4j sync operations',
  labelNames: ['operation'] as const,
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10],
  registers: [registry],
});

export const activeConnections = new Gauge({
  name: 'intelgraph_active_connections',
  help: 'Number of active WebSocket connections',
  labelNames: ['tenant'] as const,
  registers: [registry],
});

export const databaseQueryDuration = new Histogram({
  name: 'intelgraph_database_query_duration_seconds',
  help: 'Database query execution time',
  labelNames: ['database', 'operation'] as const,
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5],
  registers: [registry],
});

export const httpRequestDuration = new Histogram({
  name: 'intelgraph_http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status'] as const,
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
  registers: [registry],
});

// GraphRAG Query Preview metrics
export const graphragQueryTotal = new Counter({
  name: 'intelgraph_graphrag_query_total',
  help: 'Total GraphRAG queries executed',
  labelNames: ['status', 'hasPreview'] as const,
  registers: [registry],
});

export const graphragQueryDurationMs = new Histogram({
  name: 'intelgraph_graphrag_query_duration_ms',
  help: 'GraphRAG query execution duration in milliseconds',
  labelNames: ['hasPreview'] as const,
  buckets: [100, 500, 1000, 2000, 5000, 10000, 30000],
  registers: [registry],
});

export const queryPreviewsTotal = new Counter({
  name: 'intelgraph_query_previews_total',
  help: 'Total query previews generated',
  labelNames: ['language', 'status'] as const,
  registers: [registry],
});

export const queryPreviewLatencyMs = new Histogram({
  name: 'intelgraph_query_preview_latency_ms',
  help: 'Query preview generation latency in milliseconds',
  labelNames: ['language'] as const,
  buckets: [50, 100, 250, 500, 1000, 2000, 5000],
  registers: [registry],
});

export const queryPreviewErrorsTotal = new Counter({
  name: 'intelgraph_query_preview_errors_total',
  help: 'Total query preview errors',
  labelNames: ['language'] as const,
  registers: [registry],
});

export const queryPreviewExecutionsTotal = new Counter({
  name: 'intelgraph_query_preview_executions_total',
  help: 'Total query preview executions',
  labelNames: ['language', 'dryRun', 'status'] as const,
  registers: [registry],
});

export const glassBoxRunsTotal = new Counter({
  name: 'intelgraph_glass_box_runs_total',
  help: 'Total glass-box runs created',
  labelNames: ['type', 'status'] as const,
  registers: [registry],
});

export const glassBoxRunDurationMs = new Histogram({
  name: 'intelgraph_glass_box_run_duration_ms',
  help: 'Glass-box run duration in milliseconds',
  labelNames: ['type'] as const,
  buckets: [100, 500, 1000, 2000, 5000, 10000, 30000, 60000],
  registers: [registry],
});

export const glassBoxCacheHits = new Counter({
  name: 'intelgraph_glass_box_cache_hits_total',
  help: 'Total glass-box cache hits',
  labelNames: ['operation'] as const,
  registers: [registry],
});

export const metrics = {
  jobsProcessed,
  outboxSyncLatency,
  activeConnections,
  databaseQueryDuration,
  httpRequestDuration,
  graphragQueryTotal,
  graphragQueryDurationMs,
  queryPreviewsTotal,
  queryPreviewLatencyMs,
  queryPreviewErrorsTotal,
  queryPreviewExecutionsTotal,
  glassBoxRunsTotal,
  glassBoxRunDurationMs,
  glassBoxCacheHits,
  httpRequestsTotal,
  httpRequestDurationSeconds,
  sloAvailability,
  cacheHits: new Counter({
    name: 'intelgraph_cache_hits_total',
    help: 'Total cache hits',
    labelNames: ['level'] as const,
    registers: [registry],
  }),
  cacheMisses: new Counter({
    name: 'intelgraph_cache_misses_total',
    help: 'Total cache misses',
    registers: [registry],
  }),
};

/**
 * Reset metrics in the shared registry. Intended for tests to avoid
 * cross-test contamination when asserting metric values.
 */
export function resetMetrics(): void {
  registry.resetMetrics();
  httpAvailabilityTotals.total = 0;
  httpAvailabilityTotals.errors = 0;
}
