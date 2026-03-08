"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createReceipt = createReceipt;
exports.summarizeReceipt = summarizeReceipt;
function createReceipt(payload) {
    return {
        ...payload,
        timestamp: payload.timestamp ?? new Date().toISOString(),
    };
}
function summarizeReceipt(receipt) {
    return [
        `decision=${receipt.decision}`,
        `durationMs=${receipt.durationMs}`,
        `retries=${receipt.retries}`,
        `inputsDigest=${receipt.inputsDigest}`,
        receipt.outputsDigest ? `outputsDigest=${receipt.outputsDigest}` : null,
    ]
        .filter(Boolean)
        .join(' ');
}
