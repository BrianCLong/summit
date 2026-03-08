"use strict";
/**
 * Metrics Middleware
 * Prometheus metrics collection for observability
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.metrics = void 0;
exports.metricsMiddleware = metricsMiddleware;
exports.metricsHandler = metricsHandler;
const config_js_1 = require("../config.js");
class Counter {
    values = new Map();
    inc(labels = {}, value = 1) {
        const key = JSON.stringify(labels);
        const current = this.values.get(key) || 0;
        this.values.set(key, current + value);
    }
    getValues() {
        return Array.from(this.values.entries()).map(([key, value]) => ({
            value,
            labels: JSON.parse(key),
        }));
    }
}
class Histogram {
    buckets = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10];
    observations = new Map();
    observe(labels, value) {
        const key = JSON.stringify(labels);
        const obs = this.observations.get(key) || [];
        obs.push(value);
        this.observations.set(key, obs);
    }
    getValues() {
        return Array.from(this.observations.entries()).map(([key, values]) => {
            const sum = values.reduce((a, b) => a + b, 0);
            return {
                value: values.length > 0 ? sum / values.length : 0,
                labels: JSON.parse(key),
            };
        });
    }
}
// ============================================================================
// METRIC DEFINITIONS
// ============================================================================
exports.metrics = {
    httpRequestsTotal: new Counter(),
    httpRequestDuration: new Histogram(),
    opaDecisionsTotal: new Counter(),
    opaDecisionDuration: new Histogram(),
    rateLimitBlocks: new Counter(),
};
// ============================================================================
// MIDDLEWARE
// ============================================================================
/**
 * Metrics collection middleware
 */
function metricsMiddleware(req, res, next) {
    if (!config_js_1.config.metricsEnabled) {
        next();
        return;
    }
    const start = Date.now();
    res.on('finish', () => {
        const duration = (Date.now() - start) / 1000;
        const labels = {
            method: req.method,
            path: normalizePath(req.path),
            status: String(res.statusCode),
            service: config_js_1.config.serviceName,
        };
        exports.metrics.httpRequestsTotal.inc(labels);
        exports.metrics.httpRequestDuration.observe(labels, duration);
    });
    next();
}
/**
 * Metrics endpoint handler
 */
function metricsHandler(req, res) {
    const lines = [];
    // HTTP requests total
    lines.push('# HELP http_requests_total Total HTTP requests');
    lines.push('# TYPE http_requests_total counter');
    for (const { value, labels } of exports.metrics.httpRequestsTotal.getValues()) {
        const labelStr = Object.entries(labels)
            .map(([k, v]) => `${k}="${v}"`)
            .join(',');
        lines.push(`http_requests_total{${labelStr}} ${value}`);
    }
    // HTTP request duration
    lines.push('# HELP http_request_duration_seconds HTTP request duration');
    lines.push('# TYPE http_request_duration_seconds histogram');
    for (const { value, labels } of exports.metrics.httpRequestDuration.getValues()) {
        const labelStr = Object.entries(labels)
            .map(([k, v]) => `${k}="${v}"`)
            .join(',');
        lines.push(`http_request_duration_seconds{${labelStr}} ${value}`);
    }
    // OPA decisions
    lines.push('# HELP opa_decisions_total Total OPA decisions');
    lines.push('# TYPE opa_decisions_total counter');
    for (const { value, labels } of exports.metrics.opaDecisionsTotal.getValues()) {
        const labelStr = Object.entries(labels)
            .map(([k, v]) => `${k}="${v}"`)
            .join(',');
        lines.push(`opa_decisions_total{${labelStr}} ${value}`);
    }
    // Rate limit blocks
    lines.push('# HELP rate_limit_blocks_total Total rate limit blocks');
    lines.push('# TYPE rate_limit_blocks_total counter');
    for (const { value, labels } of exports.metrics.rateLimitBlocks.getValues()) {
        const labelStr = Object.entries(labels)
            .map(([k, v]) => `${k}="${v}"`)
            .join(',');
        lines.push(`rate_limit_blocks_total{${labelStr}} ${value}`);
    }
    res.set('Content-Type', 'text/plain');
    res.send(lines.join('\n'));
}
/**
 * Normalize path for metrics (remove IDs)
 */
function normalizePath(path) {
    return path
        .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:id')
        .replace(/\/\d+/g, '/:id');
}
