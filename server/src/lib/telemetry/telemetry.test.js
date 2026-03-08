"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const comprehensive_telemetry_js_1 = require("./comprehensive-telemetry.js");
const diagnostic_snapshotter_js_1 = require("./diagnostic-snapshotter.js");
const alerting_service_js_1 = require("./alerting-service.js");
const globals_1 = require("@jest/globals");
// Mocking dependencies
globals_1.jest.mock('v8');
globals_1.jest.mock('fs');
describe('Telemetry Integration Tests', () => {
    it('should trigger an alert and snapshot on anomaly', () => {
        const sendAlertSpy = globals_1.jest.spyOn(alerting_service_js_1.alertingService, 'sendAlert');
        const triggerSnapshotSpy = globals_1.jest.spyOn(diagnostic_snapshotter_js_1.snapshotter, 'triggerSnapshot');
        // Establish a baseline
        for (let i = 0; i < 101; i++) {
            comprehensive_telemetry_js_1.telemetry.recordRequest(100, {});
        }
        // Trigger an anomaly
        comprehensive_telemetry_js_1.telemetry.recordRequest(5000, {});
        expect(sendAlertSpy).toHaveBeenCalledWith(expect.stringContaining('Anomaly detected'));
        expect(triggerSnapshotSpy).toHaveBeenCalledWith(expect.stringContaining('anomaly_detected'));
        sendAlertSpy.mockRestore();
        triggerSnapshotSpy.mockRestore();
    });
    it('should trigger a snapshot when latency threshold is exceeded', () => {
        const triggerSnapshotSpy = globals_1.jest.spyOn(diagnostic_snapshotter_js_1.snapshotter, 'triggerSnapshot');
        // Record high latency
        for (let i = 0; i < 10; i++) {
            comprehensive_telemetry_js_1.telemetry.recordRequest(3000, {});
        }
        // Manually trigger the check
        diagnostic_snapshotter_js_1.snapshotter.checkLatencyThreshold();
        expect(triggerSnapshotSpy).toHaveBeenCalledWith(expect.stringContaining('latency_threshold_exceeded'));
        triggerSnapshotSpy.mockRestore();
    });
    it('should detect CPU and memory anomalies', () => {
        const sendAlertSpy = globals_1.jest.spyOn(alerting_service_js_1.alertingService, 'sendAlert');
        // Establish a baseline
        for (let i = 0; i < 101; i++) {
            comprehensive_telemetry_js_1.telemetry.notifyListeners('cpu_usage_percent', 10);
            comprehensive_telemetry_js_1.telemetry.notifyListeners('memory_usage_bytes', 1024 * 1024 * 100);
        }
        // Trigger anomalies
        comprehensive_telemetry_js_1.telemetry.notifyListeners('cpu_usage_percent', 90);
        comprehensive_telemetry_js_1.telemetry.notifyListeners('memory_usage_bytes', 1024 * 1024 * 1000);
        expect(sendAlertSpy).toHaveBeenCalledWith(expect.stringContaining('cpu_usage_percent'));
        expect(sendAlertSpy).toHaveBeenCalledWith(expect.stringContaining('memory_usage_bytes'));
        sendAlertSpy.mockRestore();
    });
    it('should increment subsystem counters', () => {
        const dbQueriesSpy = globals_1.jest.spyOn(comprehensive_telemetry_js_1.telemetry.subsystems.database.queries, 'add');
        const cacheHitsSpy = globals_1.jest.spyOn(comprehensive_telemetry_js_1.telemetry.subsystems.cache.hits, 'add');
        const cacheSetsSpy = globals_1.jest.spyOn(comprehensive_telemetry_js_1.telemetry.subsystems.cache.sets, 'add');
        const cacheDelsSpy = globals_1.jest.spyOn(comprehensive_telemetry_js_1.telemetry.subsystems.cache.dels, 'add');
        // Simulate a database query and a cache hit
        comprehensive_telemetry_js_1.telemetry.subsystems.database.queries.add();
        comprehensive_telemetry_js_1.telemetry.subsystems.cache.hits.add();
        comprehensive_telemetry_js_1.telemetry.subsystems.cache.sets.add();
        comprehensive_telemetry_js_1.telemetry.subsystems.cache.dels.add();
        expect(dbQueriesSpy).toHaveBeenCalled();
        expect(cacheHitsSpy).toHaveBeenCalled();
        expect(cacheSetsSpy).toHaveBeenCalled();
        expect(cacheDelsSpy).toHaveBeenCalled();
        dbQueriesSpy.mockRestore();
        cacheHitsSpy.mockRestore();
        cacheSetsSpy.mockRestore();
        cacheDelsSpy.mockRestore();
    });
    it('should sanitize headers in snapshots', () => {
        const req = {
            headers: {
                authorization: 'Bearer 123',
                cookie: 'session=abc',
                'x-test': 'test',
            },
        };
        const sanitizedHeaders = diagnostic_snapshotter_js_1.snapshotter.sanitizeHeaders(req.headers);
        expect(sanitizedHeaders.authorization).toBe('[REDACTED]');
        expect(sanitizedHeaders.cookie).toBe('[REDACTED]');
        expect(sanitizedHeaders['x-test']).toBe('test');
    });
    it('should record database latency', () => {
        const latencySpy = globals_1.jest.spyOn(comprehensive_telemetry_js_1.telemetry.subsystems.database.latency, 'record');
        // This is a simplified test, in a real scenario you would mock the neo4j driver
        // and trigger a query.
        comprehensive_telemetry_js_1.telemetry.subsystems.database.latency.record();
        expect(latencySpy).toHaveBeenCalled();
        latencySpy.mockRestore();
    });
});
