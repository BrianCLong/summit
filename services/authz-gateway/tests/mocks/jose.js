"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SignJWT = void 0;
exports.jwtVerify = jwtVerify;
exports.createRemoteJWKSet = createRemoteJWKSet;
exports.exportJWK = exportJWK;
exports.generateKeyPair = generateKeyPair;
const crypto_1 = __importDefault(require("crypto"));
function base64url(input) {
    return Buffer.from(input).toString('base64url');
}
function decodePayload(token) {
    const parts = token.split('.');
    if (parts.length < 2) {
        throw new Error('invalid_token');
    }
    const payload = Buffer.from(parts[1], 'base64url').toString('utf8');
    return JSON.parse(payload);
}
function parseExpiry(value) {
    if (typeof value === 'number') {
        return value;
    }
    const trimmed = value.trim();
    if (trimmed.endsWith('h')) {
        const hours = Number(trimmed.replace('h', '')) || 0;
        return Math.floor(Date.now() / 1000) + hours * 60 * 60;
    }
    if (trimmed.endsWith('m')) {
        const minutes = Number(trimmed.replace('m', '')) || 0;
        return Math.floor(Date.now() / 1000) + minutes * 60;
    }
    return Math.floor(Date.now() / 1000) + Number(trimmed || 0);
}
class SignJWT {
    claims;
    header = {};
    constructor(payload) {
        this.claims = { ...payload };
    }
    setProtectedHeader(header) {
        this.header = header;
        return this;
    }
    setIssuedAt(timestamp) {
        const now = Math.floor(Date.now() / 1000);
        this.claims.iat = timestamp ?? now;
        return this;
    }
    setExpirationTime(expiry) {
        this.claims.exp = parseExpiry(expiry);
        return this;
    }
    setIssuer(issuer) {
        this.claims.iss = issuer;
        return this;
    }
    async sign(key) {
        void key;
        const header = base64url(JSON.stringify(this.header || { alg: 'RS256' }));
        const payload = base64url(JSON.stringify(this.claims));
        const signature = crypto_1.default
            .createHash('sha256')
            .update(`${header}.${payload}`)
            .digest('base64url');
        return `${header}.${payload}.${signature}`;
    }
}
exports.SignJWT = SignJWT;
async function jwtVerify(token, key, options = {}) {
    void key;
    const payload = decodePayload(token);
    const now = Math.floor(Date.now() / 1000);
    const exp = Number(payload.exp || 0);
    if (exp && exp < now) {
        throw new Error('token_expired');
    }
    if (options.issuer && payload.iss && payload.iss !== options.issuer) {
        throw new Error('issuer_mismatch');
    }
    return { payload };
}
async function createRemoteJWKSet(url) {
    void url;
    return {};
}
async function exportJWK(key) {
    void key;
    return { kty: 'oct', k: 'stub' };
}
async function generateKeyPair(alg) {
    void alg;
    return { privateKey: 'stub-private', publicKey: 'stub-public' };
}
