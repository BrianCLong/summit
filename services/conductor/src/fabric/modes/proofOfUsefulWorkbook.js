"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.issueProofOfUsefulWorkbook = issueProofOfUsefulWorkbook;
const crypto_1 = require("crypto");
function issueProofOfUsefulWorkbook(specId, steps, runs) {
    const receipts = steps.map((step) => ({
        step: step.name,
        status: runs(step),
        timestamp: new Date().toISOString(),
    }));
    const digest = (0, crypto_1.createHash)('sha256')
        .update(specId + JSON.stringify(steps) + JSON.stringify(receipts))
        .digest('hex');
    return {
        workbook: { steps },
        receipts,
        digest: `sha256:${digest}`,
    };
}
