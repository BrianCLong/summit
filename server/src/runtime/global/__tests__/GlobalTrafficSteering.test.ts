import { jest } from '@jest/globals';
import { ResidencyGuard } from '../../../data-residency/residency-guard.js';
import { GlobalTrafficSteering } from '../GlobalTrafficSteering.js';

describe('GlobalTrafficSteering', () => {
    let steering: GlobalTrafficSteering;
    let getResidencyConfigSpy: jest.SpiedFunction<typeof ResidencyGuard.prototype.getResidencyConfig>;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env.SUMMIT_REGION = 'us-east-1';
        steering = GlobalTrafficSteering.getInstance();

        // Spy on the prototype method since it's a singleton instance
        getResidencyConfigSpy = jest.spyOn(ResidencyGuard.prototype, 'getResidencyConfig');
    });

    afterEach(() => {
        getResidencyConfigSpy.mockRestore();
    });

    it('should resolve to current region if no residency configuration exists', async () => {
        getResidencyConfigSpy.mockResolvedValue(null);

        const decision = await steering.resolveRegion('tenant-none');

        expect(decision.targetRegion).toBe('us-east-1');
        expect(decision.isOptimal).toBe(true);
        expect(decision.reason).toContain('No residency configuration found');
    });

    it('should resolve to current region if it is the primary region', async () => {
        getResidencyConfigSpy.mockResolvedValue({
            primaryRegion: 'us-east-1',
            allowedRegions: ['us-east-1'],
            residencyMode: 'strict'
        });

        const decision = await steering.resolveRegion('tenant-local');

        expect(decision.targetRegion).toBe('us-east-1');
        expect(decision.isOptimal).toBe(true);
        expect(decision.reason).toContain('matches tenant primary residency');
    });

    it('should resolve to primary region if current region is different', async () => {
        getResidencyConfigSpy.mockResolvedValue({
            primaryRegion: 'eu-central-1',
            allowedRegions: ['eu-central-1'],
            residencyMode: 'strict'
        });

        const decision = await steering.resolveRegion('tenant-remote');

        expect(decision.targetRegion).toBe('eu-central-1');
        expect(decision.isOptimal).toBe(false);
        expect(decision.reason).toContain('Routing to tenant primary region');
    });

    it('should consider current region optimal if it is allowed and mode is preferred', async () => {
        getResidencyConfigSpy.mockResolvedValue({
            primaryRegion: 'eu-central-1',
            allowedRegions: ['eu-central-1', 'us-east-1'],
            residencyMode: 'preferred'
        });

        const decision = await steering.resolveRegion('tenant-preferred');

        expect(decision.targetRegion).toBe('us-east-1');
        expect(decision.isOptimal).toBe(true);
        expect(decision.reason).toContain('allowed secondary region');
    });
});
