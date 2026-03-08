"use strict";
/**
 * Metrics Collector
 *
 * Collects and aggregates API metrics
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetricsCollector = void 0;
const events_1 = require("events");
class MetricsCollector extends events_1.EventEmitter {
    metrics = [];
    requestDurations = [];
    recordRequest(duration, statusCode, tags) {
        const metric = {
            name: 'api.request',
            value: 1,
            timestamp: Date.now(),
            tags: { ...tags, status: String(statusCode) },
        };
        this.metrics.push(metric);
        this.requestDurations.push(duration);
        this.emit('metric', metric);
    }
    recordError(statusCode, error, tags) {
        const metric = {
            name: 'api.error',
            value: 1,
            timestamp: Date.now(),
            tags: { ...tags, status: String(statusCode), error },
        };
        this.metrics.push(metric);
        this.emit('error', metric);
    }
    getAggregatedMetrics(windowMs = 60000) {
        const now = Date.now();
        const windowStart = now - windowMs;
        const recentMetrics = this.metrics.filter(m => m.timestamp >= windowStart);
        const recentDurations = this.requestDurations.filter((_, i) => this.metrics[i]?.timestamp >= windowStart);
        const requests = recentMetrics.filter(m => m.name === 'api.request');
        const errors = recentMetrics.filter(m => m.name === 'api.error');
        const successful = requests.filter(m => {
            const status = parseInt(m.tags?.status || '0');
            return status >= 200 && status < 400;
        }).length;
        const failed = requests.length - successful;
        const errorsByCode = {};
        errors.forEach(m => {
            const status = parseInt(m.tags?.status || '0');
            errorsByCode[status] = (errorsByCode[status] || 0) + 1;
        });
        const sortedDurations = [...recentDurations].sort((a, b) => a - b);
        return {
            requests: {
                total: requests.length,
                successful,
                failed,
                ratePerSecond: requests.length / (windowMs / 1000),
            },
            latency: {
                min: sortedDurations[0] || 0,
                max: sortedDurations[sortedDurations.length - 1] || 0,
                avg: sortedDurations.reduce((a, b) => a + b, 0) / sortedDurations.length || 0,
                p50: this.percentile(sortedDurations, 0.50),
                p95: this.percentile(sortedDurations, 0.95),
                p99: this.percentile(sortedDurations, 0.99),
            },
            errors: {
                total: errors.length,
                byStatusCode: errorsByCode,
                rate: errors.length / (windowMs / 1000),
            },
        };
    }
    percentile(sorted, p) {
        if (sorted.length === 0) {
            return 0;
        }
        const index = Math.ceil(sorted.length * p) - 1;
        return sorted[Math.max(0, index)];
    }
    reset() {
        this.metrics = [];
        this.requestDurations = [];
    }
}
exports.MetricsCollector = MetricsCollector;
