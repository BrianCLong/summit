"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metrics = exports.httpRequestsTotal = exports.httpRequestDuration = exports.promotionExecuted = exports.promotionRequests = exports.linkbackAttempts = exports.enforcementDecisions = exports.dataCloneDuration = exports.syntheticDataGenerated = exports.dataCloneOperations = exports.activeSandboxes = exports.sandboxStatusChange = exports.sandboxCreated = exports.resolverCalls = exports.resolverDuration = exports.registry = void 0;
const prom_client_1 = require("prom-client");
// Create a custom registry
exports.registry = new prom_client_1.Registry();
// Collect default metrics
(0, prom_client_1.collectDefaultMetrics)({ register: exports.registry });
// Resolver metrics
exports.resolverDuration = new prom_client_1.Histogram({
    name: 'sandbox_gateway_resolver_duration_seconds',
    help: 'Duration of GraphQL resolver execution',
    labelNames: ['resolver'],
    buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5],
    registers: [exports.registry],
});
exports.resolverCalls = new prom_client_1.Counter({
    name: 'sandbox_gateway_resolver_calls_total',
    help: 'Total number of GraphQL resolver calls',
    labelNames: ['resolver', 'status'],
    registers: [exports.registry],
});
// Sandbox metrics
exports.sandboxCreated = new prom_client_1.Counter({
    name: 'sandbox_created_total',
    help: 'Total number of sandboxes created',
    labelNames: ['isolation_level'],
    registers: [exports.registry],
});
exports.sandboxStatusChange = new prom_client_1.Counter({
    name: 'sandbox_status_change_total',
    help: 'Total number of sandbox status changes',
    labelNames: ['from', 'to'],
    registers: [exports.registry],
});
exports.activeSandboxes = new prom_client_1.Gauge({
    name: 'sandbox_active_count',
    help: 'Number of currently active sandboxes',
    labelNames: ['isolation_level'],
    registers: [exports.registry],
});
// Data Lab metrics
exports.dataCloneOperations = new prom_client_1.Counter({
    name: 'datalab_clone_operations_total',
    help: 'Total number of data clone operations',
    labelNames: ['strategy', 'status'],
    registers: [exports.registry],
});
exports.syntheticDataGenerated = new prom_client_1.Counter({
    name: 'datalab_synthetic_data_generated_total',
    help: 'Total number of synthetic data generation operations',
    labelNames: ['status'],
    registers: [exports.registry],
});
exports.dataCloneDuration = new prom_client_1.Histogram({
    name: 'datalab_clone_duration_seconds',
    help: 'Duration of data clone operations',
    labelNames: ['strategy'],
    buckets: [0.1, 0.5, 1, 5, 10, 30, 60, 120],
    registers: [exports.registry],
});
// Enforcement metrics
exports.enforcementDecisions = new prom_client_1.Counter({
    name: 'sandbox_enforcement_decisions_total',
    help: 'Total number of enforcement decisions',
    labelNames: ['operation', 'allowed'],
    registers: [exports.registry],
});
exports.linkbackAttempts = new prom_client_1.Counter({
    name: 'sandbox_linkback_attempts_total',
    help: 'Total number of linkback attempts (always blocked)',
    labelNames: ['sandbox_id'],
    registers: [exports.registry],
});
// Promotion metrics
exports.promotionRequests = new prom_client_1.Counter({
    name: 'sandbox_promotion_requests_total',
    help: 'Total number of promotion requests',
    labelNames: ['status'],
    registers: [exports.registry],
});
exports.promotionExecuted = new prom_client_1.Counter({
    name: 'sandbox_promotion_executed_total',
    help: 'Total number of promotions executed',
    labelNames: ['status'],
    registers: [exports.registry],
});
// HTTP metrics
exports.httpRequestDuration = new prom_client_1.Histogram({
    name: 'sandbox_gateway_http_request_duration_seconds',
    help: 'Duration of HTTP requests',
    labelNames: ['method', 'path', 'status'],
    buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5],
    registers: [exports.registry],
});
exports.httpRequestsTotal = new prom_client_1.Counter({
    name: 'sandbox_gateway_http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'path', 'status'],
    registers: [exports.registry],
});
// Export all metrics
exports.metrics = {
    resolverDuration: exports.resolverDuration,
    resolverCalls: exports.resolverCalls,
    sandboxCreated: exports.sandboxCreated,
    sandboxStatusChange: exports.sandboxStatusChange,
    activeSandboxes: exports.activeSandboxes,
    dataCloneOperations: exports.dataCloneOperations,
    syntheticDataGenerated: exports.syntheticDataGenerated,
    dataCloneDuration: exports.dataCloneDuration,
    enforcementDecisions: exports.enforcementDecisions,
    linkbackAttempts: exports.linkbackAttempts,
    promotionRequests: exports.promotionRequests,
    promotionExecuted: exports.promotionExecuted,
    httpRequestDuration: exports.httpRequestDuration,
    httpRequestsTotal: exports.httpRequestsTotal,
    registry: exports.registry,
};
