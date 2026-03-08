"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyReceipt = exports.hashReceipt = exports.hashReceiptPayload = exports.canonicalReceiptPayload = exports.RECEIPT_VERSION = void 0;
exports.canonicalizeReceiptPayload = canonicalizeReceiptPayload;
exports.computeReceiptPayloadHash = computeReceiptPayloadHash;
exports.computeReceiptHash = computeReceiptHash;
exports.verifyReceiptSignature = verifyReceiptSignature;
exports.signReceipt = signReceipt;
exports.applyRedactions = applyRedactions;
exports.applyRedaction = applyRedaction;
const crypto_1 = require("crypto");
exports.RECEIPT_VERSION = '0.1.0';
// Lightweight canonicalization helper without strict typing to accommodate
// strongly-typed receipt structures.
function sortJson(value) {
    if (Array.isArray(value)) {
        return value.map((item) => sortJson(item));
    }
    if (value && typeof value === 'object') {
        const entries = Object.entries(value).sort(([a], [b]) => a.localeCompare(b));
        return entries.reduce((acc, [k, v]) => {
            acc[k] = sortJson(v);
            return acc;
        }, {});
    }
    return value;
}
function canonicalizeReceiptPayload(receipt) {
    const { signature, proofs: _proofs, payloadHash: _payloadHash, ...rest } = receipt;
    const sanitizedSignature = {
        ...signature,
        value: null,
    };
    const payload = {
        ...rest,
        signature: sanitizedSignature,
    };
    return JSON.stringify(sortJson(payload));
}
function computeReceiptPayloadHash(receipt) {
    const canonical = canonicalizeReceiptPayload(receipt);
    return (0, crypto_1.createHash)('sha256').update(canonical).digest('hex');
}
function computeReceiptHash(receipt) {
    const { proofs: _proofs, ...rest } = receipt;
    const canonical = JSON.stringify(sortJson(rest));
    return (0, crypto_1.createHash)('sha256').update(canonical).digest('hex');
}
function verifyReceiptSignature(receipt) {
    if (receipt.signature.algorithm !== 'ed25519')
        return false;
    const payloadHash = computeReceiptPayloadHash(receipt);
    if (payloadHash !== receipt.payloadHash) {
        return false;
    }
    return (0, crypto_1.verify)(null, Buffer.from(payloadHash, 'hex'), {
        key: Buffer.from(receipt.signature.publicKey, 'base64'),
        format: 'der',
        type: 'spki',
    }, Buffer.from(receipt.signature.value, 'base64'));
}
function signReceipt(receipt, keyId) {
    const { publicKey, privateKey } = (0, crypto_1.generateKeyPairSync)('ed25519');
    const baseReceipt = {
        ...receipt,
        version: exports.RECEIPT_VERSION,
        payloadHash: '',
        signature: {
            algorithm: 'ed25519',
            keyId: keyId ?? 'default',
            publicKey: publicKey.export({ type: 'spki', format: 'der' }).toString('base64'),
            value: '',
            signedAt: new Date().toISOString(),
            ...receipt.signature,
        },
        proofs: {
            receiptHash: '',
        },
    };
    const payloadHash = computeReceiptPayloadHash(baseReceipt);
    const signature = (0, crypto_1.sign)(null, Buffer.from(payloadHash, 'hex'), privateKey).toString('base64');
    const signed = {
        ...baseReceipt,
        payloadHash,
        signature: {
            ...baseReceipt.signature,
            value: signature,
        },
    };
    const receiptHash = computeReceiptHash(signed);
    signed.proofs.receiptHash = receiptHash;
    return signed;
}
function applyRedactions(source, redactions = []) {
    const clone = JSON.parse(JSON.stringify(source));
    for (const rule of redactions) {
        const segments = rule.path.split('.').filter(Boolean);
        let cursor = clone;
        for (let i = 0; i < segments.length; i += 1) {
            const key = segments[i];
            if (i === segments.length - 1) {
                if (cursor && typeof cursor === 'object' && key in cursor) {
                    delete cursor[key];
                }
            }
            else if (cursor && typeof cursor === 'object' && key in cursor) {
                cursor = cursor[key];
            }
            else {
                break;
            }
        }
    }
    return clone;
}
// Function aliases for backward compatibility
exports.canonicalReceiptPayload = canonicalizeReceiptPayload;
exports.hashReceiptPayload = computeReceiptPayloadHash;
exports.hashReceipt = computeReceiptHash;
exports.verifyReceipt = verifyReceiptSignature;
/**
 * Apply redaction to specific fields in a receipt, marking hashes as REDACTED
 * and tracking disclosure metadata.
 */
function applyRedaction(receipt, fieldsToRedact, reason) {
    const clone = JSON.parse(JSON.stringify(receipt));
    if (clone.hashes?.inputs) {
        for (const input of clone.hashes.inputs) {
            if (fieldsToRedact.includes(input.name) && input.redactable !== false) {
                input.hash = 'REDACTED';
            }
        }
    }
    clone.disclosure = {
        redactions: fieldsToRedact,
        reason,
    };
    return clone;
}
__exportStar(require("./trace-model"), exports);
__exportStar(require("./replay-runner"), exports);
__exportStar(require("./mapping"), exports);
