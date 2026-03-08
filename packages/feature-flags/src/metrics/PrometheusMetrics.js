"use strict";
/**
 * Prometheus Metrics Implementation
 *
 * Prometheus metrics for feature flag operations
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrometheusMetrics = void 0;
const prom_client_1 = require("prom-client");
/**
 * Prometheus-based feature flag metrics
 */
class PrometheusMetrics {
    registry;
    prefix;
    // Metrics
    evaluationCounter;
    evaluationDuration;
    cacheHitCounter;
    cacheMissCounter;
    errorCounter;
    constructor(config = {}) {
        this.registry = config.registry ?? new prom_client_1.Registry();
        this.prefix = config.prefix ?? 'feature_flags_';
        // Initialize metrics
        this.evaluationCounter = new prom_client_1.Counter({
            name: `${this.prefix}evaluations_total`,
            help: 'Total number of feature flag evaluations',
            labelNames: ['flag_key', 'variation'],
            registers: [this.registry],
        });
        this.evaluationDuration = new prom_client_1.Histogram({
            name: `${this.prefix}evaluation_duration_ms`,
            help: 'Duration of feature flag evaluations in milliseconds',
            labelNames: ['flag_key'],
            buckets: [1, 5, 10, 25, 50, 100, 250, 500, 1000],
            registers: [this.registry],
        });
        this.cacheHitCounter = new prom_client_1.Counter({
            name: `${this.prefix}cache_hits_total`,
            help: 'Total number of cache hits',
            labelNames: ['flag_key'],
            registers: [this.registry],
        });
        this.cacheMissCounter = new prom_client_1.Counter({
            name: `${this.prefix}cache_misses_total`,
            help: 'Total number of cache misses',
            labelNames: ['flag_key'],
            registers: [this.registry],
        });
        this.errorCounter = new prom_client_1.Counter({
            name: `${this.prefix}errors_total`,
            help: 'Total number of errors during flag evaluation',
            labelNames: ['flag_key', 'error_type'],
            registers: [this.registry],
        });
        // Enable default metrics if requested
        if (config.enableDefaultMetrics) {
            this.registry.setDefaultLabels({
                service: 'feature-flags',
            });
        }
    }
    /**
     * Record flag evaluation
     */
    recordEvaluation(flagKey, variation, duration) {
        this.evaluationCounter.inc({ flag_key: flagKey, variation });
        this.evaluationDuration.observe({ flag_key: flagKey }, duration);
    }
    /**
     * Record cache hit
     */
    recordCacheHit(flagKey) {
        this.cacheHitCounter.inc({ flag_key: flagKey });
    }
    /**
     * Record cache miss
     */
    recordCacheMiss(flagKey) {
        this.cacheMissCounter.inc({ flag_key: flagKey });
    }
    /**
     * Record error
     */
    recordError(flagKey, error) {
        this.errorCounter.inc({
            flag_key: flagKey,
            error_type: error.constructor.name,
        });
    }
    /**
     * Get metrics registry
     */
    getRegistry() {
        return this.registry;
    }
    /**
     * Get metrics as string (for /metrics endpoint)
     */
    async getMetrics() {
        return this.registry.metrics();
    }
}
exports.PrometheusMetrics = PrometheusMetrics;
