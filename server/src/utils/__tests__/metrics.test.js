"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const metrics_js_1 = require("../metrics.js");
(0, globals_1.describe)('PrometheusMetrics', () => {
    let metrics;
    (0, globals_1.beforeEach)(() => {
        metrics = new metrics_js_1.PrometheusMetrics('test_ns');
    });
    (0, globals_1.describe)('metricKey', () => {
        // Access private method for testing purposes via any cast
        const getMetricKey = (name, labels) => {
            return metrics.metricKey(name, labels);
        };
        (0, globals_1.it)('should generate key without labels', () => {
            (0, globals_1.expect)(getMetricKey('counter', {})).toBe('test_ns:counter');
        });
        (0, globals_1.it)('should generate key with single label', () => {
            (0, globals_1.expect)(getMetricKey('counter', { region: 'us' })).toBe('test_ns:counter:{region=us}');
        });
        (0, globals_1.it)('should generate key with multiple labels sorted alphabetically', () => {
            (0, globals_1.expect)(getMetricKey('counter', { region: 'us', env: 'prod' })).toBe('test_ns:counter:{env=prod|region=us}');
        });
        (0, globals_1.it)('should handle labels inserted in different order', () => {
            const key1 = getMetricKey('counter', { a: '1', b: '2' });
            const key2 = getMetricKey('counter', { b: '2', a: '1' });
            (0, globals_1.expect)(key1).toBe('test_ns:counter:{a=1|b=2}');
            (0, globals_1.expect)(key1).toBe(key2);
        });
    });
    (0, globals_1.describe)('Counters', () => {
        (0, globals_1.it)('should increment counter', () => {
            metrics.createCounter('requests', 'Total requests');
            metrics.incrementCounter('requests');
            (0, globals_1.expect)(metrics.counters.get('test_ns:requests')).toBe(1);
            metrics.incrementCounter('requests', {}, 2);
            (0, globals_1.expect)(metrics.counters.get('test_ns:requests')).toBe(3);
        });
        (0, globals_1.it)('should increment counter with labels', () => {
            metrics.createCounter('requests', 'Total requests');
            metrics.incrementCounter('requests', { status: '200' });
            (0, globals_1.expect)(metrics.counters.get('test_ns:requests:{status=200}')).toBe(1);
        });
    });
    (0, globals_1.describe)('Gauges', () => {
        (0, globals_1.it)('should set gauge value', () => {
            metrics.createGauge('memory', 'Memory usage');
            metrics.setGauge('memory', 1024);
            (0, globals_1.expect)(metrics.gauges.get('test_ns:memory')).toBe(1024);
            metrics.setGauge('memory', 2048);
            (0, globals_1.expect)(metrics.gauges.get('test_ns:memory')).toBe(2048);
        });
    });
    (0, globals_1.describe)('Histograms', () => {
        (0, globals_1.it)('should observe histogram values', () => {
            metrics.createHistogram('latency', 'Request latency');
            metrics.observeHistogram('latency', 0.1);
            metrics.observeHistogram('latency', 0.2);
            const values = metrics.histograms.get('test_ns:latency');
            (0, globals_1.expect)(values).toHaveLength(2);
            (0, globals_1.expect)(values).toContain(0.1);
            (0, globals_1.expect)(values).toContain(0.2);
        });
    });
});
