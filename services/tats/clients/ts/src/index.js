"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TatsClient = exports.InMemoryReplayCache = void 0;
exports.verifyToken = verifyToken;
const base64url_1 = __importDefault(require("base64url"));
const tweetnacl_1 = __importDefault(require("tweetnacl"));
class InMemoryReplayCache {
    now;
    store = new Map();
    constructor(now = () => Math.floor(Date.now() / 1000)) {
        this.now = now;
    }
    checkAndStore(jti, expiresAt) {
        const now = this.now();
        for (const [key, exp] of this.store.entries()) {
            if (exp <= now) {
                this.store.delete(key);
            }
        }
        if (this.store.has(jti)) {
            return false;
        }
        this.store.set(jti, expiresAt);
        return true;
    }
}
exports.InMemoryReplayCache = InMemoryReplayCache;
class TatsClient {
    baseUrl;
    fetchImpl;
    constructor(baseUrl, fetchImpl = fetch) {
        this.baseUrl = baseUrl;
        this.fetchImpl = fetchImpl;
    }
    async issueToken(request) {
        return this.post('/v1/tokens', request);
    }
    async attenuate(request) {
        return this.post('/v1/attenuate', request);
    }
    async publicKey() {
        const response = await this.fetchImpl(new URL('/v1/keys', this.baseUrl), {
            method: 'GET',
        });
        if (!response.ok) {
            throw new Error(`failed to fetch public key: ${response.status}`);
        }
        const payload = await response.json();
        return payload.public_key;
    }
    async post(path, body) {
        const response = await this.fetchImpl(new URL(path, this.baseUrl), {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
            },
            body: JSON.stringify(body),
        });
        if (!response.ok) {
            const text = await response.text();
            throw new Error(`request failed (${response.status}): ${text}`);
        }
        return (await response.json());
    }
}
exports.TatsClient = TatsClient;
function verifyToken(token, publicKey, cache, options = {}) {
    const parsed = parseToken(token);
    const message = new TextEncoder().encode(`${parsed.headerB64}.${parsed.payloadB64}`);
    const signature = base64url_1.default.toBuffer(parsed.signatureB64);
    const key = typeof publicKey === 'string' ? decodeBase64(publicKey) : publicKey;
    const valid = tweetnacl_1.default.sign.detached.verify(message, signature, key);
    if (!valid) {
        throw new Error('invalid signature');
    }
    const nowFn = options.now ?? (() => Math.floor(Date.now() / 1000));
    if (parsed.claims.expires_at <= nowFn()) {
        throw new Error('token expired');
    }
    if (options.expectedAudience && parsed.claims.audience !== options.expectedAudience) {
        throw new Error('audience mismatch');
    }
    if (options.requiredDatasets) {
        for (const dataset of options.requiredDatasets) {
            if (!parsed.claims.dataset_ids.includes(dataset)) {
                throw new Error('dataset mismatch');
            }
        }
    }
    if (options.requiredRowScopes) {
        for (const [dataset, rows] of Object.entries(options.requiredRowScopes)) {
            const allowed = parsed.claims.row_scopes?.[dataset];
            if (!allowed) {
                if (!parsed.claims.dataset_ids.includes(dataset)) {
                    throw new Error('row scope mismatch');
                }
                continue;
            }
            for (const row of rows) {
                if (!allowed.includes(row)) {
                    throw new Error('row scope mismatch');
                }
            }
        }
    }
    if (options.requiredPurposes) {
        for (const purpose of options.requiredPurposes) {
            if (!parsed.claims.purposes.includes(purpose)) {
                throw new Error('purpose mismatch');
            }
        }
    }
    if (!cache.checkAndStore(parsed.claims.jti, parsed.claims.expires_at)) {
        throw new Error('replay detected');
    }
    return parsed.claims;
}
function parseToken(token) {
    const parts = token.split('.');
    if (parts.length !== 3) {
        throw new Error('token format invalid');
    }
    const [headerB64, payloadB64, signatureB64] = parts;
    const decoder = new TextDecoder();
    const header = JSON.parse(decoder.decode(base64url_1.default.toBuffer(headerB64)));
    const claims = JSON.parse(decoder.decode(base64url_1.default.toBuffer(payloadB64)));
    return { header, claims, headerB64, payloadB64, signatureB64 };
}
function decodeBase64(value) {
    if (typeof Buffer !== 'undefined') {
        return Uint8Array.from(Buffer.from(value, 'base64'));
    }
    const binary = atob(value);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}
