import {
  Counter,
  Histogram,
  Gauge,
  Registry,
  collectDefaultMetrics,
} from 'prom-client';

// Create a new registry
export const registry = new Registry();

// Collect default metrics (CPU, memory, etc.)
collectDefaultMetrics({ register: registry });

// ============================================================================
// HTTP Metrics
// ============================================================================

export const httpRequestsTotal = new Counter({
  name: 'approvals_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [registry],
});

export const httpRequestDuration = new Histogram({
  name: 'approvals_http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [registry],
});

// ============================================================================
// Approval Request Metrics
// ============================================================================

export const approvalRequestsTotal = new Counter({
  name: 'approvals_requests_total',
  help: 'Total number of approval requests created',
  labelNames: ['tenant_id', 'action', 'resource_type'],
  registers: [registry],
});

export const approvalRequestsActive = new Gauge({
  name: 'approvals_requests_active',
  help: 'Number of active (pending) approval requests',
  labelNames: ['tenant_id'],
  registers: [registry],
});

export const approvalRequestDuration = new Histogram({
  name: 'approvals_request_duration_seconds',
  help: 'Time from request creation to finalization',
  labelNames: ['tenant_id', 'action', 'final_status'],
  buckets: [60, 300, 900, 1800, 3600, 7200, 14400, 28800, 86400], // 1m to 1d
  registers: [registry],
});

// ============================================================================
// Decision Metrics
// ============================================================================

export const approvalDecisionsTotal = new Counter({
  name: 'approvals_decisions_total',
  help: 'Total number of approval decisions',
  labelNames: ['tenant_id', 'decision', 'action'],
  registers: [registry],
});

export const approvalDecisionLatency = new Histogram({
  name: 'approvals_decision_latency_seconds',
  help: 'Latency of decision processing',
  labelNames: ['tenant_id', 'decision'],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  registers: [registry],
});

// ============================================================================
// OPA Metrics
// ============================================================================

export const opaRequestsTotal = new Counter({
  name: 'approvals_opa_requests_total',
  help: 'Total number of OPA policy evaluations',
  labelNames: ['query_type', 'result'],
  registers: [registry],
});

export const opaLatency = new Histogram({
  name: 'approvals_opa_latency_seconds',
  help: 'OPA policy evaluation latency',
  labelNames: ['query_type'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1],
  registers: [registry],
});

export const opaErrors = new Counter({
  name: 'approvals_opa_errors_total',
  help: 'Total number of OPA errors',
  labelNames: ['error_type'],
  registers: [registry],
});

export const opaCacheHits = new Counter({
  name: 'approvals_opa_cache_hits_total',
  help: 'Total number of OPA cache hits',
  registers: [registry],
});

export const opaCacheMisses = new Counter({
  name: 'approvals_opa_cache_misses_total',
  help: 'Total number of OPA cache misses',
  registers: [registry],
});

// ============================================================================
// Provenance Metrics
// ============================================================================

export const provenanceReceiptsTotal = new Counter({
  name: 'approvals_provenance_receipts_total',
  help: 'Total number of provenance receipts created',
  labelNames: ['tenant_id', 'action_type'],
  registers: [registry],
});

export const provenanceLatency = new Histogram({
  name: 'approvals_provenance_latency_seconds',
  help: 'Provenance receipt creation latency',
  labelNames: ['action_type'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1],
  registers: [registry],
});

export const provenanceErrors = new Counter({
  name: 'approvals_provenance_errors_total',
  help: 'Total number of provenance errors',
  labelNames: ['error_type'],
  registers: [registry],
});

// ============================================================================
// Database Metrics
// ============================================================================

export const dbQueryDuration = new Histogram({
  name: 'approvals_db_query_duration_seconds',
  help: 'Database query duration',
  labelNames: ['operation', 'table'],
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1],
  registers: [registry],
});

export const dbConnectionsActive = new Gauge({
  name: 'approvals_db_connections_active',
  help: 'Number of active database connections',
  registers: [registry],
});

export const dbErrors = new Counter({
  name: 'approvals_db_errors_total',
  help: 'Total number of database errors',
  labelNames: ['operation', 'error_type'],
  registers: [registry],
});

// ============================================================================
// Business Metrics
// ============================================================================

export const approvalsByStatus = new Gauge({
  name: 'approvals_by_status',
  help: 'Number of approvals by status',
  labelNames: ['tenant_id', 'status'],
  registers: [registry],
});

export const approvalsPendingAge = new Histogram({
  name: 'approvals_pending_age_seconds',
  help: 'Age of pending approval requests',
  labelNames: ['tenant_id'],
  buckets: [300, 900, 1800, 3600, 7200, 14400, 28800, 86400, 172800], // 5m to 2d
  registers: [registry],
});

export const approvalsExpired = new Counter({
  name: 'approvals_expired_total',
  help: 'Total number of expired approval requests',
  labelNames: ['tenant_id', 'action'],
  registers: [registry],
});

// ============================================================================
// SLO Metrics
// ============================================================================

export const sloLatencyBudget = new Gauge({
  name: 'approvals_slo_latency_budget_remaining',
  help: 'Remaining SLO latency budget (0-1)',
  registers: [registry],
});

export const sloErrorBudget = new Gauge({
  name: 'approvals_slo_error_budget_remaining',
  help: 'Remaining SLO error budget (0-1)',
  registers: [registry],
});
