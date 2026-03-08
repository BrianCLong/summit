"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.signPayload = signPayload;
exports.verifySignature = verifySignature;
const crypto_1 = __importDefault(require("crypto"));
const SIGNATURE_VERSION = 'v1';
function signPayload(secret, payload, timestamp, idempotencyKey) {
    const body = typeof payload === 'string' ? payload : JSON.stringify(payload ?? {});
    const hmac = crypto_1.default.createHmac('sha256', secret);
    hmac.update(`${timestamp}.${idempotencyKey}.${body}`);
    return `${SIGNATURE_VERSION}=${hmac.digest('hex')}`;
}
function verifySignature(secret, payload, timestamp, idempotencyKey, signature) {
    const expected = signPayload(secret, payload, timestamp, idempotencyKey);
    const normalizedGiven = Buffer.from(signature || '');
    const normalizedExpected = Buffer.from(expected);
    if (normalizedExpected.length !== normalizedGiven.length) {
        return false;
    }
    return crypto_1.default.timingSafeEqual(normalizedExpected, normalizedGiven);
}
