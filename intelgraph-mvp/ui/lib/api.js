"use strict";
// Helper for legacy support, but for now we export a fetcher that mimics the old 'api' style
// or we fix the call sites.
// The old 'api' was likely `export async function api(path: string) { ... }`
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchFromApi = fetchFromApi;
exports.api = api;
exports.searchEntities = searchEntities;
exports.getNeighbors = getNeighbors;
exports.getAuthToken = getAuthToken;
async function fetchFromApi(path, token = '', tenant = 't1', caseId = 'c1') {
    const headers = {
        'X-Tenant-ID': tenant,
        'X-Case-ID': caseId,
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    // Try to get token if not provided (client-side only)
    if (!token && typeof window !== 'undefined') {
        // In a real app we'd get this from a context or storage
    }
    const res = await fetch(`http://localhost:8000${path}`, { headers });
    if (!res.ok) {
        throw new Error(`API error: ${res.status}`);
    }
    return res.json();
}
// Re-export old style api for compatibility if needed, but better to fix call sites.
// For the server component, we need a way to get token.
// For MVP, we will hardcode a dev token fetch or use a default.
async function api(path) {
    // This is used by server components.
    // We can fetch a dev token.
    const tokenRes = await fetch('http://localhost:8000/auth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            sub: 'analyst1',
            roles: ['analyst'],
            clearances: ['analyst'],
            cases: ['c1'],
        }),
    });
    const tokenData = await tokenRes.json();
    const token = tokenData.access_token;
    return fetchFromApi(path, token);
}
async function searchEntities(query, token, tenant, caseId) {
    const res = await fetch(`http://localhost:8000/search?q=${encodeURIComponent(query)}`, {
        headers: {
            Authorization: `Bearer ${token}`,
            'X-Tenant-ID': tenant,
            'X-Case-ID': caseId,
        },
    });
    if (!res.ok) {
        process.stderr.write(`Search failed ${res.status}\n`);
        return [];
    }
    return res.json();
}
async function getNeighbors(nodeId, token, tenant, caseId) {
    const res = await fetch(`http://localhost:8000/entities/${nodeId}/neighbors`, {
        headers: {
            Authorization: `Bearer ${token}`,
            'X-Tenant-ID': tenant,
            'X-Case-ID': caseId,
        },
    });
    if (!res.ok) {
        process.stderr.write(`Neighbors failed ${res.status}\n`);
        return { nodes: [], edges: [] };
    }
    return res.json();
}
async function getAuthToken() {
    const res = await fetch('http://localhost:8000/auth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            sub: 'analyst1',
            roles: ['analyst'],
            clearances: ['analyst'],
            cases: ['c1'],
        }),
    });
    if (!res.ok) {
        return '';
    }
    const data = await res.json();
    return data.access_token;
}
