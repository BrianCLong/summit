"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const tenantBundle_1 = require("../../src/policy/tenantBundle");
const baseBundle = {
    tenantId: 'tenant-alpha',
    bundleId: 'bundle-1',
    metadata: {
        issuedAt: '2024-01-01T00:00:00Z',
        source: 'unit-test',
    },
    baseProfile: {
        id: 'base-tenant-profile',
        version: '1.0.0',
        regoPackage: 'intelgraph.authz',
        entrypoints: ['intelgraph/authz/allow'],
        guardrails: {
            defaultDeny: true,
            requirePurpose: true,
            requireJustification: false,
        },
        crossTenant: {
            mode: 'deny',
            allow: [],
            requireAgreements: true,
        },
        rules: [
            {
                id: 'allow-read-own-tenant',
                description: 'Allow read within tenant boundary',
                effect: 'allow',
                priority: 10,
                conditions: {
                    actions: ['read'],
                    resourceTenants: ['tenant-alpha'],
                    subjectTenants: ['tenant-alpha'],
                },
            },
            {
                id: 'deny-cross-tenant',
                description: 'Deny cross-tenant actions by default',
                effect: 'deny',
                priority: 20,
                conditions: {
                    actions: ['read', 'write'],
                },
            },
        ],
    },
    overlays: [],
};
(0, globals_1.describe)('tenant policy bundle simulation', () => {
    (0, globals_1.it)('denies cross-tenant access when no allowlist is configured', () => {
        const parsed = tenantBundle_1.tenantPolicyBundleSchema.parse(baseBundle);
        const input = {
            subjectTenantId: 'tenant-alpha',
            resourceTenantId: 'tenant-beta',
            action: 'read',
            purpose: 'investigation',
        };
        const result = (0, tenantBundle_1.simulatePolicyDecision)(parsed, input);
        (0, globals_1.expect)(result.allow).toBe(false);
        (0, globals_1.expect)(result.reason).toContain('cross-tenant');
        (0, globals_1.expect)(result.overlaysApplied).toEqual([]);
    });
    (0, globals_1.it)('applies higher-precedence overlay last to override allowlist posture', () => {
        const parsed = tenantBundle_1.tenantPolicyBundleSchema.parse({
            ...baseBundle,
            overlays: [
                {
                    id: 'default-cross-tenant-deny',
                    precedence: 1,
                    patches: [
                        {
                            op: 'set',
                            path: '/crossTenant',
                            value: {
                                mode: 'deny',
                                allow: [],
                                requireAgreements: true,
                            },
                        },
                    ],
                },
                {
                    id: 'mission-exception',
                    precedence: 100,
                    selectors: { regions: ['eu-west-1'] },
                    patches: [
                        {
                            op: 'set',
                            path: '/tenantIsolation',
                            value: {
                                enabled: true,
                                allowCrossTenant: true,
                                actions: [],
                            },
                        },
                        {
                            op: 'set',
                            path: '/crossTenant',
                            value: {
                                mode: 'allowlist',
                                allow: ['tenant-beta'],
                                requireAgreements: false,
                            },
                        },
                        {
                            op: 'append',
                            path: '/rules',
                            value: [
                                {
                                    id: 'allow-mission-cross-tenant',
                                    description: 'Allow mission cross-tenant read to beta',
                                    effect: 'allow',
                                    priority: 30,
                                    conditions: {
                                        actions: ['read'],
                                        resourceTenants: ['tenant-beta'],
                                        subjectTenants: ['tenant-alpha'],
                                    },
                                },
                            ],
                        },
                    ],
                },
            ],
        });
        const input = {
            subjectTenantId: 'tenant-alpha',
            resourceTenantId: 'tenant-beta',
            action: 'read',
            purpose: 'investigation',
        };
        const result = (0, tenantBundle_1.simulatePolicyDecision)(parsed, input, {
            regions: ['eu-west-1'],
            environment: 'prod',
        });
        (0, globals_1.expect)(result.overlaysApplied).toEqual([
            'default-cross-tenant-deny',
            'mission-exception',
        ]);
        (0, globals_1.expect)(result.allow).toBe(true);
        (0, globals_1.expect)(result.reason).toContain('mission cross-tenant');
    });
});
