"use strict";
/**
 * Detection engine tests
 */
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const engine_js_1 = require("../src/detections/engine.js");
const index_js_1 = require("../src/detections/rules/index.js");
const anomaly_js_1 = require("../src/detections/anomaly.js");
(0, vitest_1.describe)('DetectionEngine', () => {
    let engine;
    (0, vitest_1.beforeEach)(() => {
        engine = (0, engine_js_1.createDetectionEngine)();
        engine.registerRules(index_js_1.allRules);
    });
    (0, vitest_1.it)('should register rules', () => {
        const rules = engine.getRules();
        (0, vitest_1.expect)(rules.length).toBe(index_js_1.allRules.length);
    });
    (0, vitest_1.it)('should detect impossible travel', () => {
        const event = {
            id: 'test-001',
            eventType: 'identity.auth',
            impossibleTravel: true,
            result: 'success',
            riskScore: 80,
        };
        const results = engine.evaluate(event);
        (0, vitest_1.expect)(results.length).toBeGreaterThan(0);
        (0, vitest_1.expect)(results.some((r) => r.ruleName.includes('Impossible Travel'))).toBe(true);
    });
    (0, vitest_1.it)('should detect high DGA score', () => {
        const event = {
            id: 'test-002',
            eventType: 'network.dns',
            queryName: 'asdkjhaskdjhaskdjh.suspicious.example',
            dgaScore: 0.85,
            isNewlyObserved: true,
        };
        const results = engine.evaluate(event);
        (0, vitest_1.expect)(results.length).toBeGreaterThan(0);
        (0, vitest_1.expect)(results.some((r) => r.ruleName.includes('DGA'))).toBe(true);
    });
    (0, vitest_1.it)('should detect suspicious process execution', () => {
        const event = {
            id: 'test-003',
            eventType: 'endpoint.process',
            processName: 'powershell.exe',
            isElevated: true,
            commandLine: 'powershell.exe -enc SGVsbG8gV29ybGQ=',
        };
        const results = engine.evaluate(event);
        (0, vitest_1.expect)(results.length).toBeGreaterThan(0);
    });
    (0, vitest_1.it)('should detect MFA disabled', () => {
        const event = {
            id: 'test-004',
            eventType: 'cloud.iam',
            action: 'mfa_disabled',
            actorType: 'user',
        };
        const results = engine.evaluate(event);
        (0, vitest_1.expect)(results.length).toBeGreaterThan(0);
        (0, vitest_1.expect)(results.some((r) => r.severity === 'critical')).toBe(true);
    });
    (0, vitest_1.it)('should not detect normal events', () => {
        const event = {
            id: 'test-005',
            eventType: 'identity.auth',
            result: 'success',
            riskScore: 10,
            impossibleTravel: false,
            authMethod: 'mfa_totp',
        };
        const results = engine.evaluate(event);
        // May have some low-confidence detections, but none critical
        const critical = results.filter((r) => r.severity === 'critical');
        (0, vitest_1.expect)(critical.length).toBe(0);
    });
    (0, vitest_1.it)('should evaluate batch of events', () => {
        const events = [
            { id: '1', eventType: 'identity.auth', impossibleTravel: true },
            { id: '2', eventType: 'network.dns', dgaScore: 0.9 },
            { id: '3', eventType: 'identity.auth', result: 'success', riskScore: 5 },
        ];
        const results = engine.evaluateBatch(events);
        (0, vitest_1.expect)(results.size).toBeGreaterThan(0);
        (0, vitest_1.expect)(results.has('1') || results.has('2')).toBe(true);
    });
    (0, vitest_1.it)('should calculate statistics', () => {
        const events = [
            { id: '1', eventType: 'identity.auth', impossibleTravel: true },
            { id: '2', eventType: 'cloud.iam', action: 'mfa_disabled' },
        ];
        const results = engine.evaluateBatch(events);
        const stats = engine.getStats(results);
        (0, vitest_1.expect)(stats.eventsWithDetections).toBeGreaterThan(0);
        (0, vitest_1.expect)(stats.totalDetections).toBeGreaterThan(0);
    });
    (0, vitest_1.it)('should respect minConfidence setting', () => {
        const strictEngine = (0, engine_js_1.createDetectionEngine)({ minConfidence: 0.9 });
        strictEngine.registerRules(index_js_1.allRules);
        const event = {
            id: 'test-006',
            eventType: 'network.flow',
            action: 'deny',
        };
        const results = strictEngine.evaluate(event);
        // Low confidence detections should be filtered
        results.forEach((r) => {
            (0, vitest_1.expect)(r.confidence).toBeGreaterThanOrEqual(0.9);
        });
    });
});
(0, vitest_1.describe)('AnomalyDetector', () => {
    let detector;
    (0, vitest_1.beforeEach)(() => {
        detector = (0, anomaly_js_1.createAnomalyDetector)({ minSamples: 5 });
    });
    (0, vitest_1.it)('should build baseline from values', () => {
        // Use deterministic values for testing
        const values = [100, 102, 104, 106, 108, 101, 103, 105, 107, 109];
        for (const v of values) {
            detector.updateBaseline('test.metric', v);
        }
        const baseline = detector.getBaseline('test.metric');
        (0, vitest_1.expect)(baseline).toBeDefined();
        (0, vitest_1.expect)(baseline?.count).toBe(10);
        (0, vitest_1.expect)(baseline?.mean).toBeCloseTo(104.5, 0);
    });
    (0, vitest_1.it)('should detect anomalies', () => {
        // Build baseline with values around 100
        for (let i = 0; i < 20; i++) {
            detector.updateBaseline('test.metric', 100 + (Math.random() - 0.5) * 10);
        }
        // Check anomalous value
        const result = detector.detect('test.metric', 500);
        (0, vitest_1.expect)(result).toBeDefined();
        (0, vitest_1.expect)(result?.isAnomaly).toBe(true);
        (0, vitest_1.expect)(result?.zscore).toBeGreaterThan(3);
    });
    (0, vitest_1.it)('should not flag normal values', () => {
        // Use values with some variance (detector returns null for zero variance)
        for (let i = 0; i < 20; i++) {
            detector.updateBaseline('test.metric', 100 + (i % 2));
        }
        const result = detector.detect('test.metric', 100);
        (0, vitest_1.expect)(result).toBeDefined();
        (0, vitest_1.expect)(result?.isAnomaly).toBe(false);
    });
    (0, vitest_1.it)('should extract metrics from events', () => {
        const event = {
            eventType: 'network.flow',
            bytesIn: 1000,
            bytesOut: 2000,
            durationMs: 150,
        };
        const metrics = detector.extractMetrics(event);
        (0, vitest_1.expect)(metrics['network.flow.bytesIn']).toBe(1000);
        (0, vitest_1.expect)(metrics['network.flow.bytesOut']).toBe(2000);
        (0, vitest_1.expect)(metrics['network.flow.durationMs']).toBe(150);
    });
    (0, vitest_1.it)('should process events and detect anomalies', () => {
        // Process normal events
        for (let i = 0; i < 20; i++) {
            detector.processEvent({
                eventType: 'network.flow',
                bytesOut: 1000 + Math.random() * 100,
            });
        }
        // Process anomalous event
        const anomalies = detector.processEvent({
            eventType: 'network.flow',
            bytesOut: 100000, // Much higher than baseline
        });
        (0, vitest_1.expect)(anomalies.length).toBeGreaterThan(0);
    });
});
