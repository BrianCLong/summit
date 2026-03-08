"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.canonicalize = canonicalize;
exports.canonicalStringify = canonicalStringify;
exports.sha256 = sha256;
exports.hmacSha256 = hmacSha256;
// @ts-nocheck
const crypto_1 = __importDefault(require("crypto"));
// Recursively sort object keys to guarantee deterministic serialization across platforms
function canonicalize(value) {
    if (value === null || value === undefined)
        return null;
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean')
        return value;
    if (Array.isArray(value))
        return value.map((item) => canonicalize(item));
    if (value instanceof Date)
        return value.toISOString();
    if (Buffer.isBuffer(value))
        return value.toString('base64');
    if (typeof value === 'object') {
        const sorted = {};
        for (const key of Object.keys(value).sort()) {
            sorted[key] = canonicalize(value[key]);
        }
        return sorted;
    }
    return String(value);
}
function canonicalStringify(value) {
    return JSON.stringify(canonicalize(value));
}
function sha256(value) {
    const serialized = typeof value === 'string' || Buffer.isBuffer(value) ? value : canonicalStringify(value);
    return crypto_1.default.createHash('sha256').update(serialized).digest('hex');
}
function hmacSha256(secret, value) {
    const serialized = canonicalStringify(value);
    return crypto_1.default.createHmac('sha256', secret).update(serialized).digest('hex');
}
