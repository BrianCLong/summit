"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const RiskManager_js_1 = require("../RiskManager.js");
const SecuriteyesService_js_1 = require("../SecuriteyesService.js");
const mockSecuriteyesService = {
    getOrCreateRiskProfile: globals_1.jest.fn().mockReturnValue(Promise.resolve({ principalId: 'p1', riskScore: 10, riskFactors: {} })),
    updateRiskScore: globals_1.jest.fn().mockResolvedValue(undefined),
    getHighRiskProfiles: globals_1.jest.fn().mockResolvedValue([{ principalId: 'p1', riskScore: 80 }])
};
globals_1.jest.mock('../SecuriteyesService', () => {
    return {
        SecuriteyesService: {
            getInstance: globals_1.jest.fn(() => mockSecuriteyesService)
        }
    };
});
// Mock runCypher for getHighRiskProfiles
globals_1.jest.mock('../../../graph/neo4j.js', () => ({
    runCypher: globals_1.jest.fn().mockResolvedValue([{ n: { properties: { principalId: 'p1', riskScore: 80 } } }])
}));
(0, globals_1.describe)('RiskManager', () => {
    let manager;
    (0, globals_1.beforeEach)(() => {
        manager = RiskManager_js_1.RiskManager.getInstance();
        // Reset and setup the mock return value explicitly
        mockSecuriteyesService.getOrCreateRiskProfile.mockResolvedValue({ principalId: 'p1', riskScore: 10, riskFactors: {} });
        mockSecuriteyesService.getHighRiskProfiles.mockResolvedValue([{ principalId: 'p1', riskScore: 80 }]);
        SecuriteyesService_js_1.SecuriteyesService.getInstance.mockReturnValue(mockSecuriteyesService);
    });
    (0, globals_1.it)('should update risk score for event', async () => {
        await manager.updateRiskForEvent('p1', 't1', {
            id: 'e1',
            eventType: 'test',
            severity: 'high',
            details: {},
            sourceDetector: 'test',
            timestamp: new Date().toISOString(),
            tenantId: 't1',
            createdAt: '',
            updatedAt: ''
        });
        (0, globals_1.expect)(mockSecuriteyesService.getOrCreateRiskProfile).toHaveBeenCalledWith('p1', 't1');
        // 10 + 20 (high) = 30
        (0, globals_1.expect)(mockSecuriteyesService.updateRiskScore).toHaveBeenCalledWith('p1', 't1', 30, globals_1.expect.any(Object));
    });
    (0, globals_1.it)('should get high risk profiles', async () => {
        const profiles = await manager.getHighRiskProfiles('t1');
        (0, globals_1.expect)(profiles).toHaveLength(1);
        (0, globals_1.expect)(profiles[0].riskScore).toBe(80);
    });
});
