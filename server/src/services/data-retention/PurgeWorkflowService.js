"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PurgeWorkflowService = void 0;
const crypto_1 = require("crypto");
const ReceiptService_js_1 = require("../ReceiptService.js");
const SigningService_js_1 = require("../SigningService.js");
class PurgeWorkflowService {
    _signer;
    _receipts;
    executor;
    constructor(executor, overrides) {
        this.executor = executor;
        this._signer = overrides?.signer;
        this._receipts = overrides?.receipts;
    }
    get signer() {
        if (!this._signer) {
            this._signer = new SigningService_js_1.SigningService();
        }
        return this._signer;
    }
    get receipts() {
        if (!this._receipts) {
            this._receipts = ReceiptService_js_1.ReceiptService.getInstance();
        }
        return this._receipts;
    }
    async executePurge(request) {
        const purgeId = request.purgeId ?? `purge-${(0, crypto_1.randomUUID)()}`;
        const requestedAt = request.requestedAt ?? new Date().toISOString();
        const executedAt = new Date().toISOString();
        const dryRun = request.dryRun ?? false;
        const context = {
            purgeId,
            tenantId: request.tenantId,
            actorId: request.actorId,
            purpose: request.purpose,
            window: request.window,
            dryRun,
            requestedAt,
            policyDecisionId: request.policyDecisionId,
        };
        const results = await Promise.all(request.targets.map((target) => this.executor.purge(target, context)));
        const manifestTargets = results.map((result) => {
            const sampledIdsHash = result.sampledIds?.length
                ? (0, crypto_1.createHash)('sha256')
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
    buildManifest(params) {
        const manifest = {
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
        const manifestHash = (0, crypto_1.createHash)('sha256').update(canonical).digest('hex');
        const signature = this.signer.sign(canonical);
        const signerKeyId = `${this.signer.getPublicKey().slice(0, 32)}...`;
        manifest.manifestHash = manifestHash;
        manifest.signature = signature;
        manifest.signerKeyId = signerKeyId;
        return manifest;
    }
    async createReceipt(params) {
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
    buildDisclosureBundle(params) {
        const bundle = {
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
exports.PurgeWorkflowService = PurgeWorkflowService;
function canonicalize(value) {
    return JSON.stringify(sortKeys(value));
}
function sortKeys(value) {
    if (Array.isArray(value)) {
        return value.map((item) => sortKeys(item));
    }
    if (value && typeof value === 'object') {
        return Object.keys(value)
            .sort()
            .reduce((acc, key) => {
            acc[key] = sortKeys(value[key]);
            return acc;
        }, {});
    }
    return value;
}
