"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpLedgerClient = void 0;
// Example implementation wrapping fetch
class HttpLedgerClient {
    baseUrl;
    constructor(baseUrl) {
        this.baseUrl = baseUrl;
    }
    async registerEvidence(evidence) {
        const res = await fetch(`${this.baseUrl}/evidence`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(evidence),
        });
        if (!res.ok) {
            throw new Error('Failed to register evidence');
        }
        return res.json();
    }
    async createClaim(claim) {
        const res = await fetch(`${this.baseUrl}/claims`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(claim),
        });
        if (!res.ok) {
            throw new Error('Failed to create claim');
        }
        return res.json();
    }
    async getClaim(id) {
        const res = await fetch(`${this.baseUrl}/claims/${id}`);
        if (res.status === 404) {
            return null;
        }
        if (!res.ok) {
            throw new Error('Failed to get claim');
        }
        return res.json();
    }
    async generateManifest(claimIds) {
        const res = await fetch(`${this.baseUrl}/exports/manifest`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ claimIds }),
        });
        if (!res.ok) {
            throw new Error('Failed to generate manifest');
        }
        return res.json();
    }
}
exports.HttpLedgerClient = HttpLedgerClient;
