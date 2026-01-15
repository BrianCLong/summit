import { createHash } from 'crypto';
import type { TenantPolicyBundle } from '../policy/tenantBundle.js';

export interface PolicyBundlePointer {
  id: string;
  version: string;
  checksum: string;
}

export interface PolicyProfileManifest {
  id: string;
  name: string;
  description: string;
  version: string;
  checksum: string;
  bundle: PolicyBundlePointer;
  baseProfile: TenantPolicyBundle['baseProfile'];
}

const BASELINE_PROFILE: TenantPolicyBundle['baseProfile'] = {
  id: 'baseline',
  version: '1.0.0',
  regoPackage: 'tenant.baseline',
  entrypoints: ['allow'],
  guardrails: {
    defaultDeny: true,
    requirePurpose: false,
    requireJustification: false,
  },
  crossTenant: {
    mode: 'deny',
    allow: [],
    requireAgreements: true,
  },
  rules: [
    {
      id: 'allow-public-read',
      effect: 'allow',
      priority: 10,
      conditions: {
        actions: ['read'],
        environments: ['production', 'staging', 'dev'],
      },
    },
  ],
};

const STRICT_PROFILE: TenantPolicyBundle['baseProfile'] = {
  id: 'strict',
  version: '1.0.0',
  regoPackage: 'tenant.strict',
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
  rules: [
    {
      id: 'allow-internal-read',
      effect: 'allow',
      priority: 10,
      conditions: {
        actions: ['read'],
        subjectTenants: [],
      },
    },
  ],
};

const CUSTOM_PROFILE: TenantPolicyBundle['baseProfile'] = {
  id: 'custom',
  version: '0.1.0',
  regoPackage: 'tenant.custom',
  entrypoints: ['allow'],
  guardrails: {
    defaultDeny: true,
    requirePurpose: false,
    requireJustification: false,
  },
  crossTenant: {
    mode: 'allowlist',
    allow: [],
    requireAgreements: true,
  },
  rules: [
    {
      id: 'deny-unconfigured-actions',
      effect: 'deny',
      priority: 1,
      conditions: {
        actions: [],
      },
    },
  ],
};

const checksumOf = (value: unknown): string =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex');

const bundlePointerFor = (
  id: string,
  version: string,
  baseProfile: TenantPolicyBundle['baseProfile'],
): PolicyBundlePointer => ({
  id,
  version,
  checksum: checksumOf(baseProfile),
});

const manifestFor = (
  id: string,
  name: string,
  description: string,
  baseProfile: TenantPolicyBundle['baseProfile'],
  bundleId: string,
): PolicyProfileManifest => ({
  id,
  name,
  description,
  version: baseProfile.version,
  checksum: checksumOf(baseProfile),
  bundle: bundlePointerFor(bundleId, baseProfile.version, baseProfile),
  baseProfile,
});

const PROFILE_MANIFESTS: Record<string, PolicyProfileManifest> = {
  baseline: manifestFor(
    'baseline',
    'Baseline Security',
    'Standard protection suitable for most non-sensitive workloads.',
    BASELINE_PROFILE,
    'bundle-tenant-baseline',
  ),
  strict: manifestFor(
    'strict',
    'Strict Compliance',
    'High-security mode requiring purpose and justification for all actions.',
    STRICT_PROFILE,
    'bundle-tenant-strict',
  ),
  custom: manifestFor(
    'custom',
    'Custom Configuration',
    'Fully customizable policy profile.',
    CUSTOM_PROFILE,
    'bundle-tenant-custom',
  ),
};

export const DEFAULT_POLICY_PROFILE_ID = 'baseline';

export const policyBundleMappings = Object.fromEntries(
  Object.entries(PROFILE_MANIFESTS).map(([id, manifest]) => [id, manifest.bundle]),
);

export const listPolicyProfileManifests = (): PolicyProfileManifest[] =>
  Object.values(PROFILE_MANIFESTS);

export const getPolicyProfileManifest = (
  id: string,
): PolicyProfileManifest | null => PROFILE_MANIFESTS[id] || null;

export const buildTenantPolicyBundle = (
  tenantId: string,
  profileId: string,
  source: string,
): TenantPolicyBundle => {
  const manifest = getPolicyProfileManifest(profileId);
  if (!manifest) {
    throw new Error(`Policy profile '${profileId}' not found`);
  }

  return {
    tenantId,
    bundleId: manifest.bundle.id,
    baseProfile: manifest.baseProfile,
    overlays: [],
    metadata: {
      issuedAt: new Date().toISOString(),
      source,
    },
  };
};
