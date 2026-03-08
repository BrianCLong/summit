"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Profiles = exports.FastOpsProfile = exports.BalancedProfile = exports.StrictProfile = void 0;
exports.StrictProfile = {
    tenantId: 'template_strict',
    baseProfile: {
        id: 'strict-v1',
        version: '1.0.0',
        regoPackage: 'intelgraph.policies.strict',
        entrypoints: ['allow'],
        guardrails: {
            defaultDeny: true,
            requirePurpose: true,
            requireJustification: true,
        },
        tenantIsolation: {
            enabled: true,
            allowCrossTenant: false,
            actions: [],
        },
        crossTenant: {
            mode: 'deny',
            allow: [],
            requireAgreements: true,
        },
        quotas: {
            actions: {
                export: {
                    limit: 250,
                    period: 'day',
                },
            },
        },
        ramps: {
            actions: {
                delete: {
                    maxPercent: 10,
                },
            },
        },
        freezeWindows: [],
        dualControl: {
            actions: ['delete', 'purge'],
            minApprovals: 2,
        },
        rules: [
            {
                id: 'allow-read-own',
                effect: 'allow',
                conditions: {
                    actions: ['read'],
                },
                description: 'Allow reading own resources',
            },
        ],
    },
    overlays: [],
};
exports.BalancedProfile = {
    tenantId: 'template_balanced',
    baseProfile: {
        id: 'balanced-v1',
        version: '1.0.0',
        regoPackage: 'intelgraph.policies.balanced',
        entrypoints: ['allow'],
        guardrails: {
            defaultDeny: true,
            requirePurpose: false, // Less friction
            requireJustification: false,
        },
        tenantIsolation: {
            enabled: true,
            allowCrossTenant: true,
            actions: [],
        },
        crossTenant: {
            mode: 'allowlist',
            allow: [],
            requireAgreements: true,
        },
        quotas: {
            actions: {
                export: {
                    limit: 500,
                    period: 'day',
                },
            },
        },
        ramps: {
            actions: {
                delete: {
                    maxPercent: 35,
                },
            },
        },
        freezeWindows: [],
        dualControl: {
            actions: ['delete'],
            minApprovals: 2,
        },
        rules: [
            {
                id: 'allow-standard-ops',
                effect: 'allow',
                conditions: {
                    actions: ['read', 'write', 'export'],
                },
                description: 'Allow standard operations',
            },
        ],
    },
    overlays: [],
};
exports.FastOpsProfile = {
    tenantId: 'template_fast_ops',
    baseProfile: {
        id: 'fast-ops-v1',
        version: '1.0.0',
        regoPackage: 'intelgraph.policies.fast_ops',
        entrypoints: ['allow'],
        guardrails: {
            defaultDeny: false, // DANGEROUS but requested
            requirePurpose: false,
            requireJustification: false,
        },
        tenantIsolation: {
            enabled: true,
            allowCrossTenant: true,
            actions: [],
        },
        crossTenant: {
            mode: 'allowlist',
            allow: [], // Dynamic
            requireAgreements: false,
        },
        quotas: {
            actions: {
                export: {
                    limit: 2000,
                    period: 'day',
                },
            },
        },
        ramps: {
            actions: {
                purge: {
                    maxPercent: 50,
                },
            },
        },
        freezeWindows: [],
        dualControl: {
            actions: ['purge'],
            minApprovals: 2,
        },
        rules: [
            {
                id: 'deny-destructive-purge',
                effect: 'deny',
                conditions: {
                    actions: ['purge'],
                },
                description: 'Prevent accidental purges even in fast ops',
            },
        ],
    },
    overlays: [],
};
exports.Profiles = {
    strict: exports.StrictProfile,
    balanced: exports.BalancedProfile,
    fast_ops: exports.FastOpsProfile,
};
