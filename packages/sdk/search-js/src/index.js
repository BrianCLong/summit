"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SearchClient = void 0;
class SearchClient {
    baseUrl;
    constructor(baseUrl) {
        this.baseUrl = baseUrl;
    }
    async query(req) {
        const res = await fetch(`${this.baseUrl}/search/query`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req),
        });
        if (!res.ok)
            throw new Error(`query failed: ${res.status}`);
        return res.json();
    }
    async index(label, action) {
        const res = await fetch(`${this.baseUrl}/search/index`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ label, action }),
        });
        if (!res.ok)
            throw new Error(`index control failed: ${res.status}`);
        return res.json();
    }
    async schemas() {
        const res = await fetch(`${this.baseUrl}/search/schemas`);
        if (!res.ok)
            throw new Error(`schema fetch failed: ${res.status}`);
        return res.json();
    }
}
exports.SearchClient = SearchClient;
