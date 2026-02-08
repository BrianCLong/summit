import { jest, describe, it, expect, beforeEach, beforeAll } from '@jest/globals';
import type { DetectionEngine as DetectionEngineType } from '../DetectionEngine.js';
import type { SecuriteyesService as SecuriteyesServiceType } from '../SecuriteyesService.js';

// Mock SecuriteyesService
const mockSecuriteyesService = {
  getRecentSuspiciousEvents: jest.fn().mockResolvedValue([]),
  createSuspiciousEvent: jest.fn().mockResolvedValue({ id: 'evt-1' }),
  createRelationship: jest.fn().mockResolvedValue(true),
  createIndicator: jest.fn().mockResolvedValue({ id: 'ind-1' })
};

jest.unstable_mockModule(
    new URL('../SecuriteyesService.ts', import.meta.url).pathname,
    () => ({
        SecuriteyesService: {
            getInstance: jest.fn(() => mockSecuriteyesService),
        },
    }),
);

let DetectionEngine: typeof DetectionEngineType;
let SecuriteyesService: typeof SecuriteyesServiceType;

describe('DetectionEngine', () => {
    let engine: DetectionEngineType;

    beforeAll(async () => {
        ({ DetectionEngine } = await import('../DetectionEngine.js'));
        ({ SecuriteyesService } = await import('../SecuriteyesService.js'));
    });

    beforeEach(() => {
        engine = DetectionEngine.getInstance();
        // Force the mock to be returned if the class logic tries to get it again
        (SecuriteyesService.getInstance as jest.Mock).mockReturnValue(mockSecuriteyesService);
    });

    it('should evaluate signals against rules', async () => {
        const signal = {
            eventType: 'login_failed',
            details: { ip: '1.2.3.4' },
            timestamp: new Date().toISOString()
        };

        // This basic test just ensures it runs without error
        await engine.evaluateSignal(signal, 'tenant-1');

        // Should fetch history
        expect(mockSecuriteyesService.getRecentSuspiciousEvents).toHaveBeenCalled();
    });
});
