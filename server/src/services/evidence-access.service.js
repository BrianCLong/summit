"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.evidenceAccessService = exports.EvidenceAccessService = void 0;
const crypto_1 = __importDefault(require("crypto"));
const index_js_1 = require("../audit/index.js");
const logger_js_1 = __importDefault(require("../utils/logger.js"));
class InMemoryTieredStorageAdapter {
    state = new Map();
    async get(evidenceId) {
        return this.state.get(evidenceId) || null;
    }
    async save(record) {
        this.state.set(record.evidenceId, record);
    }
}
class EvidenceAccessService {
    enableTiered;
    enableSignedUrls;
    coldAfterDays;
    signedUrlTtlSeconds;
    signingKey;
    auditLogger;
    adapter;
    constructor(options = {}) {
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
                crypto_1.default.randomBytes(32).toString('hex');
        this.auditLogger =
            options.auditLogger ||
                index_js_1.advancedAuditSystem || {
                recordEvent: async () => null,
            };
        this.adapter = options.adapter || new InMemoryTieredStorageAdapter();
    }
    /**
     * Register evidence with tier metadata so lifecycle decisions can be applied later.
     */
    async trackEvidenceRegistration(evidence, tenantId, caseId) {
        const storageUri = this.resolveStorageUri(evidence);
        if (!storageUri) {
            return;
        }
        const createdAt = this.resolveCreatedAt(evidence);
        const record = {
            evidenceId: evidence.id,
            tenantId: (tenantId || evidence.metadata?.tenantId || 'unknown'),
            caseId: (caseId || evidence.metadata?.caseId),
            derivativeType: evidence.metadata?.derivativeType,
            hotStorageUri: storageUri,
            coldStorageUri: this.deriveColdUri(storageUri),
            createdAt,
            tier: 'hot',
            pinned: evidence.metadata?.pinned,
            legalHold: evidence.metadata?.legalHold,
            retentionDays: evidence.metadata?.retentionDays,
            lastAccessedAt: createdAt,
        };
        await this.adapter.save(record);
    }
    /**
     * Compute access URL (direct or signed) for an evidence object.
     */
    async getAccessDescriptor(evidence, context) {
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
        const { token, expiresAt, url, cacheControl } = this.buildSignedUrl(evaluatedRecord, context, now);
        await this.auditSignedUrlIssuance(evaluatedRecord, token, expiresAt, context);
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
    validateSignedToken(token, expectedTenant, expectedCase, now = new Date()) {
        try {
            const [rawPayload, signature] = token.split('.');
            if (!rawPayload || !signature) {
                return { valid: false, reason: 'malformed' };
            }
            const expectedSig = crypto_1.default
                .createHmac('sha256', this.signingKey)
                .update(rawPayload)
                .digest('base64url');
            if (expectedSig !== signature) {
                return { valid: false, reason: 'signature_mismatch' };
            }
            const payload = JSON.parse(Buffer.from(rawPayload, 'base64url').toString('utf8'));
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
        }
        catch (error) {
            return { valid: false, reason: 'invalid_json' };
        }
    }
    /**
     * Expose tier information (useful for tests and diagnostics).
     */
    async getTierState(evidenceId) {
        return this.adapter.get(evidenceId);
    }
    resolveStorageUri(evidence) {
        return evidence.storage_uri || evidence.storageUri;
    }
    resolveCreatedAt(evidence) {
        const candidate = evidence.collected_at || evidence.created_at || new Date().toISOString();
        return new Date(candidate);
    }
    async ensureRecord(evidence, context, now) {
        const existing = await this.adapter.get(evidence.id);
        if (existing) {
            return existing;
        }
        const storageUri = this.resolveStorageUri(evidence);
        if (!storageUri) {
            throw new Error('Evidence is missing storage URI');
        }
        const createdAt = this.resolveCreatedAt(evidence);
        const record = {
            evidenceId: evidence.id,
            tenantId: context.tenantId,
            caseId: context.caseId,
            derivativeType: context.derivativeType,
            hotStorageUri: storageUri,
            coldStorageUri: this.deriveColdUri(storageUri),
            createdAt,
            tier: 'hot',
            pinned: evidence.metadata?.pinned,
            legalHold: evidence.metadata?.legalHold,
            retentionDays: evidence.metadata?.retentionDays,
            lastAccessedAt: now,
        };
        await this.adapter.save(record);
        return record;
    }
    deriveColdUri(uri) {
        if (uri.startsWith('s3://')) {
            const withoutScheme = uri.replace('s3://', '');
            const [bucket, ...rest] = withoutScheme.split('/');
            return `s3://${bucket}-cold/${rest.join('/')}`;
        }
        const joiner = uri.includes('?') ? '&' : '?';
        return `${uri}${joiner}tier=cold`;
    }
    resolveTierUri(record) {
        return record.tier === 'cold' ? record.coldStorageUri : record.hotStorageUri;
    }
    async applyLifecycle(record, now) {
        if (!this.enableTiered) {
            return record;
        }
        if (record.pinned || record.legalHold) {
            return record;
        }
        const ageInDays = Math.floor((now.getTime() - record.createdAt.getTime()) / (1000 * 60 * 60 * 24));
        const coldThreshold = record.retentionDays || this.coldAfterDays;
        if (ageInDays >= coldThreshold && record.tier !== 'cold') {
            record.tier = 'cold';
            record.movedToColdAt = record.movedToColdAt || now;
            await this.adapter.save(record);
        }
        return record;
    }
    buildSignedUrl(record, context, now) {
        const targetUri = this.resolveTierUri(record);
        const expiresAt = new Date(now.getTime() + this.signedUrlTtlSeconds * 1000);
        const payload = {
            evidenceId: record.evidenceId,
            tenantId: context.tenantId,
            caseId: context.caseId,
            derivativeType: context.derivativeType || 'original',
            tier: record.tier,
            exp: Math.floor(expiresAt.getTime() / 1000),
        };
        const encodedPayload = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
        const signature = crypto_1.default
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
    async touchAccess(evidenceId, when) {
        const record = await this.adapter.get(evidenceId);
        if (!record)
            return;
        record.lastAccessedAt = when;
        await this.adapter.save(record);
    }
    async auditSignedUrlIssuance(record, token, expiresAt, context) {
        try {
            await this.auditLogger.recordEvent({
                eventType: 'evidence.signed_url.issued',
                level: 'info',
                correlationId: crypto_1.default.randomUUID(),
                tenantId: context.tenantId,
                serviceId: 'intelgraph-provenance',
                serviceName: 'IntelGraph Provenance',
                environment: process.env.NODE_ENV || 'development',
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
        }
        catch (error) {
            logger_js_1.default.warn({
                error: error.message,
                evidenceId: record.evidenceId,
            }, 'Failed to record audit event for signed URL issuance');
        }
    }
}
exports.EvidenceAccessService = EvidenceAccessService;
exports.evidenceAccessService = new EvidenceAccessService();
