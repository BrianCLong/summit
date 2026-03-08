"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportStore = void 0;
const crypto_1 = __importDefault(require("crypto"));
const sign_js_1 = require("../evidence/attestation/sign.js");
function hashPayload(payload) {
    return crypto_1.default.createHash('sha256').update(payload).digest('hex');
}
function sortObjectKeys(value) {
    if (Array.isArray(value)) {
        return value.map(sortObjectKeys);
    }
    if (value && typeof value === 'object') {
        return Object.keys(value)
            .sort()
            .reduce((acc, key) => {
            acc[key] = sortObjectKeys(value[key]);
            return acc;
        }, {});
    }
    return value;
}
function stableStringify(value) {
    return JSON.stringify(sortObjectKeys(value));
}
class ReportStore {
    reports = new Map();
    lastManifestHash;
    async record(params) {
        const artifactHash = hashPayload(params.artifact.buffer.toString('base64'));
        const receipt = {
            id: crypto_1.default.randomUUID(),
            reportId: params.reportId,
            issuedAt: new Date().toISOString(),
            artifactHash,
            manifestHash: '',
        };
        const manifestBase = {
            id: crypto_1.default.randomUUID(),
            reportId: params.reportId,
            reportType: params.reportType,
            templateId: params.templateId,
            tenantId: params.tenantId,
            createdAt: new Date().toISOString(),
            format: params.artifact.format,
            artifact: {
                fileName: params.artifact.fileName,
                mimeType: params.artifact.mimeType,
                checksum: artifactHash,
            },
            receipts: [
                {
                    id: receipt.id,
                    reportId: receipt.reportId,
                    issuedAt: receipt.issuedAt,
                    artifactHash: receipt.artifactHash,
                },
            ],
            previousHash: this.lastManifestHash,
        };
        const manifestHash = hashPayload(stableStringify(manifestBase));
        receipt.manifestHash = manifestHash;
        const manifest = {
            ...manifestBase,
            receipts: [receipt],
            manifestHash,
        };
        const signature = await (0, sign_js_1.signManifest)(manifest, { signerType: 'none' });
        const record = {
            id: params.reportId,
            reportType: params.reportType,
            templateId: params.templateId,
            tenantId: params.tenantId,
            createdAt: manifest.createdAt,
            format: params.artifact.format,
            artifact: params.artifact,
            manifest,
            signature,
            receipt,
        };
        this.reports.set(params.reportId, record);
        this.lastManifestHash = manifestHash;
        return record;
    }
    get(reportId, tenantId) {
        const record = this.reports.get(reportId);
        if (!record)
            return undefined;
        // SECURITY: Strict tenant scoping - caller must provide tenantId and it must match
        // This prevents tenant bypass attacks where undefined tenantId could leak data
        if (record.tenantId !== tenantId) {
            return undefined;
        }
        return record;
    }
}
exports.ReportStore = ReportStore;
