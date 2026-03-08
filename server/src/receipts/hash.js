"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RECEIPT_HASH_ENABLED = void 0;
exports.calculateReceiptHash = calculateReceiptHash;
const crypto_1 = require("crypto");
const canonicalize_js_1 = require("./canonicalize.js");
exports.RECEIPT_HASH_ENABLED = false;
/**
 * Calculates a SHA-256 hash of the canonical representation of a receipt.
 * @param receipt The receipt object.
 * @returns The hex string of the SHA-256 hash.
 */
function calculateReceiptHash(receipt) {
    const canonical = (0, canonicalize_js_1.canonicalize)(receipt);
    return (0, crypto_1.createHash)('sha256').update(canonical).digest('hex');
}
