"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const StatisticalDetector_js_1 = require("../StatisticalDetector.js");
const SecuriteyesService_js_1 = require("../SecuriteyesService.js");
const mockSecuriteyesService = {
    getRecentSuspiciousEvents: globals_1.jest.fn().mockResolvedValue([]),
    createSuspiciousEvent: globals_1.jest.fn().mockResolvedValue({ id: 'evt-1' })
};
globals_1.jest.mock('../SecuriteyesService', () => {
    return {
        SecuriteyesService: {
            getInstance: globals_1.jest.fn(() => mockSecuriteyesService)
        }
    };
});
(0, globals_1.describe)('StatisticalDetector', () => {
    let detector;
    (0, globals_1.beforeEach)(() => {
        detector = StatisticalDetector_js_1.StatisticalDetector.getInstance();
        SecuriteyesService_js_1.SecuriteyesService.getInstance.mockReturnValue(mockSecuriteyesService);
        mockSecuriteyesService.getRecentSuspiciousEvents.mockClear();
        mockSecuriteyesService.createSuspiciousEvent.mockClear();
    });
    (0, globals_1.it)('should detect anomaly when count is high above baseline', async () => {
        // Default baseline is mean=10, stddev=2.
        // Count 20 -> z = (20-10)/2 = 5 > 3. Should trigger.
        const isAnomaly = await detector.detectVolumeAnomaly('t1', 'login_failed', 20);
        (0, globals_1.expect)(isAnomaly).toBe(true);
        (0, globals_1.expect)(mockSecuriteyesService.createSuspiciousEvent).toHaveBeenCalledWith(globals_1.expect.objectContaining({
            eventType: 'volume_anomaly',
            tenantId: 't1'
        }));
    });
    (0, globals_1.it)('should not detect anomaly when count is normal', async () => {
        // Count 12 -> z = (12-10)/2 = 1 < 3.
        const isAnomaly = await detector.detectVolumeAnomaly('t1', 'login_failed', 12);
        (0, globals_1.expect)(isAnomaly).toBe(false);
        (0, globals_1.expect)(mockSecuriteyesService.createSuspiciousEvent).not.toHaveBeenCalled();
    });
    (0, globals_1.it)('should adjust baseline dynamically if history exists', async () => {
        // Provide 20 events in history
        const history = Array(20).fill({ eventType: 'login_failed' });
        mockSecuriteyesService.getRecentSuspiciousEvents.mockResolvedValue(history);
        // New Mean = 20 / 5 = 4. StdDev = 2.
        // Current Count = 15. Z = (15-4)/2 = 5.5 > 3.
        const isAnomaly = await detector.detectVolumeAnomaly('t1', 'login_failed', 15);
        (0, globals_1.expect)(isAnomaly).toBe(true);
        (0, globals_1.expect)(mockSecuriteyesService.getRecentSuspiciousEvents).toHaveBeenCalled();
    });
});
