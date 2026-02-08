import { jest, describe, it, expect, beforeEach, beforeAll } from '@jest/globals';
import type { StatisticalDetector as StatisticalDetectorType } from '../StatisticalDetector.js';
import type { SecuriteyesService as SecuriteyesServiceType } from '../SecuriteyesService.js';

const mockSecuriteyesService = {
  getRecentSuspiciousEvents: jest.fn().mockResolvedValue([]),
  createSuspiciousEvent: jest.fn().mockResolvedValue({ id: 'evt-1' })
};

jest.unstable_mockModule(
  new URL('../SecuriteyesService.ts', import.meta.url).pathname,
  () => ({
    SecuriteyesService: {
      getInstance: jest.fn(() => mockSecuriteyesService),
    },
  }),
);

let StatisticalDetector: typeof StatisticalDetectorType;
let SecuriteyesService: typeof SecuriteyesServiceType;

describe('StatisticalDetector', () => {
    let detector: StatisticalDetectorType;

    beforeAll(async () => {
        ({ StatisticalDetector } = await import('../StatisticalDetector.js'));
        ({ SecuriteyesService } = await import('../SecuriteyesService.js'));
    });

    beforeEach(() => {
        detector = StatisticalDetector.getInstance();
        (SecuriteyesService.getInstance as jest.Mock).mockReturnValue(mockSecuriteyesService);
        mockSecuriteyesService.getRecentSuspiciousEvents.mockClear();
        mockSecuriteyesService.createSuspiciousEvent.mockClear();
    });

    it('should detect anomaly when count is high above baseline', async () => {
        // Default baseline is mean=10, stddev=2.
        // Count 20 -> z = (20-10)/2 = 5 > 3. Should trigger.
        const isAnomaly = await detector.detectVolumeAnomaly('t1', 'login_failed', 20);

        expect(isAnomaly).toBe(true);
        expect(mockSecuriteyesService.createSuspiciousEvent).toHaveBeenCalledWith(expect.objectContaining({
            eventType: 'volume_anomaly',
            tenantId: 't1'
        }));
    });

    it('should not detect anomaly when count is normal', async () => {
        // Count 12 -> z = (12-10)/2 = 1 < 3.
        const isAnomaly = await detector.detectVolumeAnomaly('t1', 'login_failed', 12);

        expect(isAnomaly).toBe(false);
        expect(mockSecuriteyesService.createSuspiciousEvent).not.toHaveBeenCalled();
    });

    it('should adjust baseline dynamically if history exists', async () => {
        // Provide 20 events in history
        const history = Array(20).fill({ eventType: 'login_failed' });
        mockSecuriteyesService.getRecentSuspiciousEvents.mockResolvedValue(history);

        // New Mean = 20 / 5 = 4. StdDev = 2.
        // Current Count = 15. Z = (15-4)/2 = 5.5 > 3.
        const isAnomaly = await detector.detectVolumeAnomaly('t1', 'login_failed', 15);

        expect(isAnomaly).toBe(true);
        expect(mockSecuriteyesService.getRecentSuspiciousEvents).toHaveBeenCalled();
    });
});
