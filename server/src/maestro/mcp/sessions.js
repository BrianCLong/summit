"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.signSession = signSession;
exports.verifySessionToken = verifySessionToken;
exports.revokeSession = revokeSession;
exports.isRevoked = isRevoked;
const crypto_1 = __importDefault(require("crypto"));
const ALGO = 'sha256';
function signSession(payload) {
    const secret = process.env.SESSION_SECRET;
    if (!secret)
        throw new Error('SESSION_SECRET must be set');
    const now = Math.floor(Date.now() / 1000);
    const ttlSec = Number(process.env.SESSION_TTL_SECONDS || 3600);
    const data = {
        sid: crypto_1.default.randomUUID(),
        iat: now,
        exp: now + ttlSec,
        ...payload,
    };
    const body = Buffer.from(JSON.stringify(data)).toString('base64url');
    const sig = crypto_1.default.createHmac(ALGO, secret).update(body).digest('base64url');
    return { sid: data.sid, token: `${body}.${sig}` };
}
function verifySessionToken(token) {
    if (!token)
        return null;
    const secret = process.env.SESSION_SECRET;
    if (!secret)
        return null;
    const [body, sig] = token.split('.');
    if (!body || !sig)
        return null;
    const expected = crypto_1.default
        .createHmac(ALGO, secret)
        .update(body)
        .digest('base64url');
    // timing-safe compare
    const a = Buffer.from(expected);
    const b = Buffer.from(sig);
    if (a.length !== b.length || !crypto_1.default.timingSafeEqual(a, b))
        return null;
    try {
        const data = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
        if (typeof data.exp === 'number' &&
            Math.floor(Date.now() / 1000) > data.exp)
            return null;
        return data;
    }
    catch {
        return null;
    }
}
// Basic in-memory revocation list and registry (ephemeral)
const revoked = new Set();
function revokeSession(sid) {
    revoked.add(sid);
}
function isRevoked(sid) {
    return revoked.has(sid);
}
