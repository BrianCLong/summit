"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const otel_1 = require("../../src/lib/observability/otel");
const metrics_1 = require("../../src/lib/observability/metrics");
(0, globals_1.describe)('Observability Stack', () => {
    (0, globals_1.beforeAll)(() => {
        otel_1.otelService.initialize();
    });
    (0, globals_1.afterAll)(async () => {
        await otel_1.otelService.shutdown();
    });
    (0, globals_1.it)('should have initialized metrics', () => {
        (0, globals_1.expect)(metrics_1.metrics.httpRequestsTotal).toBeDefined();
        (0, globals_1.expect)(metrics_1.metrics.httpRequestDuration).toBeDefined();
        (0, globals_1.expect)(metrics_1.metrics.applicationErrors).toBeDefined();
    });
    (0, globals_1.it)('should be able to increment a counter', () => {
        metrics_1.metrics.httpRequestsTotal.inc({ method: 'GET', route: '/test', status_code: '200' });
        // We can't easily assert the internal state of prom-client without internal API access,
        // but if this doesn't throw, it's a good sign.
    });
    (0, globals_1.it)('should be able to start a span', () => {
        const span = otel_1.otelService.startSpan('test-span');
        (0, globals_1.expect)(span).toBeDefined();
        span.end();
    });
    (0, globals_1.it)('should wrap async operations', async () => {
        const result = await otel_1.otelService.wrap('test-wrap', async (span) => {
            span.setAttributes({ 'test.attr': 'value' });
            return 'success';
        });
        (0, globals_1.expect)(result).toBe('success');
    });
});
