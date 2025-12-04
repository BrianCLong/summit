import {
  Counter,
  Gauge,
  Histogram,
  Registry,
  collectDefaultMetrics,
} from 'prom-client';

export const registry = new Registry();

collectDefaultMetrics({ register: registry });

// Config evaluation metrics
export const configEvaluationsTotal = new Counter({
  name: 'config_service_config_evaluations_total',
  help: 'Total configuration evaluations',
  labelNames: ['key', 'level', 'tenant_id', 'cache_hit'] as const,
  registers: [registry],
});

export const configEvaluationDurationMs = new Histogram({
  name: 'config_service_config_evaluation_duration_ms',
  help: 'Configuration evaluation duration in milliseconds',
  labelNames: ['key'] as const,
  buckets: [0.1, 0.5, 1, 5, 10, 25, 50, 100],
  registers: [registry],
});

// Feature flag metrics
export const flagEvaluationsTotal = new Counter({
  name: 'config_service_flag_evaluations_total',
  help: 'Total feature flag evaluations',
  labelNames: ['flag_key', 'result', 'reason', 'tenant_id'] as const,
  registers: [registry],
});

export const flagEvaluationDurationMs = new Histogram({
  name: 'config_service_flag_evaluation_duration_ms',
  help: 'Feature flag evaluation duration in milliseconds',
  labelNames: ['flag_key'] as const,
  buckets: [0.1, 0.5, 1, 5, 10, 25, 50, 100],
  registers: [registry],
});

export const flagsTotal = new Gauge({
  name: 'config_service_flags_total',
  help: 'Total number of feature flags',
  labelNames: ['tenant_id', 'enabled'] as const,
  registers: [registry],
});

// Experiment metrics
export const experimentAssignmentsTotal = new Counter({
  name: 'config_service_experiment_assignments_total',
  help: 'Total experiment assignments',
  labelNames: ['experiment_key', 'variant', 'reason', 'tenant_id'] as const,
  registers: [registry],
});

export const experimentAssignmentDurationMs = new Histogram({
  name: 'config_service_experiment_assignment_duration_ms',
  help: 'Experiment assignment duration in milliseconds',
  labelNames: ['experiment_key'] as const,
  buckets: [0.1, 0.5, 1, 5, 10, 25, 50, 100],
  registers: [registry],
});

export const experimentsTotal = new Gauge({
  name: 'config_service_experiments_total',
  help: 'Total number of experiments',
  labelNames: ['tenant_id', 'status'] as const,
  registers: [registry],
});

// Segment metrics
export const segmentEvaluationsTotal = new Counter({
  name: 'config_service_segment_evaluations_total',
  help: 'Total segment evaluations',
  labelNames: ['segment_id', 'matched'] as const,
  registers: [registry],
});

// Cache metrics
export const cacheHitsTotal = new Counter({
  name: 'config_service_cache_hits_total',
  help: 'Total cache hits',
  labelNames: ['type'] as const,
  registers: [registry],
});

export const cacheMissesTotal = new Counter({
  name: 'config_service_cache_misses_total',
  help: 'Total cache misses',
  labelNames: ['type'] as const,
  registers: [registry],
});

export const cacheInvalidationsTotal = new Counter({
  name: 'config_service_cache_invalidations_total',
  help: 'Total cache invalidations',
  labelNames: ['type'] as const,
  registers: [registry],
});

// API metrics
export const apiRequestsTotal = new Counter({
  name: 'config_service_api_requests_total',
  help: 'Total API requests',
  labelNames: ['method', 'path', 'status'] as const,
  registers: [registry],
});

export const apiRequestDurationMs = new Histogram({
  name: 'config_service_api_request_duration_ms',
  help: 'API request duration in milliseconds',
  labelNames: ['method', 'path'] as const,
  buckets: [1, 5, 10, 25, 50, 100, 250, 500, 1000],
  registers: [registry],
});

// Database metrics
export const dbQueryDurationMs = new Histogram({
  name: 'config_service_db_query_duration_ms',
  help: 'Database query duration in milliseconds',
  labelNames: ['operation', 'table'] as const,
  buckets: [1, 5, 10, 25, 50, 100, 250, 500, 1000],
  registers: [registry],
});

export const dbConnectionsActive = new Gauge({
  name: 'config_service_db_connections_active',
  help: 'Number of active database connections',
  registers: [registry],
});

// Audit metrics
export const auditEventsTotal = new Counter({
  name: 'config_service_audit_events_total',
  help: 'Total audit events logged',
  labelNames: ['entity_type', 'action'] as const,
  registers: [registry],
});

export const metrics = {
  configEvaluationsTotal,
  configEvaluationDurationMs,
  flagEvaluationsTotal,
  flagEvaluationDurationMs,
  flagsTotal,
  experimentAssignmentsTotal,
  experimentAssignmentDurationMs,
  experimentsTotal,
  segmentEvaluationsTotal,
  cacheHitsTotal,
  cacheMissesTotal,
  cacheInvalidationsTotal,
  apiRequestsTotal,
  apiRequestDurationMs,
  dbQueryDurationMs,
  dbConnectionsActive,
  auditEventsTotal,
};
