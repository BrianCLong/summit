"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.metricsCollector = void 0;
exports.metricsMiddleware = metricsMiddleware;
exports.setupMetrics = setupMetrics;
const logger_1 = __importDefault(require("./logger"));
// Metrics collection for Active Measures module
class MetricsCollector {
    metrics = new Map();
    startTime = Date.now();
    constructor() {
        this.initializeMetrics();
    }
    initializeMetrics() {
        this.metrics.set('operations_total', 0);
        this.metrics.set('operations_success', 0);
        this.metrics.set('operations_failed', 0);
        this.metrics.set('simulations_total', 0);
        this.metrics.set('simulations_completed', 0);
        this.metrics.set('audit_entries_total', 0);
        this.metrics.set('security_violations', 0);
        this.metrics.set('classification_breaches', 0);
        this.metrics.set('effectiveness_scores', []);
        this.metrics.set('response_times', []);
    }
    incrementCounter(metric, value = 1) {
        const current = this.metrics.get(metric) || 0;
        this.metrics.set(metric, current + value);
        logger_1.default.debug('Metric incremented', { metric, value, newTotal: current + value });
    }
    recordHistogram(metric, value) {
        const values = this.metrics.get(metric) || [];
        values.push(value);
        // Keep only last 1000 values for memory efficiency
        if (values.length > 1000) {
            values.shift();
        }
        this.metrics.set(metric, values);
    }
    setGauge(metric, value) {
        this.metrics.set(metric, value);
    }
    getMetric(metric) {
        return this.metrics.get(metric);
    }
    getAllMetrics() {
        const result = {};
        for (const [key, value] of this.metrics.entries()) {
            if (Array.isArray(value)) {
                result[key] = {
                    count: value.length,
                    avg: value.reduce((a, b) => a + b, 0) / value.length || 0,
                    min: Math.min(...value) || 0,
                    max: Math.max(...value) || 0,
                };
            }
            else {
                result[key] = value;
            }
        }
        result.uptime_seconds = Math.floor((Date.now() - this.startTime) / 1000);
        return result;
    }
    // Calculate operation success rate
    getSuccessRate() {
        const total = this.getMetric('operations_total') || 0;
        const success = this.getMetric('operations_success') || 0;
        return total > 0 ? (success / total) * 100 : 0;
    }
    // Calculate average effectiveness score
    getAverageEffectiveness() {
        const scores = this.getMetric('effectiveness_scores') || [];
        return scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    }
    // Get response time percentiles
    getResponseTimePercentiles() {
        const times = this.getMetric('response_times') || [];
        if (times.length === 0)
            return { p50: 0, p95: 0, p99: 0 };
        const sorted = times.sort((a, b) => a - b);
        return {
            p50: sorted[Math.floor(sorted.length * 0.5)],
            p95: sorted[Math.floor(sorted.length * 0.95)],
            p99: sorted[Math.floor(sorted.length * 0.99)],
        };
    }
}
exports.metricsCollector = new MetricsCollector();
// Express middleware for metrics collection
function metricsMiddleware(req, res, next) {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        exports.metricsCollector.recordHistogram('response_times', duration);
        // Track operation-specific metrics
        if (req.path.includes('/graphql')) {
            if (res.statusCode >= 200 && res.statusCode < 300) {
                exports.metricsCollector.incrementCounter('graphql_requests_success');
            }
            else {
                exports.metricsCollector.incrementCounter('graphql_requests_failed');
            }
        }
        // Security metrics
        if (res.statusCode === 401 || res.statusCode === 403) {
            exports.metricsCollector.incrementCounter('security_violations');
        }
    });
    next();
}
// Setup metrics endpoint
function setupMetrics(app) {
    app.get('/metrics', (req, res) => {
        try {
            const metrics = exports.metricsCollector.getAllMetrics();
            const successRate = exports.metricsCollector.getSuccessRate();
            const avgEffectiveness = exports.metricsCollector.getAverageEffectiveness();
            const responseTimePercentiles = exports.metricsCollector.getResponseTimePercentiles();
            const response = {
                timestamp: new Date().toISOString(),
                service: 'active-measures-module',
                version: '2.0.0-military-spec',
                metrics,
                kpis: {
                    success_rate_percent: successRate,
                    average_effectiveness_score: avgEffectiveness,
                    response_time_percentiles: responseTimePercentiles,
                },
                health: {
                    status: 'healthy',
                    uptime_seconds: metrics.uptime_seconds,
                },
            };
            res.json(response);
        }
        catch (error) {
            logger_1.default.error('Failed to generate metrics', { error: error.message });
            res.status(500).json({ error: 'Failed to generate metrics' });
        }
    });
    logger_1.default.info('Metrics endpoint configured at /metrics');
}
exports.default = exports.metricsCollector;
