"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const metrics_collector_js_1 = __importDefault(require("../metrics-collector.js"));
(0, globals_1.describe)('MetricsCollector', () => {
    let metricsCollector;
    (0, globals_1.beforeEach)(() => {
        metricsCollector = metrics_collector_js_1.default;
        metricsCollector._resetForTesting();
    });
    test('should track latency', () => {
        metricsCollector.trackLatency('endpoint-1', 100);
        metricsCollector.trackLatency('endpoint-1', 200);
        const metrics = metricsCollector.getMetrics();
        (0, globals_1.expect)(metrics.latencies['endpoint-1']).toEqual([100, 200]);
    });
    test('should increment request count', () => {
        metricsCollector.incrementRequestCount('service-1');
        metricsCollector.incrementRequestCount('service-1');
        const metrics = metricsCollector.getMetrics();
        (0, globals_1.expect)(metrics.requestCounts['service-1']).toBe(2);
    });
    test('should increment error count and manage sliding window', () => {
        const service = 'service-1';
        const now = Date.now();
        // Mock Date.now() to control the time
        const RealDateNow = Date.now;
        global.Date.now = globals_1.jest.fn(() => now);
        metricsCollector.incrementErrorCount(service);
        metricsCollector.incrementErrorCount(service);
        let metrics = metricsCollector.getMetrics();
        (0, globals_1.expect)(metrics.errorCounts[service].count).toBe(2);
        (0, globals_1.expect)(metrics.errorCounts[service].history).toEqual([now, now]);
        // Simulate time passing (11 minutes)
        global.Date.now = globals_1.jest.fn(() => now + 11 * 60 * 1000);
        metricsCollector.incrementErrorCount(service);
        metrics = metricsCollector.getMetrics();
        // The old errors should have expired from the history
        (0, globals_1.expect)(metrics.errorCounts[service].history.length).toBe(1);
        (0, globals_1.expect)(metrics.errorCounts[service].count).toBe(3);
        // Restore Date.now()
        global.Date.now = RealDateNow;
    });
});
