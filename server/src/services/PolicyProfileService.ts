import { getPostgresPool } from '../config/database.js';
import { provenanceLedger } from '../provenance/ledger.js';
import { tenantService } from './TenantService.js';
import { randomUUID, createHash } from 'crypto';
import logger from '../utils/logger.js';
import type { TenantPolicyBundle } from '../policy/tenantBundle.js';

// Hardcoded Profiles (Prototypes)
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
        subjectTenants: [], // Must match resource tenant (implicit in engine usually, but explicit here)
      },
    },
  ],
};

const CUSTOM_PROFILE: TenantPolicyBundle['baseProfile'] = {
  id: 'custom',
  version: '0.0.1',
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
  rules: [],
};

const PROFILES: Record<string, TenantPolicyBundle['baseProfile']> = {
  baseline: BASELINE_PROFILE,
  strict: STRICT_PROFILE,
  custom: CUSTOM_PROFILE,
};

export interface PolicyProfileSummary {
  id: string;
  name: string;
  description: string;
  guardrails: {
    requirePurpose: boolean;
    requireJustification: boolean;
  };
}

export class PolicyProfileService {
  private static instance: PolicyProfileService;

  private constructor() {}

  public static getInstance(): PolicyProfileService {
    if (!PolicyProfileService.instance) {
      PolicyProfileService.instance = new PolicyProfileService();
    }
    return PolicyProfileService.instance;
  }

  getProfiles(): PolicyProfileSummary[] {
    return [
      {
        id: 'baseline',
        name: 'Baseline Security',
        description: 'Standard protection suitable for most non-sensitive workloads.',
        guardrails: BASELINE_PROFILE.guardrails,
      },
      {
        id: 'strict',
        name: 'Strict Compliance',
        description: 'High-security mode requiring purpose and justification for all actions.',
        guardrails: STRICT_PROFILE.guardrails,
      },
      {
        id: 'custom',
        name: 'Custom Configuration',
        description: 'Fully customizable policy profile.',
        guardrails: CUSTOM_PROFILE.guardrails,
      },
    ];
  }

  getProfile(id: string): TenantPolicyBundle['baseProfile'] | null {
    return PROFILES[id] || null;
  }

  async applyProfile(tenantId: string, profileId: string, actorId: string): Promise<void> {
    const profile = this.getProfile(profileId);
    if (!profile) {
      throw new Error(`Policy profile '${profileId}' not found`);
    }

    const tenant = await tenantService.getTenant(tenantId);
    if (!tenant) {
      throw new Error(`Tenant '${tenantId}' not found`);
    }

    // Resolve the bundle
    // In a real system, we might merge with existing overlays.
    // For now, we just create a new bundle based on the profile.
    const newBundle: TenantPolicyBundle = {
      tenantId: tenantId,
      baseProfile: profile,
      overlays: [], // Reset overlays or keep them? For "Apply Profile", usually implies resetting base.
      metadata: {
        issuedAt: new Date().toISOString(),
        source: `partner-console:apply-profile:${profileId}`,
      },
    };

    const pool = getPostgresPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Update settings and config
      // storing the selection in settings.policy_profile
      // storing the resolved bundle in settings.policy_bundle (since config column doesn't exist yet per plan discussion)

      const newSettings = {
        ...(tenant.settings || {}),
        policy_profile: profileId,
        policy_bundle: newBundle,
      };

      await client.query(
        'UPDATE tenants SET settings = $1, updated_at = NOW() WHERE id = $2',
        [newSettings, tenantId]
      );

      // Record specifically as TENANT_POLICY_APPLIED
      await provenanceLedger.appendEntry({
        tenantId,
        timestamp: new Date(),
        actionType: 'TENANT_POLICY_APPLIED',
        resourceType: 'PolicyProfile',
        resourceId: profileId,
        actorId,
        actorType: 'user',
        payload: {
          mutationType: 'UPDATE',
          entityId: profileId,
          entityType: 'PolicyProfile',
        },
        metadata: {
          bundleHash: createHash('sha256').update(JSON.stringify(newBundle)).digest('hex'),
        },
      });

      await client.query('COMMIT');
      logger.info(`Applied policy profile '${profileId}' to tenant ${tenantId}`);

    } catch (error: any) {
      await client.query('ROLLBACK');
      logger.error('Failed to apply policy profile', error);
      throw error;
    } finally {
      client.release();
    }
  }
}

export const policyProfileService = PolicyProfileService.getInstance();
