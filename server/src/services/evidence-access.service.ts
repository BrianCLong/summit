import crypto from 'crypto';
import { advancedAuditSystem } from '../audit/index.js';
import logger from '../utils/logger.js';

type StorageTier = 'hot' | 'cold';

interface TieredRecord {
  evidenceId: string;
  tenantId: string;
  caseId?: string;
  derivativeType?: string;
  hotStorageUri: string;
  coldStorageUri: string;
  createdAt: Date;
  tier: StorageTier;
  pinned?: boolean;
  legalHold?: boolean;
  retentionDays?: number;
  movedToColdAt?: Date;
  lastAccessedAt?: Date;
}

interface TieredStorageAdapter {
  get(evidenceId: string): Promise<TieredRecord | null>;
  save(record: TieredRecord): Promise<void>;
}

class InMemoryTieredStorageAdapter implements TieredStorageAdapter {
  private state = new Map<string, TieredRecord>();

  async get(evidenceId: string): Promise<TieredRecord | null> {
    return this.state.get(evidenceId) || null;
  }

  async save(record: TieredRecord): Promise<void> {
    this.state.set(record.evidenceId, record);
  }
}

interface EvidenceAccessOptions {
  enableTiered?: boolean;
  enableSignedUrls?: boolean;
  coldAfterDays?: number;
  signedUrlTtlSeconds?: number;
  signingKey?: string;
  auditLogger?: { recordEvent: (event: Record<string, unknown>) => Promise<unknown> };
  adapter?: TieredStorageAdapter;
}

interface EvidenceLike {
  id: string;
  storage_uri?: string;
  storageUri?: string;
  collected_at?: Date | string;
  created_at?: Date | string;
  metadata?: Record<string, unknown>;
}

interface EvidenceAccessContext {
  tenantId: string;
  caseId?: string;
  derivativeType?: string;
  now?: Date;
  requestId?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface EvidenceAccessDescriptor {
  evidenceId: string;
  url: string;
  cacheControl: string;
  expiresAt?: string;
  token?: string;
  tier: StorageTier;
  direct: boolean;
  storageUri: string;
}

interface SignedClaims {
  evidenceId: string;
  tenantId: string;
  caseId?: string;
  derivativeType?: string;
  tier: StorageTier;
  exp: number;
}

export class EvidenceAccessService {
  private enableTiered: boolean;
  private enableSignedUrls: boolean;
  private coldAfterDays: number;
  private signedUrlTtlSeconds: number;
  private signingKey: string;
  private auditLogger: { recordEvent: (event: Record<string, unknown>) => Promise<unknown> };
  private adapter: TieredStorageAdapter;

  constructor(options: EvidenceAccessOptions = {}) {
    this.enableTiered =
      options.enableTiered ?? process.env.TIERED_STORAGE_V1 === '1';
    this.enableSignedUrls =
      options.enableSignedUrls ?? process.env.SIGNED_URLS === '1';
    this.coldAfterDays = options.coldAfterDays
      ? Number(options.coldAfterDays)
      : Number(process.env.EVIDENCE_COLD_AFTER_DAYS || 30);
    this.signedUrlTtlSeconds = options.signedUrlTtlSeconds
      ? Number(options.signedUrlTtlSeconds)
      : Number(process.env.SIGNED_URL_TTL_SECONDS || 300);
    this.signingKey =
      options.signingKey ||
      process.env.SIGNED_URL_SECRET ||
      process.env.EVIDENCE_SIGNING_KEY ||
      crypto.randomBytes(32).toString('hex');
    this.auditLogger =
      options.auditLogger ||
      advancedAuditSystem || {
        recordEvent: async () => null,
      };
    this.adapter = options.adapter || new InMemoryTieredStorageAdapter();
  }

  /**
   * Register evidence with tier metadata so lifecycle decisions can be applied later.
   */
  async trackEvidenceRegistration(
    evidence: EvidenceLike,
    tenantId?: string,
    caseId?: string,
  ): Promise<void> {
    const storageUri = this.resolveStorageUri(evidence);
    if (!storageUri) {
      return;
    }

    const createdAt = this.resolveCreatedAt(evidence);
    const record: TieredRecord = {
      evidenceId: evidence.id,
      tenantId: (tenantId || evidence.metadata?.tenantId || 'unknown') as string,
      caseId: (caseId || evidence.metadata?.caseId) as string | undefined,
      derivativeType: evidence.metadata?.derivativeType as string | undefined,
      hotStorageUri: storageUri,
      coldStorageUri: this.deriveColdUri(storageUri),
      createdAt,
      tier: 'hot',
      pinned: evidence.metadata?.pinned as boolean | undefined,
      legalHold: evidence.metadata?.legalHold as boolean | undefined,
      retentionDays: evidence.metadata?.retentionDays as number | undefined,
      lastAccessedAt: createdAt,
    };

    await this.adapter.save(record);
  }

  /**
   * Compute access URL (direct or signed) for an evidence object.
   */
  async getAccessDescriptor(
    evidence: EvidenceLike,
    context: EvidenceAccessContext,
  ): Promise<EvidenceAccessDescriptor> {
    const now = context.now || new Date();
    const record = await this.ensureRecord(evidence, context, now);
    const evaluatedRecord = await this.applyLifecycle(record, now);
    await this.touchAccess(evaluatedRecord.evidenceId, now);

    const targetUri = this.resolveTierUri(evaluatedRecord);

    if (!this.enableSignedUrls) {
      return {
        evidenceId: evaluatedRecord.evidenceId,
        url: targetUri,
        cacheControl: 'public, max-age=120, stale-while-revalidate=60',
        tier: evaluatedRecord.tier,
        direct: true,
        storageUri: evaluatedRecord.hotStorageUri,
      };
    }

    const { token, expiresAt, url, cacheControl } = this.buildSignedUrl(
      evaluatedRecord,
      context,
      now,
    );

    await this.auditSignedUrlIssuance(
      evaluatedRecord,
      token,
      expiresAt,
      context,
    );

    return {
      evidenceId: evaluatedRecord.evidenceId,
      url,
      token,
      expiresAt: expiresAt.toISOString(),
      cacheControl,
      tier: evaluatedRecord.tier,
      direct: false,
      storageUri: evaluatedRecord.hotStorageUri,
    };
  }

  /**
   * Validate a signed URL token for scope and expiry.
   */
  validateSignedToken(
    token: string,
    expectedTenant: string,
    expectedCase?: string,
    now: Date = new Date(),
  ): { valid: boolean; reason?: string; payload?: SignedClaims } {
    try {
      const [rawPayload, signature] = token.split('.');
      if (!rawPayload || !signature) {
        return { valid: false, reason: 'malformed' };
      }

      const expectedSig = crypto
        .createHmac('sha256', this.signingKey)
        .update(rawPayload)
        .digest('base64url');

      if (expectedSig !== signature) {
        return { valid: false, reason: 'signature_mismatch' };
      }

      const payload: SignedClaims = JSON.parse(
        Buffer.from(rawPayload, 'base64url').toString('utf8'),
      );

      if (payload.exp * 1000 <= now.getTime()) {
        return { valid: false, reason: 'expired', payload };
      }

      if (payload.tenantId !== expectedTenant) {
        return { valid: false, reason: 'tenant_mismatch', payload };
      }

      if (expectedCase && payload.caseId && payload.caseId !== expectedCase) {
        return { valid: false, reason: 'case_mismatch', payload };
      }

      return { valid: true, payload };
    } catch (error: any) {
      return { valid: false, reason: 'invalid_json' };
    }
  }

  /**
   * Expose tier information (useful for tests and diagnostics).
   */
  async getTierState(evidenceId: string): Promise<TieredRecord | null> {
    return this.adapter.get(evidenceId);
  }

  private resolveStorageUri(evidence: EvidenceLike): string | undefined {
    return evidence.storage_uri || evidence.storageUri;
  }

  private resolveCreatedAt(evidence: EvidenceLike): Date {
    const candidate =
      evidence.collected_at || evidence.created_at || new Date().toISOString();
    return new Date(candidate);
  }

  private async ensureRecord(
    evidence: EvidenceLike,
    context: EvidenceAccessContext,
    now: Date,
  ): Promise<TieredRecord> {
    const existing = await this.adapter.get(evidence.id);
    if (existing) {
      return existing;
    }

    const storageUri = this.resolveStorageUri(evidence);
    if (!storageUri) {
      throw new Error('Evidence is missing storage URI');
    }

    const createdAt = this.resolveCreatedAt(evidence);
    const record: TieredRecord = {
      evidenceId: evidence.id,
      tenantId: context.tenantId,
      caseId: context.caseId,
      derivativeType: context.derivativeType,
      hotStorageUri: storageUri,
      coldStorageUri: this.deriveColdUri(storageUri),
      createdAt,
      tier: 'hot',
      pinned: evidence.metadata?.pinned as boolean | undefined,
      legalHold: evidence.metadata?.legalHold as boolean | undefined,
      retentionDays: evidence.metadata?.retentionDays as number | undefined,
      lastAccessedAt: now,
    };

    await this.adapter.save(record);
    return record;
  }

  private deriveColdUri(uri: string): string {
    if (uri.startsWith('s3://')) {
      const withoutScheme = uri.replace('s3://', '');
      const [bucket, ...rest] = withoutScheme.split('/');
      return `s3://${bucket}-cold/${rest.join('/')}`;
    }

    const joiner = uri.includes('?') ? '&' : '?';
    return `${uri}${joiner}tier=cold`;
  }

  private resolveTierUri(record: TieredRecord): string {
    return record.tier === 'cold' ? record.coldStorageUri : record.hotStorageUri;
  }

  private async applyLifecycle(
    record: TieredRecord,
    now: Date,
  ): Promise<TieredRecord> {
    if (!this.enableTiered) {
      return record;
    }

    if (record.pinned || record.legalHold) {
      return record;
    }

    const ageInDays = Math.floor(
      (now.getTime() - record.createdAt.getTime()) / (1000 * 60 * 60 * 24),
    );

    const coldThreshold = record.retentionDays || this.coldAfterDays;
    if (ageInDays >= coldThreshold && record.tier !== 'cold') {
      record.tier = 'cold';
      record.movedToColdAt = record.movedToColdAt || now;
      await this.adapter.save(record);
    }

    return record;
  }

  private buildSignedUrl(
    record: TieredRecord,
    context: EvidenceAccessContext,
    now: Date,
  ): { url: string; token: string; expiresAt: Date; cacheControl: string } {
    const targetUri = this.resolveTierUri(record);
    const expiresAt = new Date(
      now.getTime() + this.signedUrlTtlSeconds * 1000,
    );

    const payload: SignedClaims = {
      evidenceId: record.evidenceId,
      tenantId: context.tenantId,
      caseId: context.caseId,
      derivativeType: context.derivativeType || 'original',
      tier: record.tier,
      exp: Math.floor(expiresAt.getTime() / 1000),
    };

    const encodedPayload = Buffer.from(
      JSON.stringify(payload),
      'utf8',
    ).toString('base64url');

    const signature = crypto
      .createHmac('sha256', this.signingKey)
      .update(encodedPayload)
      .digest('base64url');

    const token = `${encodedPayload}.${signature}`;
    const separator = targetUri.includes('?') ? '&' : '?';
    const signedUrl = `${targetUri}${separator}token=${token}`;

    return {
      url: signedUrl,
      token,
      expiresAt,
      cacheControl: `public, max-age=${this.signedUrlTtlSeconds}, immutable, stale-while-revalidate=60`,
    };
  }

  private async touchAccess(
    evidenceId: string,
    when: Date,
  ): Promise<void> {
    const record = await this.adapter.get(evidenceId);
    if (!record) return;

    record.lastAccessedAt = when;
    await this.adapter.save(record);
  }

  private async auditSignedUrlIssuance(
    record: TieredRecord,
    token: string,
    expiresAt: Date,
    context: EvidenceAccessContext,
  ): Promise<void> {
    try {
      await this.auditLogger.recordEvent({
        eventType: 'evidence.signed_url.issued',
        level: 'info',
        correlationId: crypto.randomUUID(),
        tenantId: context.tenantId,
        serviceId: 'intelgraph-provenance',
        serviceName: 'IntelGraph Provenance',
        environment: (process.env.NODE_ENV as any) || 'development',
        action: 'signed_url_issued',
        outcome: 'success',
        message: 'Issued signed URL for evidence access',
        resourceType: 'evidence_artifact',
        resourceId: record.evidenceId,
        details: {
          tier: record.tier,
          expiresAt: expiresAt.toISOString(),
          caseId: context.caseId,
          derivativeType: context.derivativeType || 'original',
        },
        complianceRelevant: true,
        complianceFrameworks: ['SOC2', 'ISO27001'],
        dataClassification: 'restricted',
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        requestId: context.requestId,
      });
    } catch (error: any) {
      logger.warn(
        {
          error: error.message,
          evidenceId: record.evidenceId,
        },
        'Failed to record audit event for signed URL issuance',
      );
    }
  }
}

export const evidenceAccessService = new EvidenceAccessService();
