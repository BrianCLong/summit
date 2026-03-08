"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchPrompts = searchPrompts;
exports.listArtifacts = listArtifacts;
exports.getDashboard = getDashboard;
exports.getGoNoGo = getGoNoGo;
exports.streamPromptSearch = streamPromptSearch;
const BASE = '/api';
async function get(path) {
    const res = await fetch(`${BASE}${path}`);
    if (!res.ok) {
        const body = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(body.error ?? res.statusText);
    }
    return res.json();
}
// ─── Prompts ──────────────────────────────────────────────────────────────────
function searchPrompts(q, page = 1, pageSize = 20, registry) {
    const params = new URLSearchParams({ q, page: String(page), pageSize: String(pageSize) });
    if (registry)
        params.set('registry', registry);
    return get(`/prompts/search?${params}`);
}
// ─── Artifacts ────────────────────────────────────────────────────────────────
function listArtifacts(page = 1, pageSize = 20, status) {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (status)
        params.set('status', status);
    return get(`/artifacts?${params}`);
}
// ─── Dashboard ────────────────────────────────────────────────────────────────
function getDashboard() {
    return get('/dashboard');
}
// ─── Go/No-Go ─────────────────────────────────────────────────────────────────
function getGoNoGo() {
    return get('/release/gonogo');
}
// ─── Streaming search ─────────────────────────────────────────────────────────
/**
 * Streams prompt search results via Server-Sent Events.
 * onChunk is called for each partial result line; onDone when the stream closes.
 */
function streamPromptSearch(q, registry, onChunk, onDone) {
    const params = new URLSearchParams({ q });
    if (registry)
        params.set('registry', registry);
    const es = new EventSource(`${BASE}/prompts/stream?${params}`);
    es.addEventListener('result', (e) => onChunk(e.data));
    es.addEventListener('done', () => { es.close(); onDone(); });
    es.onerror = () => { es.close(); onDone(); };
    return () => es.close();
}
