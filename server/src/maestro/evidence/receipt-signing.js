"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyReceiptSignature = exports.buildReceiptSignature = exports.signReceiptPayload = exports.resolveReceiptSigningConfig = void 0;
const crypto_1 = __importDefault(require("crypto"));
const receipt_js_1 = require("./receipt.js");
const DEV_FALLBACK_SECRET = 'dev-secret';
const parseKeyring = () => {
    if (process.env.EVIDENCE_SIGNING_KEYS) {
        const parsed = JSON.parse(process.env.EVIDENCE_SIGNING_KEYS);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            throw new Error('EVIDENCE_SIGNING_KEYS must be a JSON object of { kid: secret }');
        }
        return Object.fromEntries(Object.entries(parsed).map(([kid, secret]) => [kid, String(secret)]));
    }
    const secret = process.env.EVIDENCE_SIGNING_SECRET ||
        (process.env.NODE_ENV !== 'production' ? DEV_FALLBACK_SECRET : undefined);
    if (!secret) {
        return {};
    }
    return {
        [process.env.EVIDENCE_SIGNER_KID || 'dev']: secret,
    };
};
const resolveReceiptSigningConfig = () => {
    const keyring = parseKeyring();
    const configuredKeyId = process.env.EVIDENCE_SIGNER_KID || Object.keys(keyring)[0];
    if (!configuredKeyId || !keyring[configuredKeyId]) {
        throw new Error('Receipt signing requires EVIDENCE_SIGNING_KEYS or EVIDENCE_SIGNING_SECRET');
    }
    return {
        keyId: configuredKeyId,
        algorithm: 'HS256',
        secret: keyring[configuredKeyId],
        keyring,
    };
};
exports.resolveReceiptSigningConfig = resolveReceiptSigningConfig;
const signReceiptPayload = (payload, secret) => crypto_1.default
    .createHmac('sha256', secret)
    .update((0, receipt_js_1.canonicalStringify)(payload))
    .digest('base64url');
exports.signReceiptPayload = signReceiptPayload;
const buildReceiptSignature = (payload) => {
    const signer = (0, exports.resolveReceiptSigningConfig)();
    return {
        key_id: signer.keyId,
        algorithm: signer.algorithm,
        value: (0, exports.signReceiptPayload)(payload, signer.secret),
    };
};
exports.buildReceiptSignature = buildReceiptSignature;
const verifyReceiptSignature = (payload, signature, keyring) => {
    const keys = keyring || (0, exports.resolveReceiptSigningConfig)().keyring;
    const candidateKeys = signature?.key_id
        ? { [signature.key_id]: keys[signature.key_id] }
        : keys;
    return Object.entries(candidateKeys).some(([_, secret]) => {
        if (!secret) {
            return false;
        }
        const expected = (0, exports.signReceiptPayload)(payload, secret);
        return expected === signature.value;
    });
};
exports.verifyReceiptSignature = verifyReceiptSignature;
