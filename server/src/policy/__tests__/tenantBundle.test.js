"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const tenantBundle_js_1 = require("../tenantBundle.js");
(0, globals_1.describe)('tenant policy bundle guardrails', () => {
    const baseBundle = {
        tenantId: 'tenant-a',
        baseProfile: {
            id: 'test-profile',
            version: '1.0.0',
            regoPackage: 'intelgraph.policies.test',
            entrypoints: ['allow'],
            guardrails: {
                defaultDeny: false,
                requirePurpose: false,
                requireJustification: false,
            },
            tenantIsolation: {
                enabled: true,
                allowCrossTenant: false,
                actions: [],
            },
            crossTenant: {
                mode: 'allowlist',
                allow: ['tenant-a'],
                requireAgreements: false,
            },
            quotas: {
                actions: {
                    export: {
                        limit: 2,
                        period: 'day',
                    },
                },
            },
            ramps: {
                actions: {
                    write: {
                        maxPercent: 40,
                    },
                },
            },
            freezeWindows: [
                {
                    id: 'ops-freeze',
                    start: '2025-01-01T00:00:00Z',
                    end: '2025-01-02T00:00:00Z',
                    actions: ['delete'],
                    description: 'Operations freeze for maintenance',
                },
            ],
            dualControl: {
                actions: ['delete'],
                minApprovals: 2,
            },
            rules: [
                {
                    id: 'allow-standard',
                    effect: 'allow',
                    conditions: {
                        actions: ['read', 'write', 'export', 'delete'],
                    },
                },
            ],
        },
        overlays: [],
    };
    (0, globals_1.it)('denies cross-tenant access when tenant isolation is enforced', () => {
        const result = (0, tenantBundle_js_1.simulatePolicyDecision)(baseBundle, {
            subjectTenantId: 'tenant-a',
            resourceTenantId: 'tenant-b',
            action: 'read',
        });
        (0, globals_1.expect)(result.allow).toBe(false);
        (0, globals_1.expect)(result.reason).toContain('tenant isolation');
    });
    (0, globals_1.it)('denies when quota is exhausted', () => {
        const result = (0, tenantBundle_js_1.simulatePolicyDecision)(baseBundle, {
            subjectTenantId: 'tenant-a',
            resourceTenantId: 'tenant-a',
            action: 'export',
            quotaUsage: {
                actions: {
                    export: 2,
                },
            },
        });
        (0, globals_1.expect)(result.allow).toBe(false);
        (0, globals_1.expect)(result.reason).toContain('quota exceeded');
    });
    (0, globals_1.it)('allows when ramp percent is within the configured limit', () => {
        const result = (0, tenantBundle_js_1.simulatePolicyDecision)(baseBundle, {
            subjectTenantId: 'tenant-a',
            resourceTenantId: 'tenant-a',
            action: 'write',
            rampPercent: 25,
        });
        (0, globals_1.expect)(result.allow).toBe(true);
    });
    (0, globals_1.it)('denies when ramp percent exceeds the configured limit', () => {
        const result = (0, tenantBundle_js_1.simulatePolicyDecision)(baseBundle, {
            subjectTenantId: 'tenant-a',
            resourceTenantId: 'tenant-a',
            action: 'write',
            rampPercent: 60,
        });
        (0, globals_1.expect)(result.allow).toBe(false);
        (0, globals_1.expect)(result.reason).toContain('ramp blocked');
    });
    (0, globals_1.it)('denies during freeze windows', () => {
        const result = (0, tenantBundle_js_1.simulatePolicyDecision)(baseBundle, {
            subjectTenantId: 'tenant-a',
            resourceTenantId: 'tenant-a',
            action: 'delete',
            approvals: 2,
            requestTime: '2025-01-01T12:00:00Z',
        });
        (0, globals_1.expect)(result.allow).toBe(false);
        (0, globals_1.expect)(result.reason).toContain('action frozen');
    });
    (0, globals_1.it)('denies destructive actions without dual-control approvals', () => {
        const result = (0, tenantBundle_js_1.simulatePolicyDecision)(baseBundle, {
            subjectTenantId: 'tenant-a',
            resourceTenantId: 'tenant-a',
            action: 'delete',
            approvals: 1,
            requestTime: '2025-01-03T12:00:00Z',
        });
        (0, globals_1.expect)(result.allow).toBe(false);
        (0, globals_1.expect)(result.reason).toContain('dual-control');
    });
});
