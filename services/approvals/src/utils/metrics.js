"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sloErrorBudget = exports.sloLatencyBudget = exports.approvalsExpired = exports.approvalsPendingAge = exports.approvalsByStatus = exports.dbErrors = exports.dbConnectionsActive = exports.dbQueryDuration = exports.provenanceErrors = exports.provenanceLatency = exports.provenanceReceiptsTotal = exports.opaCacheMisses = exports.opaCacheHits = exports.opaErrors = exports.opaLatency = exports.opaRequestsTotal = exports.approvalDecisionLatency = exports.approvalDecisionsTotal = exports.approvalRequestDuration = exports.approvalRequestsActive = exports.approvalRequestsTotal = exports.httpRequestDuration = exports.httpRequestsTotal = exports.registry = void 0;
const prom_client_1 = require("prom-client");
// Create a new registry
exports.registry = new prom_client_1.Registry();
// Collect default metrics (CPU, memory, etc.)
(0, prom_client_1.collectDefaultMetrics)({ register: exports.registry });
// ============================================================================
// HTTP Metrics
// ============================================================================
exports.httpRequestsTotal = new prom_client_1.Counter({
    name: 'approvals_http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code'],
    registers: [exports.registry],
});
exports.httpRequestDuration = new prom_client_1.Histogram({
    name: 'approvals_http_request_duration_seconds',
    help: 'HTTP request duration in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    registers: [exports.registry],
});
// ============================================================================
// Approval Request Metrics
// ============================================================================
exports.approvalRequestsTotal = new prom_client_1.Counter({
    name: 'approvals_requests_total',
    help: 'Total number of approval requests created',
    labelNames: ['tenant_id', 'action', 'resource_type'],
    registers: [exports.registry],
});
exports.approvalRequestsActive = new prom_client_1.Gauge({
    name: 'approvals_requests_active',
    help: 'Number of active (pending) approval requests',
    labelNames: ['tenant_id'],
    registers: [exports.registry],
});
exports.approvalRequestDuration = new prom_client_1.Histogram({
    name: 'approvals_request_duration_seconds',
    help: 'Time from request creation to finalization',
    labelNames: ['tenant_id', 'action', 'final_status'],
    buckets: [60, 300, 900, 1800, 3600, 7200, 14400, 28800, 86400], // 1m to 1d
    registers: [exports.registry],
});
// ============================================================================
// Decision Metrics
// ============================================================================
exports.approvalDecisionsTotal = new prom_client_1.Counter({
    name: 'approvals_decisions_total',
    help: 'Total number of approval decisions',
    labelNames: ['tenant_id', 'decision', 'action'],
    registers: [exports.registry],
});
exports.approvalDecisionLatency = new prom_client_1.Histogram({
    name: 'approvals_decision_latency_seconds',
    help: 'Latency of decision processing',
    labelNames: ['tenant_id', 'decision'],
    buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
    registers: [exports.registry],
});
// ============================================================================
// OPA Metrics
// ============================================================================
exports.opaRequestsTotal = new prom_client_1.Counter({
    name: 'approvals_opa_requests_total',
    help: 'Total number of OPA policy evaluations',
    labelNames: ['query_type', 'result'],
    registers: [exports.registry],
});
exports.opaLatency = new prom_client_1.Histogram({
    name: 'approvals_opa_latency_seconds',
    help: 'OPA policy evaluation latency',
    labelNames: ['query_type'],
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1],
    registers: [exports.registry],
});
exports.opaErrors = new prom_client_1.Counter({
    name: 'approvals_opa_errors_total',
    help: 'Total number of OPA errors',
    labelNames: ['error_type'],
    registers: [exports.registry],
});
exports.opaCacheHits = new prom_client_1.Counter({
    name: 'approvals_opa_cache_hits_total',
    help: 'Total number of OPA cache hits',
    registers: [exports.registry],
});
exports.opaCacheMisses = new prom_client_1.Counter({
    name: 'approvals_opa_cache_misses_total',
    help: 'Total number of OPA cache misses',
    registers: [exports.registry],
});
// ============================================================================
// Provenance Metrics
// ============================================================================
exports.provenanceReceiptsTotal = new prom_client_1.Counter({
    name: 'approvals_provenance_receipts_total',
    help: 'Total number of provenance receipts created',
    labelNames: ['tenant_id', 'action_type'],
    registers: [exports.registry],
});
exports.provenanceLatency = new prom_client_1.Histogram({
    name: 'approvals_provenance_latency_seconds',
    help: 'Provenance receipt creation latency',
    labelNames: ['action_type'],
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1],
    registers: [exports.registry],
});
exports.provenanceErrors = new prom_client_1.Counter({
    name: 'approvals_provenance_errors_total',
    help: 'Total number of provenance errors',
    labelNames: ['error_type'],
    registers: [exports.registry],
});
// ============================================================================
// Database Metrics
// ============================================================================
exports.dbQueryDuration = new prom_client_1.Histogram({
    name: 'approvals_db_query_duration_seconds',
    help: 'Database query duration',
    labelNames: ['operation', 'table'],
    buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1],
    registers: [exports.registry],
});
exports.dbConnectionsActive = new prom_client_1.Gauge({
    name: 'approvals_db_connections_active',
    help: 'Number of active database connections',
    registers: [exports.registry],
});
exports.dbErrors = new prom_client_1.Counter({
    name: 'approvals_db_errors_total',
    help: 'Total number of database errors',
    labelNames: ['operation', 'error_type'],
    registers: [exports.registry],
});
// ============================================================================
// Business Metrics
// ============================================================================
exports.approvalsByStatus = new prom_client_1.Gauge({
    name: 'approvals_by_status',
    help: 'Number of approvals by status',
    labelNames: ['tenant_id', 'status'],
    registers: [exports.registry],
});
exports.approvalsPendingAge = new prom_client_1.Histogram({
    name: 'approvals_pending_age_seconds',
    help: 'Age of pending approval requests',
    labelNames: ['tenant_id'],
    buckets: [300, 900, 1800, 3600, 7200, 14400, 28800, 86400, 172800], // 5m to 2d
    registers: [exports.registry],
});
exports.approvalsExpired = new prom_client_1.Counter({
    name: 'approvals_expired_total',
    help: 'Total number of expired approval requests',
    labelNames: ['tenant_id', 'action'],
    registers: [exports.registry],
});
// ============================================================================
// SLO Metrics
// ============================================================================
exports.sloLatencyBudget = new prom_client_1.Gauge({
    name: 'approvals_slo_latency_budget_remaining',
    help: 'Remaining SLO latency budget (0-1)',
    registers: [exports.registry],
});
exports.sloErrorBudget = new prom_client_1.Gauge({
    name: 'approvals_slo_error_budget_remaining',
    help: 'Remaining SLO error budget (0-1)',
    registers: [exports.registry],
});
