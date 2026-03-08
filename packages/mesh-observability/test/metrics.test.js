"use strict";
/**
 * Metrics Tests
 */
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const metrics_js_1 = require("../src/metrics.js");
(0, vitest_1.describe)('MetricsRegistry', () => {
    let registry;
    (0, vitest_1.beforeEach)(() => {
        registry = new metrics_js_1.MetricsRegistry('test');
    });
    (0, vitest_1.it)('should create counter metrics', () => {
        const counter = registry.counter({
            name: 'requests_total',
            help: 'Total requests',
        });
        (0, vitest_1.expect)(counter).toBeInstanceOf(metrics_js_1.Counter);
    });
    (0, vitest_1.it)('should create gauge metrics', () => {
        const gauge = registry.gauge({
            name: 'active_connections',
            help: 'Active connections',
        });
        (0, vitest_1.expect)(gauge).toBeInstanceOf(metrics_js_1.Gauge);
    });
    (0, vitest_1.it)('should create histogram metrics', () => {
        const histogram = registry.histogram({
            name: 'request_duration',
            help: 'Request duration',
        });
        (0, vitest_1.expect)(histogram).toBeInstanceOf(metrics_js_1.Histogram);
    });
    (0, vitest_1.it)('should export metrics in Prometheus format', () => {
        const counter = registry.counter({
            name: 'requests_total',
            help: 'Total requests',
        });
        counter.inc({}, 5);
        const output = registry.export();
        (0, vitest_1.expect)(output).toContain('# HELP test_requests_total Total requests');
        (0, vitest_1.expect)(output).toContain('# TYPE test_requests_total counter');
        (0, vitest_1.expect)(output).toContain('test_requests_total 5');
    });
});
(0, vitest_1.describe)('Counter', () => {
    let registry;
    (0, vitest_1.beforeEach)(() => {
        registry = new metrics_js_1.MetricsRegistry('test');
    });
    (0, vitest_1.it)('should increment by 1 by default', () => {
        const counter = registry.counter({ name: 'counter', help: 'Test counter' });
        counter.inc();
        counter.inc();
        const output = registry.export();
        (0, vitest_1.expect)(output).toContain('test_counter 2');
    });
    (0, vitest_1.it)('should increment by specified value', () => {
        const counter = registry.counter({ name: 'counter', help: 'Test counter' });
        counter.inc({}, 10);
        const output = registry.export();
        (0, vitest_1.expect)(output).toContain('test_counter 10');
    });
    (0, vitest_1.it)('should support labels', () => {
        const counter = registry.counter({
            name: 'counter',
            help: 'Test counter',
            labels: ['status'],
        });
        counter.inc({ status: 'success' }, 5);
        counter.inc({ status: 'error' }, 2);
        const output = registry.export();
        (0, vitest_1.expect)(output).toContain('status="success"');
        (0, vitest_1.expect)(output).toContain('status="error"');
    });
});
(0, vitest_1.describe)('Gauge', () => {
    let registry;
    (0, vitest_1.beforeEach)(() => {
        registry = new metrics_js_1.MetricsRegistry('test');
    });
    (0, vitest_1.it)('should set value', () => {
        const gauge = registry.gauge({ name: 'gauge', help: 'Test gauge' });
        gauge.set({}, 42);
        const output = registry.export();
        (0, vitest_1.expect)(output).toContain('test_gauge 42');
    });
    (0, vitest_1.it)('should increment and decrement', () => {
        const gauge = registry.gauge({ name: 'gauge', help: 'Test gauge' });
        gauge.set({}, 10);
        gauge.inc({}, 5);
        gauge.dec({}, 3);
        const output = registry.export();
        (0, vitest_1.expect)(output).toContain('test_gauge 12');
    });
});
(0, vitest_1.describe)('Histogram', () => {
    let registry;
    (0, vitest_1.beforeEach)(() => {
        registry = new metrics_js_1.MetricsRegistry('test');
    });
    (0, vitest_1.it)('should observe values', () => {
        const histogram = registry.histogram({
            name: 'duration',
            help: 'Duration',
            buckets: [0.1, 0.5, 1, 5],
        });
        histogram.observe({}, 0.3);
        histogram.observe({}, 0.8);
        histogram.observe({}, 2);
        const output = registry.export();
        (0, vitest_1.expect)(output).toContain('test_duration_bucket');
        (0, vitest_1.expect)(output).toContain('test_duration_sum');
        (0, vitest_1.expect)(output).toContain('test_duration_count');
    });
    (0, vitest_1.it)('should provide timer functionality', () => {
        const histogram = registry.histogram({
            name: 'duration',
            help: 'Duration',
        });
        const end = histogram.startTimer();
        // Simulate some work
        const duration = end();
        (0, vitest_1.expect)(duration).toBeGreaterThanOrEqual(0);
    });
});
(0, vitest_1.describe)('createMeshMetrics', () => {
    (0, vitest_1.it)('should create all mesh metrics', () => {
        const metrics = (0, metrics_js_1.createMeshMetrics)('mesh');
        (0, vitest_1.expect)(metrics.tasksTotal).toBeDefined();
        (0, vitest_1.expect)(metrics.taskDuration).toBeDefined();
        (0, vitest_1.expect)(metrics.agentInvocations).toBeDefined();
        (0, vitest_1.expect)(metrics.activeAgents).toBeDefined();
        (0, vitest_1.expect)(metrics.modelCalls).toBeDefined();
        (0, vitest_1.expect)(metrics.modelLatency).toBeDefined();
        (0, vitest_1.expect)(metrics.modelTokens).toBeDefined();
        (0, vitest_1.expect)(metrics.toolInvocations).toBeDefined();
        (0, vitest_1.expect)(metrics.toolLatency).toBeDefined();
        (0, vitest_1.expect)(metrics.policyDecisions).toBeDefined();
        (0, vitest_1.expect)(metrics.costUsd).toBeDefined();
    });
    (0, vitest_1.it)('should track task metrics', () => {
        const metrics = (0, metrics_js_1.createMeshMetrics)('mesh');
        metrics.tasksTotal.inc({ type: 'code_review', status: 'completed' });
        metrics.taskDuration.observe({ type: 'code_review' }, 2.5);
        const output = metrics.registry.export();
        (0, vitest_1.expect)(output).toContain('mesh_tasks_total');
        (0, vitest_1.expect)(output).toContain('mesh_task_duration');
    });
});
