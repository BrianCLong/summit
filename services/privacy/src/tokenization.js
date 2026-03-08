"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.tokenize = tokenize;
exports.detokenize = detokenize;
const crypto_1 = __importDefault(require("crypto"));
// Deterministic tokenization using AES-256-CTR with IV derived from AAD.
// Placeholder for AES-SIV via Google Tink.
const KEY = crypto_1.default
    .createHash('sha256')
    .update(process.env.PRIVACY_TOKEN_KEY || 'dev-secret')
    .digest();
function deriveIv(aad) {
    return crypto_1.default
        .createHash('sha256')
        .update(JSON.stringify(aad))
        .digest()
        .subarray(0, 16);
}
function tokenize(value, aad) {
    const iv = deriveIv(aad);
    const cipher = crypto_1.default.createCipheriv('aes-256-ctr', KEY, iv);
    const ct = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    return `tok_${ct.toString('base64url')}`;
}
function detokenize(token, aad) {
    if (!token.startsWith('tok_'))
        throw new Error('invalid token');
    const iv = deriveIv(aad);
    const decipher = crypto_1.default.createDecipheriv('aes-256-ctr', KEY, iv);
    const pt = Buffer.concat([
        decipher.update(Buffer.from(token.slice(4), 'base64url')),
        decipher.final(),
    ]);
    return pt.toString('utf8');
}
