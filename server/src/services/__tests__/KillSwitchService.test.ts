import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { KillSwitchService } from '../KillSwitchService.js';

// Access the singleton via the exported instance usually, but for testing we might need to reset state
// Since the service is a singleton with private constructor, we rely on public methods to manipulate state
// or we can cast to any to access private state if absolutely necessary for isolation,
// but better to test the public API.

describe('KillSwitchService (RG-010)', () => {
    let service: KillSwitchService;

    beforeEach(() => {
        // Get the instance
        service = KillSwitchService.getInstance();
        // Reset state manually for each test to ensure isolation
        // Disengage all switches
        if (service.isGlobalKillSwitchActive()) {
            service.disengageGlobalKillSwitch('test-setup', 'reset');
        }
        // We can't easily clear sets via public API without knowing IDs, so we assume empty or
        // we might need to cast to any to clear private sets if the API doesn't support "clear all".
        (service as any).state.agents.clear();
        (service as any).state.features.clear();
        (service as any).state.tenants.clear();
    });

    describe('RG-010: Global Kill Switch', () => {
        it('should block all requests when global kill switch is active', () => {
            service.engageGlobalKillSwitch('admin', 'security-breach');

            const health = service.checkSystemHealth();
            expect(health.allowed).toBe(false);
            expect(health.reason).toBe('Global Kill Switch is Active');
        });

        it('should allow requests when global kill switch is inactive', () => {
            // ensure it is inactive
            expect(service.isGlobalKillSwitchActive()).toBe(false);

            const health = service.checkSystemHealth();
            expect(health.allowed).toBe(true);
        });

        it('should override other checks when global switch is active', () => {
            // Even if an agent is clean, if global is on, it's blocked
            service.engageGlobalKillSwitch('admin', 'panic');

            const health = service.checkSystemHealth({ agentId: 'agent-123' });
            expect(health.allowed).toBe(false);
            expect(health.reason).toBe('Global Kill Switch is Active');
        });
    });

    describe('Granular Kill Switches', () => {
        it('should block specific agent', () => {
            service.killAgent('agent-bad', 'admin', 'malware');

            const blocked = service.checkSystemHealth({ agentId: 'agent-bad' });
            expect(blocked.allowed).toBe(false);
            expect(blocked.reason).toContain('agent-bad is kill-switched');

            const allowed = service.checkSystemHealth({ agentId: 'agent-good' });
            expect(allowed.allowed).toBe(true);
        });

        it('should block specific tenant', () => {
            service.killTenant('tenant-bad', 'admin', 'non-payment');

            const blocked = service.checkSystemHealth({ tenantId: 'tenant-bad' });
            expect(blocked.allowed).toBe(false);
            expect(blocked.reason).toContain('tenant-bad is kill-switched');

            const allowed = service.checkSystemHealth({ tenantId: 'tenant-good' });
            expect(allowed.allowed).toBe(true);
        });

        it('should block specific feature', () => {
            service.killFeature('feature-buggy', 'admin', 'bug');

            const blocked = service.checkSystemHealth({ feature: 'feature-buggy' });
            expect(blocked.allowed).toBe(false);
            expect(blocked.reason).toContain('feature-buggy is kill-switched');

            const allowed = service.checkSystemHealth({ feature: 'feature-stable' });
            expect(allowed.allowed).toBe(true);
        });
    });
});
