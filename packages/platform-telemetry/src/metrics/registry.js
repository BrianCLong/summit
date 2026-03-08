"use strict";
/**
 * P31: Metrics Registry
 * Centralized metrics collection with Prometheus and OpenTelemetry support
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.cacheMetrics = exports.dbMetrics = exports.httpMetrics = exports.MetricsRegistry = void 0;
exports.getMetricsRegistry = getMetricsRegistry;
const prom_client_1 = require("prom-client");
const taxonomy_js_1 = require("./taxonomy.js");
const DEFAULT_CONFIG = {
    prefix: 'summit_',
    defaultLabels: {},
    collectDefaultMetrics: true,
    defaultMetricsInterval: 10000,
};
/**
 * Metrics registry for Summit platform
 */
class MetricsRegistry {
    config;
    registry;
    metrics = new Map();
    initialized = false;
    constructor(config = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.registry = new prom_client_1.Registry();
        if (Object.keys(this.config.defaultLabels).length > 0) {
            this.registry.setDefaultLabels(this.config.defaultLabels);
        }
    }
    /**
     * Initialize the metrics registry
     */
    initialize() {
        if (this.initialized) {
            return;
        }
        // Collect default Node.js metrics
        if (this.config.collectDefaultMetrics) {
            (0, prom_client_1.collectDefaultMetrics)({
                register: this.registry,
                prefix: this.config.prefix,
                gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5],
            });
        }
        // Register all taxonomy metrics
        this.registerTaxonomyMetrics();
        this.initialized = true;
    }
    /**
     * Register all metrics from taxonomy
     */
    registerTaxonomyMetrics() {
        for (const category of Object.values(taxonomy_js_1.MetricsTaxonomy)) {
            for (const metric of Object.values(category)) {
                this.registerMetric(metric);
            }
        }
    }
    /**
     * Register a single metric
     */
    registerMetric(definition) {
        const fullName = `${this.config.prefix}${definition.name}`;
        if (this.metrics.has(fullName)) {
            return this.metrics.get(fullName);
        }
        let metric;
        switch (definition.type) {
            case 'counter':
                metric = new prom_client_1.Counter({
                    name: fullName,
                    help: definition.description,
                    labelNames: definition.labels,
                    registers: [this.registry],
                });
                break;
            case 'gauge':
                metric = new prom_client_1.Gauge({
                    name: fullName,
                    help: definition.description,
                    labelNames: definition.labels,
                    registers: [this.registry],
                });
                break;
            case 'histogram':
                metric = new prom_client_1.Histogram({
                    name: fullName,
                    help: definition.description,
                    labelNames: definition.labels,
                    buckets: definition.buckets || [0.1, 0.5, 1, 2.5, 5, 10],
                    registers: [this.registry],
                });
                break;
            case 'summary':
                // Use histogram as summary alternative
                metric = new prom_client_1.Histogram({
                    name: fullName,
                    help: definition.description,
                    labelNames: definition.labels,
                    buckets: definition.buckets || [0.5, 0.9, 0.95, 0.99],
                    registers: [this.registry],
                });
                break;
            default:
                throw new Error(`Unknown metric type: ${definition.type}`);
        }
        this.metrics.set(fullName, metric);
        return metric;
    }
    /**
     * Get a counter metric
     */
    counter(name) {
        const fullName = `${this.config.prefix}${name}`;
        const metric = this.metrics.get(fullName);
        return metric instanceof prom_client_1.Counter ? metric : undefined;
    }
    /**
     * Get a gauge metric
     */
    gauge(name) {
        const fullName = `${this.config.prefix}${name}`;
        const metric = this.metrics.get(fullName);
        return metric instanceof prom_client_1.Gauge ? metric : undefined;
    }
    /**
     * Get a histogram metric
     */
    histogram(name) {
        const fullName = `${this.config.prefix}${name}`;
        const metric = this.metrics.get(fullName);
        return metric instanceof prom_client_1.Histogram ? metric : undefined;
    }
    /**
     * Increment a counter
     */
    inc(name, labels = {}, value = 1) {
        const counter = this.counter(name);
        if (counter) {
            counter.inc(labels, value);
        }
    }
    /**
     * Set a gauge value
     */
    set(name, labels, value) {
        const gauge = this.gauge(name);
        if (gauge) {
            gauge.set(labels, value);
        }
    }
    /**
     * Observe a histogram value
     */
    observe(name, labels, value) {
        const histogram = this.histogram(name);
        if (histogram) {
            histogram.observe(labels, value);
        }
    }
    /**
     * Start a timer for a histogram
     */
    startTimer(name, labels = {}) {
        const histogram = this.histogram(name);
        if (histogram) {
            return histogram.startTimer(labels);
        }
        // Return a no-op timer
        const start = Date.now();
        return () => (Date.now() - start) / 1000;
    }
    /**
     * Get metrics in Prometheus format
     */
    async getMetrics() {
        return this.registry.metrics();
    }
    /**
     * Get metrics content type
     */
    getContentType() {
        return this.registry.contentType;
    }
    /**
     * Get underlying registry
     */
    getRegistry() {
        return this.registry;
    }
    /**
     * Reset all metrics
     */
    reset() {
        this.registry.resetMetrics();
    }
    /**
     * Clear all metrics
     */
    clear() {
        this.registry.clear();
        this.metrics.clear();
        this.initialized = false;
    }
}
exports.MetricsRegistry = MetricsRegistry;
// Singleton instance
let defaultRegistry = null;
/**
 * Get or create default metrics registry
 */
function getMetricsRegistry(config) {
    if (!defaultRegistry) {
        defaultRegistry = new MetricsRegistry(config);
        defaultRegistry.initialize();
    }
    return defaultRegistry;
}
/**
 * HTTP metrics helpers
 */
exports.httpMetrics = {
    recordRequest(registry, method, path, statusCode, durationMs) {
        const labels = { method, path, status_code: String(statusCode) };
        registry.inc('http_requests_total', labels);
        registry.observe('http_request_duration_seconds', labels, durationMs / 1000);
    },
    incrementActiveRequests(registry, method) {
        registry.set('http_requests_active', { method }, 1);
    },
    decrementActiveRequests(registry, method) {
        registry.set('http_requests_active', { method }, -1);
    },
};
/**
 * Database metrics helpers
 */
exports.dbMetrics = {
    recordQuery(registry, database, operation, durationMs, error) {
        const labels = { database, operation };
        registry.inc('db_queries_total', labels);
        registry.observe('db_query_duration_seconds', labels, durationMs / 1000);
        if (error) {
            registry.inc('db_query_errors_total', { ...labels, error_type: error });
        }
    },
    setConnectionPoolMetrics(registry, database, size, active, waiting) {
        registry.set('db_connection_pool_size', { database }, size);
        registry.set('db_connection_pool_active', { database }, active);
        registry.set('db_connection_pool_waiting', { database }, waiting);
    },
};
/**
 * Cache metrics helpers
 */
exports.cacheMetrics = {
    recordHit(registry, layer) {
        registry.inc('cache_hits_total', { cache_layer: layer });
    },
    recordMiss(registry, layer) {
        registry.inc('cache_misses_total', { cache_layer: layer });
    },
    setHitRate(registry, layer, rate) {
        registry.set('cache_hit_rate', { cache_layer: layer }, rate);
    },
    setSize(registry, layer, size) {
        registry.set('cache_size', { cache_layer: layer }, size);
    },
};
