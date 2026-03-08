"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const metrics_js_1 = require("../metrics/metrics.js");
(0, globals_1.describe)('Observability Metrics', () => {
    (0, globals_1.it)('should increment a counter', async () => {
        (0, globals_1.expect)(() => metrics_js_1.metrics.incrementCounter('summit_api_requests_total', {
            method: 'GET',
            route: '/health',
            status: '200',
            tenantId: 'test-tenant',
        })).not.toThrow();
    });
    (0, globals_1.it)('should observe histogram', async () => {
        (0, globals_1.expect)(() => metrics_js_1.metrics.observeHistogram('summit_api_latency_seconds', 0.5, {
            method: 'GET',
            route: '/health',
        })).not.toThrow();
    });
});
