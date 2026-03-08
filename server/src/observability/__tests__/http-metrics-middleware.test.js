"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const express_1 = __importDefault(require("express"));
const supertest_1 = __importDefault(require("supertest"));
const http_metrics_middleware_js_1 = require("../http-metrics-middleware.js");
const metrics_js_1 = require("../metrics.js");
(0, globals_1.describe)('httpMetricsMiddleware', () => {
    (0, globals_1.beforeEach)(() => {
        (0, metrics_js_1.resetMetrics)();
    });
    test('records request totals, durations, and SLO gauges', async () => {
        const app = (0, express_1.default)();
        app.use(http_metrics_middleware_js_1.httpMetricsMiddleware);
        app.get('/observability', async (_req, res) => {
            await new Promise((resolve) => setTimeout(resolve, 5));
            res.send('ok');
        });
        app.get('/observability-error', (_req, res) => {
            res.status(500).send('boom');
        });
        await (0, supertest_1.default)(app).get('/observability');
        await (0, supertest_1.default)(app).get('/observability-error');
        const totals = metrics_js_1.httpRequestsTotal.get().values;
        const successTotal = totals.find((value) => value.labels.route === '/observability');
        (0, globals_1.expect)(successTotal?.value).toBe(1);
        const histogram = metrics_js_1.httpRequestDurationSeconds.get().values.find((value) => value.labels.route === '/observability');
        (0, globals_1.expect)(histogram?.value ?? 0).toBeGreaterThan(0);
        const sloGauge = metrics_js_1.sloAvailability.get().values[0];
        (0, globals_1.expect)(sloGauge.value).toBe(50);
    });
});
