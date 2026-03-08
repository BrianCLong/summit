"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const nock_1 = __importDefault(require("nock"));
const node_fetch_1 = __importDefault(require("node-fetch"));
// Configure base
const SIG_BASE = 'https://sig.example.internal';
function maestroIngestBatch(payload) {
    // Replace with actual client call
    return (0, node_fetch_1.default)(`${SIG_BASE}/ingest/batch`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
    });
}
(0, vitest_1.describe)('SIG API contracts', () => {
    (0, vitest_1.afterEach)(() => nock_1.default.cleanAll());
    (0, vitest_1.it)('POST /ingest/batch sends required fields and handles receipts', async () => {
        const scope = (0, nock_1.default)(SIG_BASE)
            .post('/ingest/batch', (body) => {
            // Validate shape
            return (body &&
                Array.isArray(body.items) &&
                body.items.every((i) => i.id && i.payload));
        })
            .reply(200, { jobId: 'job-123', receipts: [{ id: 'i‑1', hash: 'abc' }] });
        const res = await maestroIngestBatch({
            items: [{ id: 'i‑1', payload: {} }],
        });
        (0, vitest_1.expect)(res.status).toBe(200);
        const json = await res.json();
        (0, vitest_1.expect)(json.jobId).toBeDefined();
        (0, vitest_1.expect)(Array.isArray(json.receipts)).toBe(true);
        scope.done();
    });
    (0, vitest_1.it)('POST /policy/evaluate enforces purpose/authority/license', async () => {
        const policy = (0, nock_1.default)(SIG_BASE)
            .post('/policy/evaluate', (body) => body && body.purpose && body.authority && body.license)
            .reply(200, { decision: 'allow', reason: 'ok' });
        const res = await (0, node_fetch_1.default)(`${SIG_BASE}/policy/evaluate`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                purpose: 'ingest',
                authority: 'tasking:ops',
                license: 'internal',
            }),
        });
        (0, vitest_1.expect)(res.status).toBe(200);
        const json = await res.json();
        (0, vitest_1.expect)(json.decision).toBe('allow');
        policy.done();
    });
});
