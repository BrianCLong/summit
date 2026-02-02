import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { GlobalTrafficSteering } from '../GlobalTrafficSteering.js';
import { RegionalAvailabilityService } from '../../../services/RegionalAvailabilityService.js';
import { ResidencyGuard } from '../../../data-residency/residency-guard.js';

describe('Region Kill Drill (Failover Verification)', () => {
    let steering: GlobalTrafficSteering;
    let availability: RegionalAvailabilityService;
    let guard: ResidencyGuard;

    const TENANT_ID = 'tenant-failover-test';

    beforeEach(() => {
        steering = GlobalTrafficSteering.getInstance();
        availability = RegionalAvailabilityService.getInstance();
        guard = ResidencyGuard.getInstance();
        availability.reset();

        // Mock residency config for the test tenant
        (guard as any).getResidencyConfig = jest.fn().mockResolvedValue({
            tenantId: TENANT_ID,
            primaryRegion: 'us-east-1',
            allowedRegions: ['us-east-1', 'us-west-2'],
            residencyMode: 'strict'
        });
    });

    it('should steer to primary region when healthy', async () => {
        const decision = await steering.resolveRegion(TENANT_ID);
        expect(decision.targetRegion).toBe('us-east-1');
        expect(decision.reason).toContain('and is healthy');
    });

    it('should failover to DR region when primary is DOWN', async () => {
        // Trigger Region-Kill
        availability.setRegionStatus('us-east-1', 'DOWN');

        const decision = await steering.resolveRegion(TENANT_ID);

        // Should steer to us-west-2 (DR pair for us-east-1)
        expect(decision.targetRegion).toBe('us-west-2');
        expect(decision.reason).toContain('Primary region us-east-1 is DOWN. Failing over to us-west-2');
    });

    it('should steer back to primary when it recovers', async () => {
        // Kill region
        availability.setRegionStatus('us-east-1', 'DOWN');
        let decision = await steering.resolveRegion(TENANT_ID);
        expect(decision.targetRegion).toBe('us-west-2');

        // Recover region
        availability.setRegionStatus('us-east-1', 'HEALTHY');
        decision = await steering.resolveRegion(TENANT_ID);
        expect(decision.targetRegion).toBe('us-east-1');
    });

    it('should handle disaster state (both primary and DR DOWN)', async () => {
        availability.setRegionStatus('us-east-1', 'DOWN');
        availability.setRegionStatus('us-west-2', 'DOWN');

        const decision = await steering.resolveRegion(TENANT_ID);

        // Fallback to original (even if down) if DR is also down
        expect(decision.targetRegion).toBe('us-east-1');
        expect(decision.reason).toContain('Current region matches tenant primary residency');
    });
});
