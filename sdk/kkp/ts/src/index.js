"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KkpClient = void 0;
exports.verifyToken = verifyToken;
const ed25519_1 = require("@noble/ed25519");
class KkpClient {
    baseUrl;
    fetchImpl;
    constructor(options) {
        this.baseUrl = options.baseUrl.replace(/\/$/, '');
        this.fetchImpl = options.fetchImpl ?? globalThis.fetch;
        if (!this.fetchImpl) {
            throw new Error('fetch implementation required');
        }
    }
    async issueToken(request) {
        const response = await this.fetchImpl(`${this.baseUrl}/token`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(request),
        });
        if (!response.ok) {
            throw new Error(`token request failed: ${response.status}`);
        }
        return (await response.json());
    }
    async decrypt(envelope, token, context = {}) {
        const response = await this.fetchImpl(`${this.baseUrl}/envelope/decrypt`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ envelope, token, context }),
        });
        if (!response.ok) {
            throw new Error(`decrypt failed: ${response.status}`);
        }
        return (await response.json());
    }
    async fetchJwks() {
        const response = await this.fetchImpl(`${this.baseUrl}/keys/jwks`);
        if (!response.ok) {
            throw new Error(`jwks fetch failed: ${response.status}`);
        }
        const body = await response.json();
        return (body.keys ?? []);
    }
}
exports.KkpClient = KkpClient;
function base64UrlDecode(input) {
    const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized + '==='.slice((normalized.length + 3) % 4);
    if (typeof globalThis.atob === 'function') {
        const binary = globalThis.atob(padded);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i += 1) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes;
    }
    const bufferCtor = globalThis.Buffer;
    if (bufferCtor) {
        const buf = bufferCtor.from(padded, 'base64');
        return new Uint8Array(buf);
    }
    throw new Error('No base64 decoder available');
}
function decodeJson(segment) {
    const bytes = base64UrlDecode(segment);
    const text = new TextDecoder().decode(bytes);
    return JSON.parse(text);
}
async function verifyToken(token, keys) {
    const [headerPart, payloadPart, signaturePart] = token.split('.');
    if (!headerPart || !payloadPart || !signaturePart) {
        throw new Error('token format invalid');
    }
    const header = decodeJson(headerPart);
    if (header.alg !== 'EdDSA') {
        throw new Error(`unsupported algorithm: ${header.alg}`);
    }
    const jwk = keys.find((key) => key.kid === header.kid);
    if (!jwk) {
        throw new Error('unknown key id');
    }
    const publicKey = base64UrlDecode(jwk.x);
    const signature = base64UrlDecode(signaturePart);
    const message = new TextEncoder().encode(`${headerPart}.${payloadPart}`);
    const valid = await (0, ed25519_1.verify)(signature, message, publicKey);
    if (!valid) {
        throw new Error('signature invalid');
    }
    const claims = decodeJson(payloadPart);
    const now = Math.floor(Date.now() / 1000);
    if (claims.exp <= now) {
        throw new Error('token expired');
    }
    return claims;
}
