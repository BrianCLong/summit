"use strict";
/**
 * CompanyOS Tenant API - Metrics Middleware
 *
 * Prometheus-compatible metrics for observability
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.METRICS = exports.metrics = void 0;
exports.httpMetrics = httpMetrics;
exports.recordTenantOperation = recordTenantOperation;
exports.recordFeatureFlagEvaluation = recordFeatureFlagEvaluation;
exports.metricsHandler = metricsHandler;
class MetricsRegistry {
    counters = new Map();
    histograms = new Map();
    gauges = new Map();
    incrementCounter(name, labels = {}, value = 1) {
        const key = this.makeKey(name, labels);
        const existing = this.counters.get(key) || [];
        existing.push({ value, labels, timestamp: Date.now() });
        this.counters.set(key, existing);
    }
    observeHistogram(name, value, labels = {}) {
        const key = this.makeKey(name, labels);
        const existing = this.histograms.get(key) || [];
        existing.push({ value, labels, timestamp: Date.now() });
        this.histograms.set(key, existing);
    }
    setGauge(name, value, labels = {}) {
        const key = this.makeKey(name, labels);
        this.gauges.set(key, { value, labels, timestamp: Date.now() });
    }
    makeKey(name, labels) {
        const sortedLabels = Object.entries(labels)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([k, v]) => `${k}="${v}"`)
            .join(',');
        return `${name}{${sortedLabels}}`;
    }
    toPrometheusFormat() {
        const lines = [];
        // Counters
        for (const [key, values] of this.counters) {
            const total = values.reduce((acc, v) => acc + v.value, 0);
            lines.push(`${key} ${total}`);
        }
        // Histograms (simplified - just count and sum)
        const histogramGroups = new Map();
        for (const [key, values] of this.histograms) {
            const baseName = key.split('{')[0];
            const existing = histogramGroups.get(baseName) || [];
            existing.push(...values);
            histogramGroups.set(baseName, existing);
        }
        for (const [name, values] of histogramGroups) {
            const count = values.length;
            const sum = values.reduce((acc, v) => acc + v.value, 0);
            lines.push(`${name}_count ${count}`);
            lines.push(`${name}_sum ${sum.toFixed(3)}`);
        }
        // Gauges
        for (const [key, metric] of this.gauges) {
            lines.push(`${key} ${metric.value}`);
        }
        return lines.join('\n');
    }
}
exports.metrics = new MetricsRegistry();
// Predefined metrics
exports.METRICS = {
    HTTP_REQUESTS_TOTAL: 'companyos_tenant_api_http_requests_total',
    HTTP_REQUEST_DURATION_SECONDS: 'companyos_tenant_api_http_request_duration_seconds',
    TENANT_OPERATIONS_TOTAL: 'companyos_tenant_operations_total',
    FEATURE_FLAG_EVALUATIONS_TOTAL: 'companyos_feature_flag_evaluations_total',
    ACTIVE_TENANTS: 'companyos_active_tenants',
    GRAPHQL_REQUESTS_TOTAL: 'companyos_tenant_api_graphql_requests_total',
    GRAPHQL_ERRORS_TOTAL: 'companyos_tenant_api_graphql_errors_total',
};
/**
 * HTTP request metrics middleware
 */
function httpMetrics(req, res, next) {
    const startTime = process.hrtime.bigint();
    const path = req.route?.path || req.path;
    res.on('finish', () => {
        const durationNs = Number(process.hrtime.bigint() - startTime);
        const durationSeconds = durationNs / 1e9;
        const labels = {
            method: req.method,
            path: path,
            status: String(res.statusCode),
        };
        exports.metrics.incrementCounter(exports.METRICS.HTTP_REQUESTS_TOTAL, labels);
        exports.metrics.observeHistogram(exports.METRICS.HTTP_REQUEST_DURATION_SECONDS, durationSeconds, labels);
    });
    next();
}
/**
 * Record tenant operation metric
 */
function recordTenantOperation(operation, tenantId, success = true) {
    exports.metrics.incrementCounter(exports.METRICS.TENANT_OPERATIONS_TOTAL, {
        operation,
        tenant_id: tenantId || 'unknown',
        success: String(success),
    });
}
/**
 * Record feature flag evaluation metric
 */
function recordFeatureFlagEvaluation(flagName, tenantId, enabled) {
    exports.metrics.incrementCounter(exports.METRICS.FEATURE_FLAG_EVALUATIONS_TOTAL, {
        flag_name: flagName,
        tenant_id: tenantId,
        enabled: String(enabled),
    });
}
/**
 * Metrics endpoint handler
 */
function metricsHandler(req, res) {
    res.set('Content-Type', 'text/plain; charset=utf-8');
    res.send(exports.metrics.toPrometheusFormat());
}
