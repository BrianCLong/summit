import { createHash, randomUUID } from 'crypto';
import { ReceiptService } from '../ReceiptService.js';
import { SigningService } from '../SigningService.js';
import {
  PurgeDisclosureBundle,
  PurgeExecutionContext,
  PurgeManifest,
  PurgeManifestTarget,
  PurgeRequest,
  PurgeWorkflowResult,
  PurgeExecutor,
  PurgeReceiptReference,
} from './types.js';

export class PurgeWorkflowService {
  private signer: SigningService;
  private receipts: ReceiptService;
  private executor: PurgeExecutor;

  constructor(executor: PurgeExecutor, overrides?: { signer?: SigningService; receipts?: ReceiptService }) {
    this.executor = executor;
    this.signer = overrides?.signer ?? new SigningService();
    this.receipts = overrides?.receipts ?? ReceiptService.getInstance();
  }

  public async executePurge(request: PurgeRequest): Promise<PurgeWorkflowResult> {
    const purgeId = request.purgeId ?? `purge-${randomUUID()}`;
    const requestedAt = request.requestedAt ?? new Date().toISOString();
    const executedAt = new Date().toISOString();
    const dryRun = request.dryRun ?? false;

    const context: PurgeExecutionContext = {
      purgeId,
      tenantId: request.tenantId,
      actorId: request.actorId,
      purpose: request.purpose,
      window: request.window,
      dryRun,
      requestedAt,
      policyDecisionId: request.policyDecisionId,
    };

    const results = await Promise.all(
      request.targets.map((target) => this.executor.purge(target, context)),
    );

    const manifestTargets: PurgeManifestTarget[] = results.map((result) => {
      const sampledIdsHash = result.sampledIds?.length
        ? createHash('sha256')
            .update(result.sampledIds.sort().join('|'))
            .digest('hex')
        : undefined;

      return {
        resourceType: result.target.resourceType,
        selector: result.target.selector,
        retentionPolicy: result.target.retentionPolicy,
        reason: result.target.reason,
        classification: result.target.classification,
        deletedCount: result.deletedCount,
        sampledIdsHash,
      };
    });

    const totals = {
      deletedCount: manifestTargets.reduce((sum, target) => sum + target.deletedCount, 0),
      targetCount: manifestTargets.length,
    };

    const receipt = await this.createReceipt({
      purgeId,
      tenantId: request.tenantId,
      actorId: request.actorId,
      purpose: request.purpose,
      window: request.window,
      totals,
      policyDecisionId: request.policyDecisionId,
    });

    const manifest = this.buildManifest({
      purgeId,
      request,
      requestedAt,
      executedAt,
      dryRun,
      targets: manifestTargets,
      totals,
      receipt,
    });

    const disclosureBundle = this.buildDisclosureBundle({
      purgeId,
      tenantId: request.tenantId,
      purpose: request.purpose,
      window: request.window,
      totals,
      manifestHash: manifest.manifestHash,
      receipt,
      createdAt: executedAt,
      resourceTypes: manifestTargets.map((target) => target.resourceType),
    });

    return {
      manifest,
      receipt,
      disclosureBundle,
      results,
    };
  }

  private buildManifest(params: {
    purgeId: string;
    request: PurgeRequest;
    requestedAt: string;
    executedAt: string;
    dryRun: boolean;
    targets: PurgeManifestTarget[];
    totals: { deletedCount: number; targetCount: number };
    receipt: PurgeReceiptReference;
  }): PurgeManifest {
    const manifest: PurgeManifest = {
      version: '1.0.0',
      purgeId: params.purgeId,
      tenantId: params.request.tenantId,
      actorId: params.request.actorId,
      purpose: params.request.purpose,
      requestedAt: params.requestedAt,
      executedAt: params.executedAt,
      window: params.request.window,
      dryRun: params.dryRun,
      targets: params.targets,
      totals: params.totals,
      policyDecisionId: params.request.policyDecisionId,
      receipt: params.receipt,
      manifestHash: '',
      signature: '',
      signerKeyId: '',
    };

    const canonical = canonicalize({
      ...manifest,
      manifestHash: undefined,
      signature: undefined,
      signerKeyId: undefined,
    });
    const manifestHash = createHash('sha256').update(canonical).digest('hex');
    const signature = this.signer.sign(canonical);
    const signerKeyId = `${this.signer.getPublicKey().slice(0, 32)}...`;

    manifest.manifestHash = manifestHash;
    manifest.signature = signature;
    manifest.signerKeyId = signerKeyId;

    return manifest;
  }

  private async createReceipt(params: {
    purgeId: string;
    tenantId: string;
    actorId: string;
    purpose: string;
    window: { start: string; end: string };
    totals: { deletedCount: number; targetCount: number };
    policyDecisionId?: string;
  }): Promise<PurgeReceiptReference> {
    const receipt = await this.receipts.generateReceipt({
      action: 'DATA_RETENTION_PURGE',
      actor: { id: params.actorId, tenantId: params.tenantId },
      resource: params.purgeId,
      input: {
        purpose: params.purpose,
        window: params.window,
        totals: params.totals,
      },
      policyDecisionId: params.policyDecisionId,
    });

    return {
      receiptId: receipt.id,
      receiptSignature: receipt.signature,
      signerKeyId: receipt.signerKeyId,
    };
  }

  private buildDisclosureBundle(params: {
    purgeId: string;
    tenantId: string;
    purpose: string;
    window: { start: string; end: string };
    totals: { deletedCount: number; targetCount: number };
    manifestHash: string;
    receipt: PurgeReceiptReference;
    createdAt: string;
    resourceTypes: string[];
  }): PurgeDisclosureBundle {
    const bundle: PurgeDisclosureBundle = {
      bundleId: `${params.purgeId}-disclosure`,
      createdAt: params.createdAt,
      tenantId: params.tenantId,
      purpose: params.purpose,
      window: params.window,
      resourceTypes: params.resourceTypes,
      totals: params.totals,
      manifestHash: params.manifestHash,
      receiptId: params.receipt.receiptId,
      signature: '',
      signerKeyId: '',
    };

    const canonical = canonicalize({
      ...bundle,
      signature: undefined,
      signerKeyId: undefined,
    });
    bundle.signature = this.signer.sign(canonical);
    bundle.signerKeyId = `${this.signer.getPublicKey().slice(0, 32)}...`;

    return bundle;
  }
}

function canonicalize(value: unknown): string {
  return JSON.stringify(sortKeys(value));
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sortKeys(item));
  }

  if (value && typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = sortKeys((value as Record<string, unknown>)[key]);
        return acc;
      }, {});
  }

  return value;
}
