import { SupportActor, enforceSupportPolicy } from './SupportPolicyGate.js';
import { SUPPORT_HEALTH_BUNDLE_POLICY } from '../../policies/support.js';
import { TenantService } from '../TenantService.js';
import { RedactionService } from '../../redaction/redact.js';
import { AppError } from '../../lib/errors.js';

const HEALTH_BUNDLE_ALLOWED_FIELDS = [
  'tenant',
  'health',
  'compliance',
  'evidence',
  'generatedAt',
  'id',
  'name',
  'slug',
  'tier',
  'status',
  'residency',
  'region',
  'signals',
  'supportTicketsOpen',
  'supportTicketsCritical',
  'latestIncidentAt',
  'policySnapshot',
  'security',
  'features',
  'lifecycle',
  'receiptIds',
  'provenanceEntryIds',
  'source',
];

const HEALTH_BUNDLE_REDACTION_POLICY = {
  rules: ['pii', 'financial', 'sensitive'] as ('pii' | 'financial' | 'sensitive')[],
  allowedFields: HEALTH_BUNDLE_ALLOWED_FIELDS,
  redactionMask: '[REDACTED]',
};

export class TenantHealthBundleService {
  private static instance: TenantHealthBundleService;
  private tenantService = TenantService.getInstance();
  private redactionService = new RedactionService();

  public static getInstance(): TenantHealthBundleService {
    if (!TenantHealthBundleService.instance) {
      TenantHealthBundleService.instance = new TenantHealthBundleService();
    }
    return TenantHealthBundleService.instance;
  }

  async exportBundle(params: {
    actor: SupportActor;
    tenantId: string;
    reason: string;
  }) {
    const { actor, tenantId, reason } = params;
    const policyDecision = await enforceSupportPolicy({
      actor,
      policy: SUPPORT_HEALTH_BUNDLE_POLICY,
      action: 'support:health:export',
      resource: {
        id: tenantId,
        type: 'TenantHealthBundle',
      },
      justification: reason,
    });

    const tenant = await this.tenantService.getTenant(tenantId);
    if (!tenant) {
      throw new AppError('Tenant not found.', 404, 'TENANT_NOT_FOUND');
    }

    const generatedAt = new Date().toISOString();

    const bundle = {
      generatedAt,
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        tier: tenant.tier,
        status: tenant.status,
        residency: tenant.residency,
        region: tenant.region,
      },
      health: {
        status: tenant.status === 'active' ? 'HEALTHY' : 'DEGRADED',
        signals: {
          supportTicketsOpen: 0,
          supportTicketsCritical: 0,
          latestIncidentAt: null as string | null,
        },
      },
      compliance: {
        policySnapshot: {
          security: tenant.config?.security || {},
          features: tenant.config?.features || {},
          lifecycle: tenant.config?.lifecycle || {},
        },
      },
      evidence: {
        source: 'TenantHealthBundleService',
        receiptIds: [policyDecision.policyDecisionId],
        provenanceEntryIds: [],
      },
    };

    const redactedBundle = await this.redactionService.redactObject(
      bundle,
      HEALTH_BUNDLE_REDACTION_POLICY,
      tenantId,
      { actorId: actor.id, policyId: policyDecision.policyId },
    );

    return {
      bundle: redactedBundle,
      policyDecision,
      redaction: {
        policyId: 'support-health-bundle-redaction-v1',
        appliedAt: generatedAt,
        mask: HEALTH_BUNDLE_REDACTION_POLICY.redactionMask,
      },
    };
  }
}

export const tenantHealthBundleService = TenantHealthBundleService.getInstance();
