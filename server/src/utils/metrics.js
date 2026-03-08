"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrometheusMetrics = void 0;
/**
 * A utility class for managing Prometheus-style metrics in memory.
 *
 * This class allows defining and updating gauges, counters, and histograms.
 * It is primarily useful for lightweight metrics collection or testing where
 * a full Prometheus client might be overkill or unavailable.
 */
class PrometheusMetrics {
    namespace;
    gauges = new Map();
    counters = new Map();
    histograms = new Map();
    gaugeDefinitions = new Map();
    counterDefinitions = new Map();
    histogramDefinitions = new Map();
    /**
     * Initializes a new instance of PrometheusMetrics.
     *
     * @param namespace - A namespace prefix to apply to all metric keys.
     */
    constructor(namespace) {
        this.namespace = namespace;
    }
    /**
     * Defines a new gauge metric.
     *
     * @param name - The name of the gauge.
     * @param help - A help string describing the metric.
     * @param labelNames - Optional list of label names that will be used with this metric.
     */
    createGauge(name, help, labelNames = []) {
        this.gaugeDefinitions.set(name, { name, help, labelNames });
    }
    /**
     * Defines a new counter metric.
     *
     * @param name - The name of the counter.
     * @param help - A help string describing the metric.
     * @param labelNames - Optional list of label names that will be used with this metric.
     */
    createCounter(name, help, labelNames = []) {
        this.counterDefinitions.set(name, { name, help, labelNames });
    }
    /**
     * Defines a new histogram metric.
     *
     * @param name - The name of the histogram.
     * @param help - A help string describing the metric.
     * @param options - Configuration options, such as custom buckets.
     */
    createHistogram(name, help, options = {}) {
        this.histogramDefinitions.set(name, {
            name,
            help,
            buckets: options.buckets,
        });
    }
    /**
     * Sets the value of a gauge.
     *
     * @param name - The name of the gauge to update.
     * @param value - The new value.
     * @param labels - Optional labels to identify the specific metric series.
     */
    setGauge(name, value, labels = {}) {
        const key = this.metricKey(name, labels);
        this.gauges.set(key, value);
    }
    /**
     * Increments a counter.
     *
     * @param name - The name of the counter to increment.
     * @param labels - Optional labels to identify the specific metric series.
     * @param value - The amount to increment by (default: 1).
     */
    incrementCounter(name, labels = {}, value = 1) {
        const key = this.metricKey(name, labels);
        const current = this.counters.get(key) ?? 0;
        this.counters.set(key, current + value);
    }
    /**
     * Observes a value in a histogram.
     *
     * @param name - The name of the histogram.
     * @param value - The value to observe.
     * @param labels - Optional labels to identify the specific metric series.
     */
    observeHistogram(name, value, labels = {}) {
        const key = this.metricKey(name, labels);
        const values = this.histograms.get(key) ?? [];
        values.push(value);
        if (values.length > 1000) {
            values.shift();
        }
        this.histograms.set(key, values);
    }
    metricKey(name, labels) {
        const keys = Object.keys(labels);
        if (keys.length === 0) {
            return `${this.namespace}:${name}`;
        }
        // Sort keys to ensure deterministic order (needed for cache key consistency)
        // Using keys array is lighter than Object.entries
        keys.sort();
        let labelString = '';
        for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            if (i > 0)
                labelString += '|';
            labelString += `${key}=${labels[key]}`;
        }
        return `${this.namespace}:${name}:{${labelString}}`;
    }
}
exports.PrometheusMetrics = PrometheusMetrics;
