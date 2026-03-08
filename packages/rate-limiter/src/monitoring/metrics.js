"use strict";
/**
 * Rate Limiter Metrics and Monitoring
 *
 * MIT License
 * Copyright (c) 2025 IntelGraph
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.alerter = exports.metricsCollector = exports.RateLimitAlerter = exports.RateLimitMetricsCollector = void 0;
const pino_1 = __importDefault(require("pino"));
const logger = (0, pino_1.default)();
/**
 * Prometheus-style metrics collector
 */
class RateLimitMetricsCollector {
    metrics = new Map();
    violations = [];
    responseTimes = [];
    maxViolationsToStore = 1000;
    /**
     * Record a rate limit check
     */
    recordCheck(result, tier, endpoint, durationMs) {
        // Increment total requests
        this.incrementMetric('rate_limit_requests_total', { result, tier, endpoint });
        // Record response time
        this.responseTimes.push(durationMs);
        if (this.responseTimes.length > 10000) {
            this.responseTimes.shift(); // Keep only recent times
        }
        // Record violations
        if (result === 'denied') {
            this.incrementMetric('rate_limit_violations_total', { tier, endpoint });
        }
    }
    /**
     * Record a rate limit violation
     */
    recordViolation(violation) {
        this.violations.push(violation);
        // Keep only recent violations
        if (this.violations.length > this.maxViolationsToStore) {
            this.violations.shift();
        }
        // Increment violation metrics
        this.incrementMetric('rate_limit_violations_total', {
            tier: violation.tier,
            endpoint: violation.endpoint,
        });
    }
    /**
     * Set current usage gauge
     */
    setCurrentUsage(identifier, endpoint, tier, consumed, limit) {
        const utilization = limit > 0 ? consumed / limit : 0;
        this.setGauge('rate_limit_current_usage', { tier, endpoint }, utilization);
    }
    /**
     * Record algorithm execution time
     */
    recordAlgorithmDuration(algorithm, durationMs) {
        this.setGauge('rate_limit_algorithm_duration_ms', { algorithm }, durationMs);
    }
    /**
     * Get current metrics snapshot
     */
    getMetrics() {
        const totalRequests = this.getMetricSum('rate_limit_requests_total');
        const allowedRequests = this.getMetric('rate_limit_requests_total', { result: 'allowed' });
        const deniedRequests = this.getMetric('rate_limit_requests_total', { result: 'denied' });
        const errors = this.getMetric('rate_limit_requests_total', { result: 'error' });
        const avgResponseTime = this.calculateAverage(this.responseTimes);
        const p95ResponseTime = this.calculatePercentile(this.responseTimes, 0.95);
        const violationsByTier = {
            free: 0,
            basic: 0,
            premium: 0,
            enterprise: 0,
            internal: 0,
        };
        const violationsByEndpoint = {};
        for (const violation of this.violations) {
            if (violation.tier) {
                violationsByTier[violation.tier]++;
            }
            violationsByEndpoint[violation.endpoint] =
                (violationsByEndpoint[violation.endpoint] || 0) + 1;
        }
        return {
            totalRequests,
            allowedRequests,
            deniedRequests,
            errors,
            avgResponseTime,
            p95ResponseTime,
            violationsByTier,
            violationsByEndpoint,
        };
    }
    /**
     * Get Prometheus-formatted metrics
     */
    getPrometheusMetrics() {
        const lines = [];
        // Add help and type information
        lines.push('# HELP rate_limit_requests_total Total rate limit requests');
        lines.push('# TYPE rate_limit_requests_total counter');
        lines.push('# HELP rate_limit_violations_total Total rate limit violations');
        lines.push('# TYPE rate_limit_violations_total counter');
        lines.push('# HELP rate_limit_current_usage Current rate limit utilization (0-1)');
        lines.push('# TYPE rate_limit_current_usage gauge');
        lines.push('# HELP rate_limit_algorithm_duration_ms Rate limit algorithm execution time');
        lines.push('# TYPE rate_limit_algorithm_duration_ms gauge');
        // Add metrics
        for (const [key, value] of this.metrics.entries()) {
            lines.push(`${key} ${value}`);
        }
        return lines.join('\n');
    }
    /**
     * Get recent violations
     */
    getRecentViolations(limit = 100) {
        return this.violations.slice(-limit);
    }
    /**
     * Check if alert threshold exceeded
     */
    checkAlertThreshold(endpoint, tier, threshold) {
        const utilization = this.getGauge('rate_limit_current_usage', { tier, endpoint });
        return utilization >= threshold;
    }
    /**
     * Reset metrics
     */
    reset() {
        this.metrics.clear();
        this.violations = [];
        this.responseTimes = [];
    }
    // Private helper methods
    incrementMetric(name, labels) {
        const key = this.formatMetricKey(name, labels);
        const current = this.metrics.get(key) || 0;
        this.metrics.set(key, current + 1);
    }
    setGauge(name, labels, value) {
        const key = this.formatMetricKey(name, labels);
        this.metrics.set(key, value);
    }
    getMetric(name, labels) {
        const key = this.formatMetricKey(name, labels);
        return this.metrics.get(key) || 0;
    }
    getGauge(name, labels) {
        return this.getMetric(name, labels);
    }
    getMetricSum(prefix) {
        let sum = 0;
        for (const [key, value] of this.metrics.entries()) {
            if (key.startsWith(prefix)) {
                sum += value;
            }
        }
        return sum;
    }
    formatMetricKey(name, labels) {
        const labelPairs = Object.entries(labels)
            .filter(([_, value]) => value !== undefined)
            .map(([key, value]) => `${key}="${value}"`)
            .join(',');
        return labelPairs ? `${name}{${labelPairs}}` : name;
    }
    calculateAverage(values) {
        if (values.length === 0) {
            return 0;
        }
        const sum = values.reduce((a, b) => a + b, 0);
        return sum / values.length;
    }
    calculatePercentile(values, percentile) {
        if (values.length === 0) {
            return 0;
        }
        const sorted = [...values].sort((a, b) => a - b);
        const index = Math.ceil(sorted.length * percentile) - 1;
        return sorted[index] || 0;
    }
}
exports.RateLimitMetricsCollector = RateLimitMetricsCollector;
/**
 * Alerting system for rate limit violations
 */
class RateLimitAlerter {
    alertCallbacks = [];
    alertThreshold;
    constructor(alertThreshold = 0.9) {
        this.alertThreshold = alertThreshold;
    }
    /**
     * Register alert callback
     */
    onAlert(callback) {
        this.alertCallbacks.push(callback);
    }
    /**
     * Trigger alert for violation
     */
    async triggerAlert(violation) {
        logger.warn({
            message: 'Rate limit violation alert',
            violation,
        });
        for (const callback of this.alertCallbacks) {
            try {
                await callback(violation);
            }
            catch (error) {
                logger.error({
                    message: 'Alert callback failed',
                    error: error instanceof Error ? error.message : String(error),
                });
            }
        }
    }
    /**
     * Check if should alert based on utilization
     */
    shouldAlert(consumed, limit) {
        if (limit === 0) {
            return false;
        }
        const utilization = consumed / limit;
        return utilization >= this.alertThreshold;
    }
}
exports.RateLimitAlerter = RateLimitAlerter;
/**
 * Export singleton instances
 */
exports.metricsCollector = new RateLimitMetricsCollector();
exports.alerter = new RateLimitAlerter();
