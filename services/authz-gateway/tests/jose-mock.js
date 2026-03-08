"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SignJWT = void 0;
exports.jwtVerify = jwtVerify;
exports.generateKeyPair = generateKeyPair;
exports.exportJWK = exportJWK;
exports.createRemoteJWKSet = createRemoteJWKSet;
function base64url(input) {
    return Buffer.from(input).toString('base64url');
}
function decode(token) {
    return JSON.parse(Buffer.from(token, 'base64url').toString('utf8'));
}
function parseExpiry(value) {
    const now = Math.floor(Date.now() / 1000);
    if (value instanceof Date) {
        return Math.floor(value.getTime() / 1000);
    }
    if (typeof value === 'number') {
        return Math.floor(value);
    }
    const match = /^([0-9]+)([smhd])?$/.exec(value);
    if (!match) {
        return now + 3600;
    }
    const amount = Number(match[1]);
    const unit = match[2] || 's';
    const multiplier = unit === 'h' ? 3600 : unit === 'm' ? 60 : unit === 'd' ? 86400 : 1;
    return now + amount * multiplier;
}
class SignJWT {
    claims;
    header = {};
    constructor(payload = {}) {
        this.claims = { ...payload };
    }
    setProtectedHeader(header) {
        this.header = { ...header };
        return this;
    }
    setIssuedAt(value) {
        this.claims.iat =
            typeof value === 'number' ? value : Math.floor(Date.now() / 1000);
        return this;
    }
    setExpirationTime(value) {
        this.claims.exp = parseExpiry(value);
        return this;
    }
    setSubject(sub) {
        this.claims.sub = sub;
        return this;
    }
    setIssuer(iss) {
        this.claims.iss = iss;
        return this;
    }
    setAudience(aud) {
        this.claims.aud = aud;
        return this;
    }
    sign(_key) {
        void _key;
        const token = {
            payload: this.claims,
            header: this.header,
        };
        return Promise.resolve(base64url(JSON.stringify(token)));
    }
}
exports.SignJWT = SignJWT;
async function jwtVerify(token, _key, options) {
    const decoded = decode(token);
    const payload = decoded.payload || {};
    const exp = typeof payload.exp === 'number' ? payload.exp : undefined;
    const now = Math.floor(Date.now() / 1000);
    if (exp && exp < now) {
        throw new Error('token_expired');
    }
    if (options?.audience && payload.aud && payload.aud !== options.audience) {
        throw new Error('audience_mismatch');
    }
    if (options?.issuer && payload.iss && payload.iss !== options.issuer) {
        throw new Error('issuer_mismatch');
    }
    return {
        payload,
        protectedHeader: { kid: decoded.header?.kid || 'mock-kid' },
    };
}
async function generateKeyPair() {
    return {
        publicKey: 'mock-public-key',
        privateKey: 'mock-private-key',
    };
}
async function exportJWK() {
    return { kty: 'RSA', kid: 'mock-kid', use: 'sig', alg: 'RS256' };
}
function createRemoteJWKSet() {
    return async () => ({
        keys: [{ kid: 'mock-kid', use: 'sig', alg: 'RS256' }],
    });
}
