"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.neo4jPerformanceMonitor = exports.Neo4jPerformanceMonitor = void 0;
const pino_1 = __importDefault(require("pino"));
const neo4jMetrics_js_1 = require("../metrics/neo4jMetrics.js");
const logger = pino_1.default({ name: 'neo4j-performance-monitor' });
class Neo4jPerformanceMonitor {
    slowQueryThresholdMs;
    maxTrackedQueries;
    slowQueries = [];
    recentErrors = [];
    labelCache = new Map();
    constructor(options) {
        this.slowQueryThresholdMs = options.slowQueryThresholdMs;
        this.maxTrackedQueries = options.maxTrackedQueries;
    }
    recordSuccess(outcome) {
        const { cypher, durationMs } = outcome;
        const labels = this.normalizeLabels(outcome.labels);
        this.incrementCounter(neo4jMetrics_js_1.neo4jQueryTotal, labels);
        this.observeHistogram(neo4jMetrics_js_1.neo4jQueryLatencyMs, labels, durationMs);
        if (durationMs >= this.slowQueryThresholdMs) {
            // BOLT: Only create the normalized outcome object for slow queries
            // to avoid unnecessary spreads on every successful query.
            const normalizedOutcome = { ...outcome, labels };
            this.trackSlowQuery(normalizedOutcome);
        }
        if (durationMs >= this.slowQueryThresholdMs * 2) {
            logger.warn({
                cypher: cypher.slice(0, 240),
                durationMs,
                operation: labels.operation,
                label: labels.label,
            }, 'Neo4j slow query detected');
        }
    }
    recordError(outcome) {
        const { durationMs } = outcome;
        const labels = this.normalizeLabels(outcome.labels);
        this.incrementCounter(neo4jMetrics_js_1.neo4jQueryTotal, labels);
        this.incrementCounter(neo4jMetrics_js_1.neo4jQueryErrorsTotal, labels);
        this.observeHistogram(neo4jMetrics_js_1.neo4jQueryLatencyMs, labels, durationMs);
        // BOLT: Spread directly into the recentErrors array to avoid intermediate object creation.
        this.recentErrors.unshift({ ...outcome, labels, timestamp: Date.now() });
        this.trimTracked(this.recentErrors);
    }
    getSlowQueries() {
        return [...this.slowQueries];
    }
    getRecentErrors() {
        return [...this.recentErrors];
    }
    reset() {
        this.slowQueries.length = 0;
        this.recentErrors.length = 0;
        neo4jMetrics_js_1.neo4jQueryTotal.reset();
        neo4jMetrics_js_1.neo4jQueryErrorsTotal.reset();
        neo4jMetrics_js_1.neo4jQueryLatencyMs.reset();
    }
    trackSlowQuery(outcome) {
        this.slowQueries.unshift({ ...outcome, timestamp: Date.now() });
        this.trimTracked(this.slowQueries);
    }
    trimTracked(buffer) {
        if (buffer.length > this.maxTrackedQueries) {
            buffer.length = this.maxTrackedQueries;
        }
    }
    normalizeLabels(labels) {
        const operation = labels?.operation || 'unknown';
        const label = labels?.label || 'unlabeled';
        const tenant_id = labels?.tenant_id || 'unknown';
        // BOLT: Cache label objects to reduce GC pressure and allocation overhead.
        const cacheKey = `${operation}:${label}:${tenant_id}`;
        let cached = this.labelCache.get(cacheKey);
        if (!cached) {
            cached = { operation, label, tenant_id };
            // Limit cache size to prevent memory leaks
            if (this.labelCache.size < 1000) {
                this.labelCache.set(cacheKey, cached);
            }
        }
        return cached;
    }
    incrementCounter(metric, labels) {
        const labeled = this.getLabeledMetric(metric, labels);
        if (labeled && typeof labeled.inc === 'function') {
            labeled.inc();
            return;
        }
        if (typeof metric?.inc === 'function') {
            metric.inc(1);
        }
    }
    observeHistogram(metric, labels, value) {
        const labeled = this.getLabeledMetric(metric, labels);
        if (labeled && typeof labeled.observe === 'function') {
            labeled.observe(value);
            return;
        }
        if (typeof metric?.observe === 'function') {
            metric.observe(value);
        }
    }
    getLabeledMetric(metric, labels) {
        if (typeof metric?.labels !== 'function') {
            return null;
        }
        try {
            return metric.labels(labels.operation, labels.label, labels.tenant_id);
        }
        catch {
            // Fall through to object-label form.
        }
        try {
            return metric.labels(labels);
        }
        catch {
            return null;
        }
    }
}
exports.Neo4jPerformanceMonitor = Neo4jPerformanceMonitor;
const defaultMonitor = new Neo4jPerformanceMonitor({
    slowQueryThresholdMs: Number(process.env.NEO4J_SLOW_QUERY_THRESHOLD_MS) || 500,
    maxTrackedQueries: Number(process.env.NEO4J_SLOW_QUERY_BUFFER || 50),
});
exports.neo4jPerformanceMonitor = defaultMonitor;
