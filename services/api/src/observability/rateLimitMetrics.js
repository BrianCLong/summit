"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metricsContentType = exports.rateLimitMetrics = void 0;
exports.renderMetrics = renderMetrics;
const prom_client_1 = require("prom-client");
const registry = new prom_client_1.Registry();
(0, prom_client_1.collectDefaultMetrics)({ register: registry });
exports.rateLimitMetrics = {
    registry,
    allowed: new prom_client_1.Counter({
        name: 'rate_limit_allowed_total',
        help: 'Count of requests allowed by the rate limiter',
        labelNames: ['bucket', 'source', 'endpoint'],
        registers: [registry],
    }),
    blocked: new prom_client_1.Counter({
        name: 'rate_limit_blocked_total',
        help: 'Count of requests blocked by the rate limiter',
        labelNames: ['bucket', 'source', 'reason', 'endpoint'],
        registers: [registry],
    }),
    backoff: new prom_client_1.Histogram({
        name: 'rate_limit_backoff_ms',
        help: 'Observed backoff durations applied when limits are exceeded',
        labelNames: ['bucket', 'endpoint'],
        buckets: [100, 250, 500, 1000, 2000, 4000, 8000, 16000, 30000, 60000],
        registers: [registry],
    }),
    circuitOpen: new prom_client_1.Gauge({
        name: 'rate_limit_circuit_open',
        help: 'Indicates whether the rate limiter circuit breaker is open (1) or closed (0)',
        registers: [registry],
    }),
    latency: new prom_client_1.Histogram({
        name: 'rate_limit_decision_latency_ms',
        help: 'Latency histogram for rate limit decision making',
        labelNames: ['source'],
        buckets: [1, 5, 10, 25, 50, 100, 250, 500],
        registers: [registry],
    }),
};
exports.metricsContentType = registry.contentType;
async function renderMetrics() {
    return registry.metrics();
}
