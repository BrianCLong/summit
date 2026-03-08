import { randomUUID, createHash } from 'crypto';
import { SupportActor, enforceSupportPolicy } from './SupportPolicyGate.js';
import { SUPPORT_BUNDLE_POLICY } from '../../policies/support.js';
import { TenantService } from '../TenantService.js';
import { RedactionService } from '../../redaction/redact.js';
import { AppError } from '../../lib/errors.js';
import { ProvenanceLedgerV2 } from '../../provenance/ledger.js';
import { ReceiptService } from '../ReceiptService.js';
import { signManifest, SignerType } from '../../evidence/attestation/sign.js';
import logger from '../../utils/logger.js';
import { computeBurn } from '../../slo.js';

const SUPPORT_BUNDLE_ALLOWED_FIELDS = [
  'bundleId',
  'generatedAt',
  'tenant',
  'logs',
  'config',
  'receipts',
  'sloSnapshot',
  'policyDecision',
  'receipt',
  'source',
  'id',
  'name',
  'slug',
  'tier',
  'status',
  'residency',
  'region',
  'settings',
  'features',
  'security',
  'lifecycle',
  'recent',
  'entries',
  'actionType',
  'resourceType',
  'resourceId',
  'timestamp',
  'policyDecisionId',
  'runbook',
  'window',
  'statusLabel',
  'error',
  'receiptId',
  'signature',
  'signerKeyId',
  'manifest',
  'signatureType',
  'manifestSignature',
  'payloadSha256',
  'payloadSize',
  'redactionPolicyId',
  'logPointers',
  'url',
  'scope',
];

const SUPPORT_BUNDLE_REDACTION_POLICY = {
  rules: ['pii', 'financial', 'sensitive'] as ('pii' | 'financial' | 'sensitive')[],
  allowedFields: SUPPORT_BUNDLE_ALLOWED_FIELDS,
  redactionMask: '[REDACTED]',
};

type LogPointer = {
  name: string;
  url: string;
  scope?: string;
};

function parseLogPointers(raw: string | undefined): LogPointer[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .filter((entry) => entry && typeof entry.url === 'string')
      .map((entry) => ({
        name: String(entry.name || 'log-source'),
        url: String(entry.url),
        scope: entry.scope ? String(entry.scope) : undefined,
      }));
  } catch (error) {
    logger.warn({ error }, 'Failed to parse SUPPORT_BUNDLE_LOG_POINTERS');
    return [];
  }
}

export class SupportBundleService {
  private static instance: SupportBundleService;
  private tenantService = TenantService.getInstance();
  private redactionService = new RedactionService();
  private ledger = ProvenanceLedgerV2.getInstance();
  private receiptService = ReceiptService.getInstance();

  public static getInstance(): SupportBundleService {
    if (!SupportBundleService.instance) {
      SupportBundleService.instance = new SupportBundleService();
    }
    return SupportBundleService.instance;
  }

  async generateBundle(params: {
    actor: SupportActor;
    tenantId: string;
    reason: string;
    receiptsLimit?: number;
    sloRunbook?: string;
    sloWindow?: string;
  }) {
    const {
      actor,
      tenantId,
      reason,
      receiptsLimit = 25,
      sloRunbook = process.env.SUPPORT_BUNDLE_SLO_RUNBOOK || 'golden-path',
      sloWindow = process.env.SUPPORT_BUNDLE_SLO_WINDOW || '24h',
    } = params;

    const policyDecision = await enforceSupportPolicy({
      actor,
      policy: SUPPORT_BUNDLE_POLICY,
      action: 'support:bundle:generate',
      resource: {
        id: tenantId,
        type: 'SupportBundle',
      },
      justification: reason,
    });

    const tenant = await this.tenantService.getTenant(tenantId);
    if (!tenant) {
      throw new AppError('Tenant not found.', 404, 'TENANT_NOT_FOUND');
    }

    const logPointers = parseLogPointers(
      process.env.SUPPORT_BUNDLE_LOG_POINTERS,
    );

    const receipts = await this.ledger.getEntries(tenantId, {
      limit: receiptsLimit,
      order: 'DESC',
    });

    let sloSnapshot: {
      statusLabel: 'ok' | 'unavailable';
      runbook: string;
      window: string;
      data?: unknown;
      error?: string;
    } = {
      statusLabel: 'unavailable',
      runbook: sloRunbook,
      window: sloWindow,
    };

    try {
      const data = await computeBurn(sloRunbook, tenantId, sloWindow);
      sloSnapshot = {
        statusLabel: 'ok',
        runbook: sloRunbook,
        window: sloWindow,
        data,
      };
    } catch (error: any) {
      logger.warn(
        { error, tenantId, runbook: sloRunbook },
        'Failed to compute SLO snapshot for support bundle',
      );
      sloSnapshot = {
        statusLabel: 'unavailable',
        runbook: sloRunbook,
        window: sloWindow,
        error: error?.message || 'SLO snapshot unavailable',
      };
    }

    const generatedAt = new Date().toISOString();
    const bundleId = `support-bundle-${randomUUID()}`;

    const bundle = {
      bundleId,
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
      logs: {
        logPointers,
      },
      config: {
        features: tenant.config?.features || {},
        security: tenant.config?.security || {},
        lifecycle: tenant.config?.lifecycle || {},
        settings: tenant.settings || {},
      },
      receipts: {
        recent: receipts.map((entry) => ({
          id: entry.id,
          actionType: entry.actionType,
          resourceType: entry.resourceType,
          resourceId: entry.resourceId,
          timestamp: entry.timestamp.toISOString(),
          policyDecisionId: entry.metadata?.policyDecisionId,
        })),
      },
      sloSnapshot,
      policyDecision,
      source: 'SupportBundleService',
    };

    const redactedBundle = await this.redactionService.redactObject(
      bundle,
      SUPPORT_BUNDLE_REDACTION_POLICY,
      tenantId,
      { actorId: actor.id, policyId: policyDecision.policyId },
    );

    const payload = JSON.stringify(redactedBundle);
    const payloadHash = createHash('sha256').update(payload).digest('hex');

    const receipt = await this.receiptService.generateReceipt({
      action: 'support:bundle:generate',
      actor: { id: actor.id, tenantId: actor.tenantId },
      resource: bundleId,
      input: { tenantId, reason, receiptsLimit, sloRunbook, sloWindow },
      policyDecisionId: policyDecision.policyDecisionId,
    });

    const manifest = {
      bundleId,
      generatedAt,
      tenantId,
      payloadSha256: payloadHash,
      payloadSize: payload.length,
      redactionPolicyId: 'support-bundle-redaction-v1',
      receiptId: receipt.id,
      policyDecisionId: policyDecision.policyDecisionId,
    };

    const signerType = (process.env.SUPPORT_BUNDLE_SIGNER_TYPE ||
      'none') as SignerType;
    const manifestSignature = await signManifest(manifest, {
      signerType,
      privateKey: process.env.SUPPORT_BUNDLE_SIGNING_KEY,
    });

    return {
      manifest,
      signatureType: signerType,
      manifestSignature,
      bundle: redactedBundle,
      receipt,
      policyDecision,
      redaction: {
        policyId: 'support-bundle-redaction-v1',
        appliedAt: generatedAt,
        mask: SUPPORT_BUNDLE_REDACTION_POLICY.redactionMask,
      },
    };
  }
}

export const supportBundleService = SupportBundleService.getInstance();
