// @ts-nocheck
import { pg } from '../db/pg.js';
import { tenantService, CreateTenantInput } from './TenantService.js';
import { apiKeyService } from './ApiKeyService.js';
import { z } from 'zod';
import { provenanceLedger } from '../provenance/ledger.js';
import logger from '../utils/logger.js';
import crypto from 'crypto';

export const OnboardPartnerSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(3).regex(/^[a-z0-9-]+$/),
  region: z.string().optional(),
  contactEmail: z.string().email(),
  partnerType: z.enum(['agency', 'ngo', 'commercial']),
});

export type OnboardPartnerInput = z.infer<typeof OnboardPartnerSchema>;

export class PartnerService {
  private static instance: PartnerService;

  private constructor() {}

  public static getInstance(): PartnerService {
    if (!PartnerService.instance) {
      PartnerService.instance = new PartnerService();
    }
    return PartnerService.instance;
  }

  /**
   * Register a new partner (starts in pending state)
   */
  async registerPartner(input: OnboardPartnerInput, actorId: string) {
    // 1. Create Tenant (using TenantService)
    // We force the status to 'pending_approval' via the Partner Profile overlay,
    // although TenantService defaults to 'active'. We might need to update it immediately.

    // Create tenant input from partner input
    const tenantInput: CreateTenantInput = {
      name: input.name,
      slug: input.slug,
      residency: input.region === 'EU' ? 'EU' : 'US', // Simple mapping
    };

    const tenant = await tenantService.createTenant(tenantInput, actorId);

    // 2. Create Partner Profile
    await pg.none(
      `INSERT INTO partner_profiles (
        tenant_id, partner_type, region, contact_email
      ) VALUES ($1, $2, $3, $4)`,
      [tenant.id, input.partnerType, input.region, input.contactEmail]
    );

    // 3. Set status to pending (override TenantService default)
    await pg.none(
      `UPDATE tenants SET status = 'pending_approval' WHERE id = $1`,
      [tenant.id]
    );

    // 4. Log event
    await provenanceLedger.appendEntry({
      action: 'PARTNER_REGISTERED',
      actor: { id: actorId, role: 'user' },
      metadata: { tenantId: tenant.id, partnerType: input.partnerType },
      artifacts: []
    });

    return {
      ...tenant,
      status: 'pending_approval',
      partnerProfile: {
        type: input.partnerType,
        email: input.contactEmail
      }
    };
  }

  /**
   * Approve a partner
   */
  async approvePartner(tenantId: string, approverId: string) {
    // 1. Update status
    await pg.none(
      `UPDATE tenants SET status = 'active' WHERE id = $1`,
      [tenantId]
    );

    // 2. Generate initial API Key
    const { apiKey, token } = await apiKeyService.createApiKey({
      tenantId,
      name: 'Initial Partner Key',
      scopes: ['read:cases', 'write:evidence', 'exchange:all'],
      createdBy: approverId
    });

    // 3. Log event
    await provenanceLedger.appendEntry({
      action: 'PARTNER_APPROVED',
      actor: { id: approverId, role: 'admin' },
      metadata: { tenantId },
      artifacts: []
    });

    return {
      tenantId,
      status: 'active',
      initialApiKey: token
    };
  }

  /**
   * Get Partner Details
   */
  async getPartner(tenantId: string) {
    const tenant = await tenantService.getTenant(tenantId);
    if (!tenant) return null;

    const profile = await pg.oneOrNone(
      `SELECT * FROM partner_profiles WHERE tenant_id = $1`,
      [tenantId]
    );

    return {
      ...tenant,
      partnerProfile: profile
    };
  }

  /**
   * Execute Data Exchange (Share Case)
   */
  async shareCase(sourceTenantId: string, targetSlug: string, caseData: any) {
    // 1. Resolve target
    const targetTenant = await tenantService.getTenantBySlug(targetSlug);
    if (!targetTenant) {
      throw new Error(`Target partner ${targetSlug} not found`);
    }

    // 2. Check permissions/agreements (mocked)
    const profile = await pg.oneOrNone(
        `SELECT * FROM partner_profiles WHERE tenant_id = $1`,
        [targetTenant.id]
    );
    // In a real app, check data_sharing_agreement_signed

    // 3. Perform Exchange (Log it)
    logger.info(`Sharing case from ${sourceTenantId} to ${targetTenant.id}`);

    // 4. Record in Ledger
    await provenanceLedger.appendEntry({
        action: 'DATA_EXCHANGE_CASE_SHARED',
        actor: { id: 'system', role: 'system' }, // Automated
        metadata: {
            source: sourceTenantId,
            target: targetTenant.id,
            caseId: caseData.id
        },
        artifacts: [] // could store hash of data
    });

    return { success: true, transferId: crypto.randomUUID() };
  }
}

export const partnerService = PartnerService.getInstance();
