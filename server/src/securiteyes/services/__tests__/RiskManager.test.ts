import { jest, describe, it, expect, beforeEach, beforeAll } from '@jest/globals';
import type { RiskManager as RiskManagerType } from '../RiskManager.js';
import type { SecuriteyesService as SecuriteyesServiceType } from '../SecuriteyesService.js';

const mockSecuriteyesService = {
  getOrCreateRiskProfile: jest.fn().mockReturnValue(Promise.resolve({ principalId: 'p1', riskScore: 10, riskFactors: {} })),
  updateRiskScore: jest.fn().mockResolvedValue(undefined),
  getHighRiskProfiles: jest.fn().mockResolvedValue([{ principalId: 'p1', riskScore: 80 }])
};

jest.unstable_mockModule(
  new URL('../SecuriteyesService.ts', import.meta.url).pathname,
  () => ({
    SecuriteyesService: {
      getInstance: jest.fn(() => mockSecuriteyesService),
    },
  }),
);

jest.unstable_mockModule(
  new URL('../../../graph/neo4j.ts', import.meta.url).pathname,
  () => ({
    runCypher: jest
      .fn()
      .mockResolvedValue([{ n: { properties: { principalId: 'p1', riskScore: 80 } } }]),
  }),
);

let RiskManager: typeof RiskManagerType;
let SecuriteyesService: typeof SecuriteyesServiceType;

describe('RiskManager', () => {
    let manager: RiskManagerType;

    beforeAll(async () => {
        ({ RiskManager } = await import('../RiskManager.js'));
        ({ SecuriteyesService } = await import('../SecuriteyesService.js'));
    });

    beforeEach(() => {
        manager = RiskManager.getInstance();
        // Reset and setup the mock return value explicitly
        mockSecuriteyesService.getOrCreateRiskProfile.mockResolvedValue({ principalId: 'p1', riskScore: 10, riskFactors: {} });
        mockSecuriteyesService.getHighRiskProfiles.mockResolvedValue([{ principalId: 'p1', riskScore: 80 }]);
        (SecuriteyesService.getInstance as jest.Mock).mockReturnValue(mockSecuriteyesService);
    });

    it('should update risk score for event', async () => {
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

        expect(mockSecuriteyesService.getOrCreateRiskProfile).toHaveBeenCalledWith('p1', 't1');
        // 10 + 20 (high) = 30
        expect(mockSecuriteyesService.updateRiskScore).toHaveBeenCalledWith('p1', 't1', 30, expect.any(Object));
    });

    it('should get high risk profiles', async () => {
        const profiles = await manager.getHighRiskProfiles('t1');
        expect(profiles).toHaveLength(1);
        expect(profiles[0].riskScore).toBe(80);
    });
});
