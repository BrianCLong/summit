"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.bundleExporter = exports.BundleExporter = void 0;
const crypto_1 = require("crypto");
const pii_redaction_js_1 = require("../middleware/pii-redaction.js");
const ledger_js_1 = require("../provenance/ledger.js");
const ReceiptService_js_1 = require("../services/ReceiptService.js");
const logger_js_1 = __importDefault(require("../utils/logger.js"));
class BundleExporter {
    static instance;
    constructor() { }
    static getInstance() {
        if (!BundleExporter.instance) {
            BundleExporter.instance = new BundleExporter();
        }
        return BundleExporter.instance;
    }
    async exportReceipt(receiptId, tenantId) {
        logger_js_1.default.info({ receiptId, tenantId }, 'Exporting evidence bundle');
        // 1. Fetch the primary receipt from Ledger
        const receiptService = ReceiptService_js_1.ReceiptService.getInstance();
        const mainReceipt = await receiptService.getReceipt(receiptId);
        // Sprint 08 Hardening: Explicit tenant isolation check for the main receipt
        if (!mainReceipt) {
            throw new Error(`Receipt ${receiptId} not found`);
        }
        // Sprint 08 Hardening: Explicit tenant isolation check for the main receipt
        if (mainReceipt.tenantId !== tenantId) {
            logger_js_1.default.warn({ receiptId, requestTenant: tenantId, receiptTenant: mainReceipt.tenantId }, 'Tenant isolation breach attempt in export');
            throw new Error(`Receipt ${receiptId} does not belong to your tenant`);
        }
        // 2. Fetch associated entries from the Ledger (e.g. the original action entry)
        const entries = await ledger_js_1.provenanceLedger.getEntries(tenantId, {
            resourceId: mainReceipt.resource,
            limit: 50
        });
        // 3. Redact PII from entries
        const redactedEntries = entries.map(entry => ({
            ...entry,
            payload: (0, pii_redaction_js_1.redactPII)(entry.payload),
            metadata: (0, pii_redaction_js_1.redactPII)(entry.metadata)
        }));
        // 4. Build artifact collection
        const artifacts = redactedEntries.map(e => ({
            id: e.id,
            type: 'provenance_entry',
            content: e
        }));
        // 5. Generate manifest with hashes
        const hashes = {};
        // Hash main receipt
        hashes[`receipt-${receiptId}.json`] = this.computeHash(mainReceipt);
        // Hash artifacts
        artifacts.forEach(art => {
            hashes[`artifact-${art.id}.json`] = this.computeHash(art.content);
        });
        const bundle = {
            manifest: {
                bundleId: `bundle-${receiptId}-${Date.now()}`,
                tenantId,
                generatedAt: new Date().toISOString(),
                hashes,
                redactionApplied: true
            },
            receipts: [mainReceipt],
            artifacts
        };
        return bundle;
    }
    computeHash(obj) {
        const str = JSON.stringify(obj, Object.keys(obj).sort());
        return (0, crypto_1.createHash)('sha256').update(str).digest('hex');
    }
}
exports.BundleExporter = BundleExporter;
exports.bundleExporter = BundleExporter.getInstance();
