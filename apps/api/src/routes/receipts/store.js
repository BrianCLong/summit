"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReceiptStore = void 0;
const provenance_1 = require("@intelgraph/provenance");
class ReceiptStore {
    receipts = new Map();
    artifacts = new Map();
    seed(receipt, artifactBlobs = {}) {
        this.receipts.set(receipt.id, receipt);
        this.artifacts.set(receipt.id, artifactBlobs);
    }
    get(id) {
        return this.receipts.get(id);
    }
    export(request) {
        const receipt = this.receipts.get(request.id);
        if (!receipt)
            return null;
        const redactions = request.redactions ?? [];
        const redactedReceipt = redactions.length
            ? (0, provenance_1.applyRedaction)(receipt, redactions, request.reason)
            : receipt;
        const artifacts = { ...(this.artifacts.get(request.id) ?? {}) };
        for (const field of redactions) {
            delete artifacts[field];
        }
        return { receipt: redactedReceipt, artifacts };
    }
}
exports.ReceiptStore = ReceiptStore;
