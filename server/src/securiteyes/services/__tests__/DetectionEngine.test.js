"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const DetectionEngine_js_1 = require("../DetectionEngine.js");
const SecuriteyesService_js_1 = require("../SecuriteyesService.js");
// Mock SecuriteyesService
const mockSecuriteyesService = {
    getRecentSuspiciousEvents: globals_1.jest.fn().mockResolvedValue([]),
    createSuspiciousEvent: globals_1.jest.fn().mockResolvedValue({ id: 'evt-1' }),
    createRelationship: globals_1.jest.fn().mockResolvedValue(true),
    createIndicator: globals_1.jest.fn().mockResolvedValue({ id: 'ind-1' })
};
globals_1.jest.mock('../SecuriteyesService', () => {
    return {
        SecuriteyesService: {
            getInstance: globals_1.jest.fn(() => mockSecuriteyesService)
        }
    };
});
(0, globals_1.describe)('DetectionEngine', () => {
    let engine;
    (0, globals_1.beforeEach)(() => {
        engine = DetectionEngine_js_1.DetectionEngine.getInstance();
        // Force the mock to be returned if the class logic tries to get it again
        SecuriteyesService_js_1.SecuriteyesService.getInstance.mockReturnValue(mockSecuriteyesService);
    });
    (0, globals_1.it)('should evaluate signals against rules', async () => {
        const signal = {
            eventType: 'login_failed',
            details: { ip: '1.2.3.4' },
            timestamp: new Date().toISOString()
        };
        // This basic test just ensures it runs without error
        await engine.evaluateSignal(signal, 'tenant-1');
        // Should fetch history
        (0, globals_1.expect)(mockSecuriteyesService.getRecentSuspiciousEvents).toHaveBeenCalled();
    });
});
