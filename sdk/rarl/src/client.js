"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RarlClient = void 0;
exports.verifySnapshot = verifySnapshot;
const crypto_1 = require("crypto");
function assertFetch(fetchImpl) {
    if (!fetchImpl) {
        throw new Error('fetch is not available; provide fetchImpl in options');
    }
}
class RarlClient {
    baseUrl;
    fetchImpl;
    constructor(options) {
        this.baseUrl = options.baseUrl.replace(/\/$/, '');
        this.fetchImpl = options.fetchImpl ?? globalThis.fetch;
    }
    async requestDecision(payload) {
        const fetchImpl = this.fetchImpl;
        assertFetch(fetchImpl);
        const response = await fetchImpl(`${this.baseUrl}/decision`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!response.ok) {
            const text = await response.text();
            throw new Error(`RARL decision rejected: ${response.status} ${text}`);
        }
        const body = await response.json();
        return body.decision;
    }
    async getSnapshot(tenantId) {
        const fetchImpl = this.fetchImpl;
        assertFetch(fetchImpl);
        const response = await fetchImpl(`${this.baseUrl}/snapshot/${tenantId}`, {
            method: 'GET'
        });
        if (!response.ok) {
            const text = await response.text();
            throw new Error(`RARL snapshot request failed: ${response.status} ${text}`);
        }
        return (await response.json());
    }
    static verifySnapshot(secret, signed) {
        return verifySnapshot(secret, signed.snapshot, signed.signature);
    }
}
exports.RarlClient = RarlClient;
function verifySnapshot(secret, snapshot, signature) {
    const payload = Buffer.from(JSON.stringify(snapshot));
    const hmac = (0, crypto_1.createHmac)('sha256', secret);
    hmac.update(payload);
    const expected = hmac.digest();
    const actual = Buffer.from(signature, 'base64');
    if (expected.length !== actual.length) {
        return false;
    }
    return (0, crypto_1.timingSafeEqual)(expected, actual);
}
