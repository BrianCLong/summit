import { getPostgresPool } from '../../config/database.js';
import {
  DEFAULT_POLICY_PROFILE_ID,
  buildTenantPolicyBundle,
  getPolicyProfileManifest,
  type PolicyBundlePointer,
  type PolicyProfileManifest,
} from '../../policies/profile-manifests.js';
import { recordPolicyProfileAssignment } from '../../provenance/policyProfileAssignments.js';
import { tenantService } from '../TenantService.js';
import { ReceiptService, type Receipt } from '../ReceiptService.js';
import logger from '../../utils/logger.js';
import type { TenantPolicyBundle } from '../../policy/tenantBundle.js';

export interface PolicyProfileAssignmentInput {
  tenantId: string;
  profileId: string;
  actorId: string;
  actorType: 'user' | 'system' | 'api' | 'job';
  source: string;
}

export interface PolicyProfileAssignmentResult {
  profileId: string;
  manifest: PolicyProfileManifest;
  bundlePointer: PolicyBundlePointer;
  bundle: TenantPolicyBundle;
  receipt: Receipt;
}

export interface ActivePolicyProfile {
  profileId: string;
  manifest: PolicyProfileManifest;
  bundlePointer: PolicyBundlePointer;
  bundle: TenantPolicyBundle;
  source: 'tenant-settings' | 'default';
}

export class PolicyProfileAssignmentService {
  private static instance: PolicyProfileAssignmentService;
  private _receiptService?: ReceiptService;

  private constructor() {
    // Lazy
  }

  private get receiptService(): ReceiptService {
    if (!this._receiptService) {
      this._receiptService = ReceiptService.getInstance();
    }
    return this._receiptService;
  }

  public static getInstance(): PolicyProfileAssignmentService {
    if (!PolicyProfileAssignmentService.instance) {
      PolicyProfileAssignmentService.instance = new PolicyProfileAssignmentService();
    }
    return PolicyProfileAssignmentService.instance;
  }

  async assignProfile(
    input: PolicyProfileAssignmentInput,
  ): Promise<PolicyProfileAssignmentResult> {
    const { tenantId, profileId, actorId, actorType, source } = input;
    const manifest = getPolicyProfileManifest(profileId);
    if (!manifest) {
      throw new Error(`Policy profile '${profileId}' not found`);
    }

    const tenant = await tenantService.getTenant(tenantId);
    if (!tenant) {
      throw new Error(`Tenant '${tenantId}' not found`);
    }

    const bundle = buildTenantPolicyBundle(tenantId, profileId, source);
    const bundlePointer = manifest.bundle;

    const pool = getPostgresPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const newSettings = {
        ...(tenant.settings || {}),
        policy_profile: profileId,
        policy_profile_version: manifest.version,
        policy_bundle_pointer: bundlePointer,
        policy_bundle: bundle,
      };

      await client.query(
        'UPDATE tenants SET settings = $1, updated_at = NOW() WHERE id = $2',
        [newSettings, tenantId],
      );

      await recordPolicyProfileAssignment({
        tenantId,
        profileId,
        bundlePointer,
        manifest,
        actorId,
        actorType,
        source,
      });

      const receipt = await this.receiptService.generateReceipt({
        action: 'POLICY_PROFILE_ASSIGNED',
        actor: { id: actorId, tenantId },
        resource: `policy-profile:${profileId}`,
        input: {
          tenantId,
          profileId,
          bundlePointer,
          manifestVersion: manifest.version,
          manifestChecksum: manifest.checksum,
        },
      });

      await client.query('COMMIT');
      logger.info(`Assigned policy profile '${profileId}' to tenant ${tenantId}`);

      return {
        profileId,
        manifest,
        bundlePointer,
        bundle,
        receipt,
      };
    } catch (error: any) {
      await client.query('ROLLBACK');
      logger.error('Failed to assign policy profile', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async getActiveProfile(tenantId: string): Promise<ActivePolicyProfile> {
    const tenant = await tenantService.getTenant(tenantId);
    if (!tenant) {
      throw new Error(`Tenant '${tenantId}' not found`);
    }

    const settings = tenant.settings || {};
    const profileId = (settings.policy_profile as string) || DEFAULT_POLICY_PROFILE_ID;
    const manifest = getPolicyProfileManifest(profileId);
    if (!manifest) {
      throw new Error(`Policy profile '${profileId}' not found`);
    }

    const bundlePointer = (settings.policy_bundle_pointer as PolicyBundlePointer) || manifest.bundle;
    const bundle =
      (settings.policy_bundle as TenantPolicyBundle) ||
      buildTenantPolicyBundle(tenantId, profileId, 'policy-profile:resolved');

    return {
      profileId,
      manifest,
      bundlePointer,
      bundle,
      source: settings.policy_profile ? 'tenant-settings' : 'default',
    };
  }
}

export const policyProfileAssignmentService =
  PolicyProfileAssignmentService.getInstance();
