"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const rollback_js_1 = require("../../src/conductor/rollback.js");
(0, globals_1.describe)('Ramp rollback SLO breach triggers', () => {
    (0, globals_1.it)('triggers rollback when error rate exceeds threshold', async () => {
        const rollback = globals_1.jest.fn(() => Promise.resolve(undefined));
        const fetchMetrics = globals_1.jest.fn(() => Promise.resolve({ errorRate: 0.12, p95: 120 }));
        const result = await (0, rollback_js_1.evaluateCanary)('run-1', { errorRatePct: 5, p95LatencyMs: 200 }, fetchMetrics, rollback);
        (0, globals_1.expect)(result.rolledBack).toBe(true);
        (0, globals_1.expect)(rollback).toHaveBeenCalledTimes(1);
    });
    (0, globals_1.it)('triggers rollback when p95 latency exceeds threshold', async () => {
        const rollback = globals_1.jest.fn(() => Promise.resolve(undefined));
        const fetchMetrics = globals_1.jest.fn(() => Promise.resolve({ errorRate: 0.01, p95: 750 }));
        const result = await (0, rollback_js_1.evaluateCanary)('run-2', { errorRatePct: 5, p95LatencyMs: 500 }, fetchMetrics, rollback);
        (0, globals_1.expect)(result.rolledBack).toBe(true);
        (0, globals_1.expect)(rollback).toHaveBeenCalledTimes(1);
    });
    (0, globals_1.it)('does not trigger rollback when SLOs are healthy', async () => {
        const rollback = globals_1.jest.fn(() => Promise.resolve(undefined));
        const fetchMetrics = globals_1.jest.fn(() => Promise.resolve({ errorRate: 0.01, p95: 120 }));
        const result = await (0, rollback_js_1.evaluateCanary)('run-3', { errorRatePct: 5, p95LatencyMs: 500 }, fetchMetrics, rollback);
        (0, globals_1.expect)(result.rolledBack).toBe(false);
        (0, globals_1.expect)(rollback).not.toHaveBeenCalled();
    });
});
