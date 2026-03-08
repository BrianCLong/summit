"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const SummitAnomalyService_1 = require("../../src/services/SummitAnomalyService");
const types_1 = require("../../src/anomaly/types");
// Mock dependencies
globals_1.jest.mock('../../src/lib/telemetry/alerting-service', () => ({
    alertingService: {
        sendAlert: globals_1.jest.fn(),
    },
}));
globals_1.jest.mock('../../src/anomaly/forest', () => ({
    isolationForest: {
        fit_transform: globals_1.jest.fn().mockReturnValue({
            nodes: [
                { id: 'node1', score: 0.95, isAnomaly: true, metrics: {}, reason: 'test' }
            ]
        })
    },
    features: globals_1.jest.fn()
}));
(0, globals_1.describe)('SummitAnomalyService', () => {
    let service;
    (0, globals_1.beforeEach)(() => {
        service = SummitAnomalyService_1.SummitAnomalyService.getInstance();
        service._resetForTesting();
    });
    (0, globals_1.it)('should be a singleton', () => {
        const s1 = SummitAnomalyService_1.SummitAnomalyService.getInstance();
        const s2 = SummitAnomalyService_1.SummitAnomalyService.getInstance();
        (0, globals_1.expect)(s1).toBe(s2);
    });
    (0, globals_1.describe)('Temporal Detection', () => {
        (0, globals_1.it)('should detect a temporal anomaly', async () => {
            const history = [10, 10, 10, 10, 10];
            const result = await service.analyze({
                type: types_1.AnomalyType.TEMPORAL,
                entityId: 'metric_cpu',
                timestamp: Date.now(),
                data: {
                    value: 100,
                    metric: 'cpu_usage',
                    history
                }
            });
            (0, globals_1.expect)(result).toBeDefined();
            (0, globals_1.expect)(result?.isAnomaly).toBe(true);
            (0, globals_1.expect)(result?.severity).toBe(types_1.Severity.CRITICAL); // Huge jump from 10 to 100
            (0, globals_1.expect)(result?.explanation?.description).toContain('Value deviated from constant baseline');
        });
        (0, globals_1.it)('should not detect anomaly for normal values', async () => {
            const history = [10, 12, 11, 10, 12]; // Mean ~11, Std ~1
            const result = await service.analyze({
                type: types_1.AnomalyType.TEMPORAL,
                entityId: 'metric_cpu',
                timestamp: Date.now(),
                data: {
                    value: 11,
                    metric: 'cpu_usage',
                    history
                }
            });
            (0, globals_1.expect)(result?.isAnomaly).toBe(false);
        });
    });
    (0, globals_1.describe)('Spatial Detection', () => {
        (0, globals_1.it)('should detect spatial anomaly', async () => {
            const result = await service.analyze({
                type: types_1.AnomalyType.SPATIAL,
                entityId: 'user_123',
                timestamp: Date.now(),
                data: {
                    latitude: 50.0,
                    longitude: 50.0,
                    history: [{ latitude: 0, longitude: 0 }], // Far away
                    radiusKm: 100
                }
            });
            (0, globals_1.expect)(result?.isAnomaly).toBe(true);
            (0, globals_1.expect)(result?.type).toBe(types_1.AnomalyType.SPATIAL);
        });
    });
    (0, globals_1.describe)('Behavioral Detection', () => {
        (0, globals_1.it)('should detect flapping', async () => {
            const result = await service.analyze({
                type: types_1.AnomalyType.BEHAVIORAL,
                entityId: 'process_1',
                timestamp: Date.now(),
                data: {
                    sequence: ['RUNNING', 'STOPPED', 'RUNNING', 'STOPPED']
                }
            });
            (0, globals_1.expect)(result?.isAnomaly).toBe(true);
            (0, globals_1.expect)(result?.explanation?.description).toContain('flapping');
        });
    });
    (0, globals_1.describe)('False Positive Reduction', () => {
        (0, globals_1.it)('should suppress alerts if whitelisted', async () => {
            const ctx = {
                type: types_1.AnomalyType.TEMPORAL,
                entityId: 'metric_cpu',
                timestamp: Date.now(),
                data: {
                    value: 100,
                    metric: 'cpu_usage',
                    history: [10, 10, 10, 10, 10]
                }
            };
            // First run - anomaly
            let result = await service.analyze(ctx);
            (0, globals_1.expect)(result?.isAnomaly).toBe(true);
            // Feedback
            service.reportFeedback({
                anomalyId: `${types_1.AnomalyType.TEMPORAL}:metric_cpu`,
                isFalsePositive: true,
                timestamp: Date.now()
            });
            // Second run - suppressed
            result = await service.analyze(ctx);
            (0, globals_1.expect)(result?.isAnomaly).toBe(false);
            (0, globals_1.expect)(result?.explanation?.description).toContain('Suppressed');
        });
    });
});
