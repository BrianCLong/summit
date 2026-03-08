"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.supportBundleService = exports.SupportBundleService = void 0;
const crypto_1 = require("crypto");
const SupportPolicyGate_js_1 = require("./SupportPolicyGate.js");
const support_js_1 = require("../../policies/support.js");
const TenantService_js_1 = require("../TenantService.js");
const redact_js_1 = require("../../redaction/redact.js");
const errors_js_1 = require("../../lib/errors.js");
const ledger_js_1 = require("../../provenance/ledger.js");
const ReceiptService_js_1 = require("../ReceiptService.js");
const sign_js_1 = require("../../evidence/attestation/sign.js");
const logger_js_1 = __importDefault(require("../../utils/logger.js"));
const slo_js_1 = require("../../slo.js");
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
    rules: ['pii', 'financial', 'sensitive'],
    allowedFields: SUPPORT_BUNDLE_ALLOWED_FIELDS,
    redactionMask: '[REDACTED]',
};
function parseLogPointers(raw) {
    if (!raw)
        return [];
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
    }
    catch (error) {
        logger_js_1.default.warn({ error }, 'Failed to parse SUPPORT_BUNDLE_LOG_POINTERS');
        return [];
    }
}
class SupportBundleService {
    static instance;
    tenantService = TenantService_js_1.TenantService.getInstance();
    redactionService = new redact_js_1.RedactionService();
    ledger = ledger_js_1.ProvenanceLedgerV2.getInstance();
    receiptService = ReceiptService_js_1.ReceiptService.getInstance();
    static getInstance() {
        if (!SupportBundleService.instance) {
            SupportBundleService.instance = new SupportBundleService();
        }
        return SupportBundleService.instance;
    }
    async generateBundle(params) {
        const { actor, tenantId, reason, receiptsLimit = 25, sloRunbook = process.env.SUPPORT_BUNDLE_SLO_RUNBOOK || 'golden-path', sloWindow = process.env.SUPPORT_BUNDLE_SLO_WINDOW || '24h', } = params;
        const policyDecision = await (0, SupportPolicyGate_js_1.enforceSupportPolicy)({
            actor,
            policy: support_js_1.SUPPORT_BUNDLE_POLICY,
            action: 'support:bundle:generate',
            resource: {
                id: tenantId,
                type: 'SupportBundle',
            },
            justification: reason,
        });
        const tenant = await this.tenantService.getTenant(tenantId);
        if (!tenant) {
            throw new errors_js_1.AppError('Tenant not found.', 404, 'TENANT_NOT_FOUND');
        }
        const logPointers = parseLogPointers(process.env.SUPPORT_BUNDLE_LOG_POINTERS);
        const receipts = await this.ledger.getEntries(tenantId, {
            limit: receiptsLimit,
            order: 'DESC',
        });
        let sloSnapshot = {
            statusLabel: 'unavailable',
            runbook: sloRunbook,
            window: sloWindow,
        };
        try {
            const data = await (0, slo_js_1.computeBurn)(sloRunbook, tenantId, sloWindow);
            sloSnapshot = {
                statusLabel: 'ok',
                runbook: sloRunbook,
                window: sloWindow,
                data,
            };
        }
        catch (error) {
            logger_js_1.default.warn({ error, tenantId, runbook: sloRunbook }, 'Failed to compute SLO snapshot for support bundle');
            sloSnapshot = {
                statusLabel: 'unavailable',
                runbook: sloRunbook,
                window: sloWindow,
                error: error?.message || 'SLO snapshot unavailable',
            };
        }
        const generatedAt = new Date().toISOString();
        const bundleId = `support-bundle-${(0, crypto_1.randomUUID)()}`;
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
        const redactedBundle = await this.redactionService.redactObject(bundle, SUPPORT_BUNDLE_REDACTION_POLICY, tenantId, { actorId: actor.id, policyId: policyDecision.policyId });
        const payload = JSON.stringify(redactedBundle);
        const payloadHash = (0, crypto_1.createHash)('sha256').update(payload).digest('hex');
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
            'none');
        const manifestSignature = await (0, sign_js_1.signManifest)(manifest, {
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
exports.SupportBundleService = SupportBundleService;
exports.supportBundleService = SupportBundleService.getInstance();
