"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metrics = exports.auditEventsTotal = exports.dbConnectionsActive = exports.dbQueryDurationMs = exports.apiRequestDurationMs = exports.apiRequestsTotal = exports.cacheInvalidationsTotal = exports.cacheMissesTotal = exports.cacheHitsTotal = exports.segmentEvaluationsTotal = exports.experimentsTotal = exports.experimentAssignmentDurationMs = exports.experimentAssignmentsTotal = exports.flagsTotal = exports.flagEvaluationDurationMs = exports.flagEvaluationsTotal = exports.configEvaluationDurationMs = exports.configEvaluationsTotal = exports.registry = void 0;
const prom_client_1 = require("prom-client");
exports.registry = new prom_client_1.Registry();
(0, prom_client_1.collectDefaultMetrics)({ register: exports.registry });
// Config evaluation metrics
exports.configEvaluationsTotal = new prom_client_1.Counter({
    name: 'config_service_config_evaluations_total',
    help: 'Total configuration evaluations',
    labelNames: ['key', 'level', 'tenant_id', 'cache_hit'],
    registers: [exports.registry],
});
exports.configEvaluationDurationMs = new prom_client_1.Histogram({
    name: 'config_service_config_evaluation_duration_ms',
    help: 'Configuration evaluation duration in milliseconds',
    labelNames: ['key'],
    buckets: [0.1, 0.5, 1, 5, 10, 25, 50, 100],
    registers: [exports.registry],
});
// Feature flag metrics
exports.flagEvaluationsTotal = new prom_client_1.Counter({
    name: 'config_service_flag_evaluations_total',
    help: 'Total feature flag evaluations',
    labelNames: ['flag_key', 'result', 'reason', 'tenant_id'],
    registers: [exports.registry],
});
exports.flagEvaluationDurationMs = new prom_client_1.Histogram({
    name: 'config_service_flag_evaluation_duration_ms',
    help: 'Feature flag evaluation duration in milliseconds',
    labelNames: ['flag_key'],
    buckets: [0.1, 0.5, 1, 5, 10, 25, 50, 100],
    registers: [exports.registry],
});
exports.flagsTotal = new prom_client_1.Gauge({
    name: 'config_service_flags_total',
    help: 'Total number of feature flags',
    labelNames: ['tenant_id', 'enabled'],
    registers: [exports.registry],
});
// Experiment metrics
exports.experimentAssignmentsTotal = new prom_client_1.Counter({
    name: 'config_service_experiment_assignments_total',
    help: 'Total experiment assignments',
    labelNames: ['experiment_key', 'variant', 'reason', 'tenant_id'],
    registers: [exports.registry],
});
exports.experimentAssignmentDurationMs = new prom_client_1.Histogram({
    name: 'config_service_experiment_assignment_duration_ms',
    help: 'Experiment assignment duration in milliseconds',
    labelNames: ['experiment_key'],
    buckets: [0.1, 0.5, 1, 5, 10, 25, 50, 100],
    registers: [exports.registry],
});
exports.experimentsTotal = new prom_client_1.Gauge({
    name: 'config_service_experiments_total',
    help: 'Total number of experiments',
    labelNames: ['tenant_id', 'status'],
    registers: [exports.registry],
});
// Segment metrics
exports.segmentEvaluationsTotal = new prom_client_1.Counter({
    name: 'config_service_segment_evaluations_total',
    help: 'Total segment evaluations',
    labelNames: ['segment_id', 'matched'],
    registers: [exports.registry],
});
// Cache metrics
exports.cacheHitsTotal = new prom_client_1.Counter({
    name: 'config_service_cache_hits_total',
    help: 'Total cache hits',
    labelNames: ['type'],
    registers: [exports.registry],
});
exports.cacheMissesTotal = new prom_client_1.Counter({
    name: 'config_service_cache_misses_total',
    help: 'Total cache misses',
    labelNames: ['type'],
    registers: [exports.registry],
});
exports.cacheInvalidationsTotal = new prom_client_1.Counter({
    name: 'config_service_cache_invalidations_total',
    help: 'Total cache invalidations',
    labelNames: ['type'],
    registers: [exports.registry],
});
// API metrics
exports.apiRequestsTotal = new prom_client_1.Counter({
    name: 'config_service_api_requests_total',
    help: 'Total API requests',
    labelNames: ['method', 'path', 'status'],
    registers: [exports.registry],
});
exports.apiRequestDurationMs = new prom_client_1.Histogram({
    name: 'config_service_api_request_duration_ms',
    help: 'API request duration in milliseconds',
    labelNames: ['method', 'path'],
    buckets: [1, 5, 10, 25, 50, 100, 250, 500, 1000],
    registers: [exports.registry],
});
// Database metrics
exports.dbQueryDurationMs = new prom_client_1.Histogram({
    name: 'config_service_db_query_duration_ms',
    help: 'Database query duration in milliseconds',
    labelNames: ['operation', 'table'],
    buckets: [1, 5, 10, 25, 50, 100, 250, 500, 1000],
    registers: [exports.registry],
});
exports.dbConnectionsActive = new prom_client_1.Gauge({
    name: 'config_service_db_connections_active',
    help: 'Number of active database connections',
    registers: [exports.registry],
});
// Audit metrics
exports.auditEventsTotal = new prom_client_1.Counter({
    name: 'config_service_audit_events_total',
    help: 'Total audit events logged',
    labelNames: ['entity_type', 'action'],
    registers: [exports.registry],
});
exports.metrics = {
    configEvaluationsTotal: exports.configEvaluationsTotal,
    configEvaluationDurationMs: exports.configEvaluationDurationMs,
    flagEvaluationsTotal: exports.flagEvaluationsTotal,
    flagEvaluationDurationMs: exports.flagEvaluationDurationMs,
    flagsTotal: exports.flagsTotal,
    experimentAssignmentsTotal: exports.experimentAssignmentsTotal,
    experimentAssignmentDurationMs: exports.experimentAssignmentDurationMs,
    experimentsTotal: exports.experimentsTotal,
    segmentEvaluationsTotal: exports.segmentEvaluationsTotal,
    cacheHitsTotal: exports.cacheHitsTotal,
    cacheMissesTotal: exports.cacheMissesTotal,
    cacheInvalidationsTotal: exports.cacheInvalidationsTotal,
    apiRequestsTotal: exports.apiRequestsTotal,
    apiRequestDurationMs: exports.apiRequestDurationMs,
    dbQueryDurationMs: exports.dbQueryDurationMs,
    dbConnectionsActive: exports.dbConnectionsActive,
    auditEventsTotal: exports.auditEventsTotal,
};
