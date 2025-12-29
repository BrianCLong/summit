import { TenantPolicyBundle } from './tenantBundle.js';

export interface PolicyPack {
  id: 'gov' | 'enterprise' | 'research';
  name: string;
  description: string;
  residencyTags: string[];
  bundle: TenantPolicyBundle;
}

const baseRules = [
  {
    id: 'deny-exports',
    description: 'Block exports by default.',
    effect: 'deny',
    priority: 100,
    conditions: {
      actions: ['export', 'caseboard.publish'],
    },
  },
  {
    id: 'allow-analytics',
    description: 'Allow analytics runs within size caps.',
    effect: 'allow',
    priority: 10,
    conditions: {
      actions: ['analytics.run', 'analytics.preview'],
    },
  },
];

export const policyPacks: PolicyPack[] = [
  {
    id: 'gov',
    name: 'Gov Pack',
    description: 'Strict export controls and residency enforcement.',
    residencyTags: ['US'],
    bundle: {
      tenantId: 'default',
      bundleId: 'gov-pack-v1',
      baseProfile: {
        id: 'gov',
        version: '1.0.0',
        regoPackage: 'intelgraph.policy.gov',
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
        rules: baseRules,
      },
      overlays: [],
      metadata: {
        source: 'policy-pack',
        issuedAt: new Date().toISOString(),
      },
    },
  },
  {
    id: 'enterprise',
    name: 'Enterprise Pack',
    description: 'Balanced controls with export allowlist.',
    residencyTags: ['US', 'EU'],
    bundle: {
      tenantId: 'default',
      bundleId: 'enterprise-pack-v1',
      baseProfile: {
        id: 'enterprise',
        version: '1.0.0',
        regoPackage: 'intelgraph.policy.enterprise',
        entrypoints: ['allow'],
        guardrails: {
          defaultDeny: true,
          requirePurpose: true,
          requireJustification: false,
        },
        crossTenant: {
          mode: 'allowlist',
          allow: [],
          requireAgreements: true,
        },
        rules: baseRules,
      },
      overlays: [],
      metadata: {
        source: 'policy-pack',
        issuedAt: new Date().toISOString(),
      },
    },
  },
  {
    id: 'research',
    name: 'Research Pack',
    description: 'Research-friendly defaults with analytics focus.',
    residencyTags: ['US', 'EU'],
    bundle: {
      tenantId: 'default',
      bundleId: 'research-pack-v1',
      baseProfile: {
        id: 'research',
        version: '1.0.0',
        regoPackage: 'intelgraph.policy.research',
        entrypoints: ['allow'],
        guardrails: {
          defaultDeny: false,
          requirePurpose: false,
          requireJustification: false,
        },
        crossTenant: {
          mode: 'allowlist',
          allow: [],
          requireAgreements: false,
        },
        rules: baseRules,
      },
      overlays: [],
      metadata: {
        source: 'policy-pack',
        issuedAt: new Date().toISOString(),
      },
    },
  },
];

export function getPolicyPack(id: PolicyPack['id']): PolicyPack | undefined {
  return policyPacks.find((pack) => pack.id === id);
}
