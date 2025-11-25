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

// Narrative Simulation Metrics
export const narrativeSimulationTicksTotal = new Counter({
  name: 'intelgraph_narrative_simulation_ticks_total',
  help: 'Total number of simulation ticks',
  labelNames: ['simulation_id'] as const,
  registers: [registry],
});

export const narrativeSimulationEventsTotal = new Counter({
  name: 'intelgraph_narrative_simulation_events_total',
  help: 'Total number of events processed by the simulation',
  labelNames: ['simulation_id', 'event_type'] as const,
  registers: [registry],
});

export const narrativeSimulationDurationSeconds = new Histogram({
  name: 'intelgraph_narrative_simulation_duration_seconds',
  help: 'Duration of each simulation tick',
  labelNames: ['simulation_id'] as const,
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10],
  registers: [registry],
});

export const narrativeSimulationActiveSimulations = new Gauge({
    name: 'intelgraph_narrative_simulation_active_simulations',
    help: 'Number of active simulations',
    registers: [registry],
});


// User Behavior Metrics
export const userLoginsTotal = new Counter({
    name: 'intelgraph_user_logins_total',
    help: 'Total number of user logins',
    labelNames: ['tenant_id', 'result'] as const,
    registers: [registry],
});

export const userLogoutsTotal = new Counter({
    name: 'intelgraph_user_logouts_total',
    help: 'Total number of user logouts',
    labelNames: ['tenant_id'] as const,
    registers: [registry],
});

export const userSessionDurationSeconds = new Histogram({
    name: 'intelgraph_user_session_duration_seconds',
    help: 'Duration of user sessions',
    labelNames: ['tenant_id'] as const,
    buckets: [60, 300, 600, 1800, 3600, 7200, 14400, 28800], // 1m to 8h
    registers: [registry],
});

export const featureUsageTotal = new Counter({
    name: 'intelgraph_feature_usage_total',
    help: 'Total number of times a feature is used',
    labelNames: ['tenant_id', 'feature_name'] as const,
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
  narrativeSimulationTicksTotal,
  narrativeSimulationEventsTotal,
  narrativeSimulationDurationSeconds,
  narrativeSimulationActiveSimulations,
  userLoginsTotal,
  userLogoutsTotal,
  userSessionDurationSeconds,
  featureUsageTotal,
};
