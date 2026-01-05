import { TenantPolicyBundle } from './tenantBundle.js';

export const StrictProfile: TenantPolicyBundle = {
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
    crossTenant: {
      mode: 'deny',
      allow: [],
      requireAgreements: true,
    },
    ramp: {
      enabled: false,
      defaultAllowPercentage: 100,
      rules: [],
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

export const BalancedProfile: TenantPolicyBundle = {
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
    crossTenant: {
      mode: 'allowlist',
      allow: [],
      requireAgreements: true,
    },
    ramp: {
      enabled: false,
      defaultAllowPercentage: 100,
      rules: [],
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

export const FastOpsProfile: TenantPolicyBundle = {
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
    crossTenant: {
      mode: 'allowlist',
      allow: [], // Dynamic
      requireAgreements: false,
    },
    ramp: {
      enabled: false,
      defaultAllowPercentage: 100,
      rules: [],
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

export const Profiles = {
  strict: StrictProfile,
  balanced: BalancedProfile,
  fast_ops: FastOpsProfile,
};
