import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PolicyService, PolicyContext, Principal } from '../PolicyService.js';
import { opaClient } from '../opa-client.js';

vi.mock('../opa-client.js', () => ({
    opaClient: {
        evaluateQuery: vi.fn()
    }
}));

vi.mock('../utils/audit.js', () => ({
    writeAudit: vi.fn()
}));

describe('PolicyService', () => {
    let policyService: PolicyService;

    beforeEach(() => {
        policyService = PolicyService.getInstance();
        vi.clearAllMocks();
    });

    it('should allow access when OPA returns true', async () => {
        (opaClient.evaluateQuery as any).mockResolvedValue(true);

        const ctx: PolicyContext = {
            principal: { id: 'user1', role: 'USER', tenantId: 'tenant1' } as Principal,
            resource: { tenantId: 'tenant1' },
            action: 'read',
            environment: {}
        };

        const decision = await policyService.evaluate(ctx);
        expect(decision.allow).toBe(true);
        expect(decision.reason).toBe('OPA policy allowed access');
    });

    it('should fallback to local RBAC when OPA returns false', async () => {
        (opaClient.evaluateQuery as any).mockResolvedValue(false);

        const ctx: PolicyContext = {
            principal: { id: 'user1', role: 'USER', tenantId: 'tenant1' } as Principal,
            resource: { tenantId: 'tenant1' },
            action: 'read',
            environment: {}
        };

        const decision = await policyService.evaluate(ctx);
        expect(decision.allow).toBe(true); // USER has 'read' permission in local RBAC
    });

    it('should deny access if mission tags do not match (via OPA)', async () => {
        (opaClient.evaluateQuery as any).mockResolvedValue(false);

        const ctx: PolicyContext = {
            principal: {
                id: 'user1',
                role: 'USER',
                tenantId: 'tenant1',
                missionTags: ['alpha']
            } as Principal,
            resource: {
                tenantId: 'tenant1',
                missionTags: ['beta'] // Mismatch
            },
            action: 'read:entity',
            environment: {}
        };

        const decision = await policyService.evaluate(ctx);
        expect(decision.allow).toBe(false);
    });

    it('should enforce tenant isolation in fallback', async () => {
        (opaClient.evaluateQuery as any).mockResolvedValue(null);

        const ctx: PolicyContext = {
            principal: { id: 'user1', role: 'USER', tenantId: 'tenant1' } as Principal,
            resource: { tenantId: 'tenant2' },
            action: 'read',
            environment: {}
        };

        const decision = await policyService.evaluate(ctx);
        expect(decision.allow).toBe(false);
        expect(decision.reason).toBe('Cross-tenant access forbidden');
    });
});
