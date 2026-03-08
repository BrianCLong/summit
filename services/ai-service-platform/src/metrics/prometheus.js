"use strict";
/**
 * Prometheus Metrics
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestLatency = exports.complianceChecks = exports.activeServices = exports.deploymentDuration = exports.serviceDeployments = void 0;
exports.setupMetrics = setupMetrics;
const prom_client_1 = require("prom-client");
const register = new prom_client_1.Registry();
(0, prom_client_1.collectDefaultMetrics)({ register });
// Service metrics
exports.serviceDeployments = new prom_client_1.Counter({
    name: 'ai_platform_deployments_total',
    help: 'Total number of service deployments',
    labelNames: ['environment', 'status', 'type'],
    registers: [register],
});
exports.deploymentDuration = new prom_client_1.Histogram({
    name: 'ai_platform_deployment_duration_seconds',
    help: 'Time to deploy a service',
    labelNames: ['environment', 'type'],
    buckets: [5, 15, 30, 60, 120, 300],
    registers: [register],
});
exports.activeServices = new prom_client_1.Gauge({
    name: 'ai_platform_active_services',
    help: 'Number of active services',
    labelNames: ['type', 'environment'],
    registers: [register],
});
exports.complianceChecks = new prom_client_1.Counter({
    name: 'ai_platform_compliance_checks_total',
    help: 'Total compliance checks performed',
    labelNames: ['framework', 'result'],
    registers: [register],
});
exports.requestLatency = new prom_client_1.Histogram({
    name: 'ai_platform_request_latency_ms',
    help: 'Request latency in milliseconds',
    labelNames: ['method', 'route', 'status'],
    buckets: [10, 50, 100, 250, 500, 1000, 2500],
    registers: [register],
});
function setupMetrics(server) {
    // Request timing
    server.addHook('onRequest', async (request) => {
        request.startTime = Date.now();
    });
    server.addHook('onResponse', async (request, reply) => {
        const duration = Date.now() - (request.startTime || Date.now());
        exports.requestLatency.observe({
            method: request.method,
            route: request.routeOptions?.url || request.url,
            status: reply.statusCode.toString(),
        }, duration);
    });
    // Metrics endpoint
    server.get('/metrics', async (_request, reply) => {
        reply.header('Content-Type', register.contentType);
        return register.metrics();
    });
}
