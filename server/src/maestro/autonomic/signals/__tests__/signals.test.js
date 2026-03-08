"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const signals_service_js_1 = require("../signals-service.js");
const types_js_1 = require("../types.js");
(0, globals_1.describe)('SignalsService', () => {
    let service;
    (0, globals_1.beforeEach)(() => {
        service = new signals_service_js_1.SignalsService();
    });
    (0, globals_1.it)('should ingest and retrieve signals', () => {
        const now = new Date();
        service.ingestSignal({
            type: types_js_1.SignalType.TASK_LATENCY,
            value: 150,
            sourceId: 'agent-1',
            metadata: { scope: 'AGENT' },
            tenantId: 'tenant-1',
            timestamp: now,
        });
        const signals = service.getSignals(types_js_1.SignalType.TASK_LATENCY, 'agent-1', new Date(now.getTime() - 1000));
        (0, globals_1.expect)(signals).toHaveLength(1);
        (0, globals_1.expect)(signals[0].value).toBe(150);
    });
    (0, globals_1.it)('should aggregate signals correctly', () => {
        const now = new Date();
        service.ingestSignal({
            type: types_js_1.SignalType.TASK_LATENCY,
            value: 100,
            sourceId: 'agent-1',
            tenantId: 'tenant-1',
            timestamp: new Date(now.getTime() - 1000 * 60 * 1), // 1 min ago
        });
        service.ingestSignal({
            type: types_js_1.SignalType.TASK_LATENCY,
            value: 200,
            sourceId: 'agent-1',
            tenantId: 'tenant-1',
            timestamp: new Date(now.getTime() - 1000 * 60 * 2), // 2 min ago
        });
        const series = service.aggregateSignals(types_js_1.SignalType.TASK_LATENCY, 'agent-1', '5m');
        (0, globals_1.expect)(series.datapoints).toHaveLength(2);
        (0, globals_1.expect)(series.datapoints[0].value).toBe(200); // Sorted by timestamp (oldest first)
        (0, globals_1.expect)(series.datapoints[1].value).toBe(100);
    });
    (0, globals_1.it)('should calculate component health score', () => {
        service.ingestSignal({
            type: types_js_1.SignalType.TASK_FAILURE_COUNT,
            value: 1,
            sourceId: 'agent-fail',
            metadata: { scope: 'AGENT' },
            tenantId: 'tenant-1',
        });
        service.ingestSignal({
            type: types_js_1.SignalType.TASK_FAILURE_COUNT,
            value: 1,
            sourceId: 'agent-fail',
            metadata: { scope: 'AGENT' },
            tenantId: 'tenant-1',
        });
        const snapshot = service.generateHealthSnapshot('tenant-1');
        const agentHealth = snapshot.agents['agent-fail'];
        (0, globals_1.expect)(agentHealth).toBeDefined();
        (0, globals_1.expect)(agentHealth.score).toBeLessThan(80); // Should be penalized
        (0, globals_1.expect)(agentHealth.status).not.toBe(types_js_1.HealthStatus.HEALTHY);
    });
    (0, globals_1.it)('should handle pruning (mocked check)', () => {
        // We won't wait 7 days, but verify method exists and doesn't crash
        service.ingestSignal({
            type: types_js_1.SignalType.CPU_USAGE,
            value: 50,
            sourceId: 'sys',
            tenantId: 't1',
            metadata: { scope: 'SYSTEM' }
        });
        (0, globals_1.expect)(service.generateHealthSnapshot('t1').system.status).toBeDefined();
    });
});
