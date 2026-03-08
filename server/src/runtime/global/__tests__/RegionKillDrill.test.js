"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const GlobalTrafficSteering_js_1 = require("../GlobalTrafficSteering.js");
const RegionalAvailabilityService_js_1 = require("../../../services/RegionalAvailabilityService.js");
const residency_guard_js_1 = require("../../../data-residency/residency-guard.js");
(0, globals_1.describe)('Region Kill Drill (Failover Verification)', () => {
    let steering;
    let availability;
    let guard;
    const TENANT_ID = 'tenant-failover-test';
    (0, globals_1.beforeEach)(() => {
        steering = GlobalTrafficSteering_js_1.GlobalTrafficSteering.getInstance();
        availability = RegionalAvailabilityService_js_1.RegionalAvailabilityService.getInstance();
        guard = residency_guard_js_1.ResidencyGuard.getInstance();
        availability.reset();
        // Mock residency config for the test tenant
        guard.getResidencyConfig = globals_1.jest.fn().mockResolvedValue({
            tenantId: TENANT_ID,
            primaryRegion: 'us-east-1',
            allowedRegions: ['us-east-1', 'us-west-2'],
            residencyMode: 'strict'
        });
    });
    (0, globals_1.it)('should steer to primary region when healthy', async () => {
        const decision = await steering.resolveRegion(TENANT_ID);
        (0, globals_1.expect)(decision.targetRegion).toBe('us-east-1');
        (0, globals_1.expect)(decision.reason).toContain('and is healthy');
    });
    (0, globals_1.it)('should failover to DR region when primary is DOWN', async () => {
        // Trigger Region-Kill
        availability.setRegionStatus('us-east-1', 'DOWN');
        const decision = await steering.resolveRegion(TENANT_ID);
        // Should steer to us-west-2 (DR pair for us-east-1)
        (0, globals_1.expect)(decision.targetRegion).toBe('us-west-2');
        (0, globals_1.expect)(decision.reason).toContain('Primary region us-east-1 is DOWN. Failing over to us-west-2');
    });
    (0, globals_1.it)('should steer back to primary when it recovers', async () => {
        // Kill region
        availability.setRegionStatus('us-east-1', 'DOWN');
        let decision = await steering.resolveRegion(TENANT_ID);
        (0, globals_1.expect)(decision.targetRegion).toBe('us-west-2');
        // Recover region
        availability.setRegionStatus('us-east-1', 'HEALTHY');
        decision = await steering.resolveRegion(TENANT_ID);
        (0, globals_1.expect)(decision.targetRegion).toBe('us-east-1');
    });
    (0, globals_1.it)('should handle disaster state (both primary and DR DOWN)', async () => {
        availability.setRegionStatus('us-east-1', 'DOWN');
        availability.setRegionStatus('us-west-2', 'DOWN');
        const decision = await steering.resolveRegion(TENANT_ID);
        // Fallback to original (even if down) if DR is also down
        (0, globals_1.expect)(decision.targetRegion).toBe('us-east-1');
        (0, globals_1.expect)(decision.reason).toContain('Current region matches tenant primary residency');
    });
});
