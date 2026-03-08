"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordEndpointResult = recordEndpointResult;
exports.incrementTenantBudgetHit = incrementTenantBudgetHit;
exports.resetReliabilityMetrics = resetReliabilityMetrics;
// @ts-nocheck
const prom_client_1 = require("prom-client");
const metrics_js_1 = require("../metrics.js");
const latencyHistogram = getOrCreateHistogram('reliability_request_duration_seconds', 'Endpoint latency for high-traffic reliability surfaces', ['endpoint', 'status'], [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5]);
const latencySummary = getOrCreateSummary('reliability_request_latency_quantiles', 'p50/p95 latency for reliability endpoints', ['endpoint'], [0.5, 0.95]);
const errorCounter = getOrCreateCounter('reliability_request_errors_total', 'Error responses for reliability endpoints', ['endpoint', 'status']);
const queueDepthGauge = getOrCreateGauge('reliability_queue_depth', 'In-flight/backlog size for hot paths', ['endpoint', 'tenant']);
const tenantQueryBudgetHits = getOrCreateCounter('tenant_query_budget_hits_total', 'Per-tenant budget consumption for query-style endpoints', ['tenant', 'endpoint']);
function recordEndpointResult(options) {
    const endpoint = options.endpoint;
    const tenantLabel = normalizeTenant(options.tenantId);
    const statusLabel = classifyStatus(options.statusCode);
    latencyHistogram.labels(endpoint, statusLabel).observe(options.durationSeconds);
    latencySummary.labels(endpoint).observe(options.durationSeconds);
    if (options.statusCode >= 400) {
        errorCounter.labels(endpoint, statusLabel).inc();
    }
    if (options.queueDepth !== undefined) {
        queueDepthGauge.labels(endpoint, tenantLabel).set(options.queueDepth);
    }
}
function incrementTenantBudgetHit(endpoint, tenantId) {
    tenantQueryBudgetHits.labels(normalizeTenant(tenantId), endpoint).inc();
}
function resetReliabilityMetrics() {
    latencyHistogram.reset();
    latencySummary.reset();
    errorCounter.reset();
    queueDepthGauge.reset();
    tenantQueryBudgetHits.reset();
}
function classifyStatus(statusCode) {
    if (statusCode >= 500)
        return '5xx';
    if (statusCode >= 400)
        return '4xx';
    if (statusCode >= 300)
        return '3xx';
    if (statusCode >= 200)
        return '2xx';
    return '1xx';
}
function normalizeTenant(tenantId) {
    if (!tenantId) {
        return 'unknown';
    }
    return String(tenantId)
        .replace(/[^a-zA-Z0-9:_-]/g, '_')
        .substring(0, 48);
}
function getOrCreateHistogram(name, help, labelNames, buckets) {
    const existing = metrics_js_1.registry.getSingleMetric(name);
    if (existing instanceof prom_client_1.Histogram) {
        return existing;
    }
    const metric = new prom_client_1.Histogram({
        name,
        help,
        labelNames,
        buckets,
        registers: [metrics_js_1.registry],
    });
    return metric;
}
function getOrCreateSummary(name, help, labelNames, percentiles) {
    const existing = metrics_js_1.registry.getSingleMetric(name);
    if (existing instanceof prom_client_1.Summary) {
        return existing;
    }
    return new prom_client_1.Summary({
        name,
        help,
        labelNames,
        percentiles,
        maxAgeSeconds: 600,
        ageBuckets: 5,
        registers: [metrics_js_1.registry],
    });
}
function getOrCreateCounter(name, help, labelNames) {
    const existing = metrics_js_1.registry.getSingleMetric(name);
    if (existing instanceof prom_client_1.Counter) {
        return existing;
    }
    return new prom_client_1.Counter({
        name,
        help,
        labelNames,
        registers: [metrics_js_1.registry],
    });
}
function getOrCreateGauge(name, help, labelNames) {
    const existing = metrics_js_1.registry.getSingleMetric(name);
    if (existing instanceof prom_client_1.Gauge) {
        return existing;
    }
    return new prom_client_1.Gauge({
        name,
        help,
        labelNames,
        registers: [metrics_js_1.registry],
    });
}
