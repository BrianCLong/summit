"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Integration tests for Summit Code UI Express routes.
 *
 * vi.mock is hoisted before static imports, so process.env is set too late
 * for config.ts (which evaluates at import time). Solution: mock config.js
 * directly using inline path computation (no imports inside factory needed –
 * process and template literals are available as globals).
 */
const vitest_1 = require("vitest");
const fs_1 = require("fs");
// ── Derive stable temp path (process.pid is a JS global, no import needed) ───
const TMP = `/tmp/summit-ui-test-${process.pid}`;
// ── Mock config BEFORE any static imports pull it in ─────────────────────────
vitest_1.vi.mock('../server/config.js', () => ({
    REPO_ROOT: `/tmp/summit-ui-test-${process.pid}`,
    PORT: 3742,
    PATHS: {
        agenticPrompts: `/tmp/summit-ui-test-${process.pid}/.agentic-prompts`,
        claude: `/tmp/summit-ui-test-${process.pid}/.claude`,
        jules: `/tmp/summit-ui-test-${process.pid}/.jules`,
        artifactsPr: `/tmp/summit-ui-test-${process.pid}/.artifacts/pr`,
        ciPolicies: `/tmp/summit-ui-test-${process.pid}/.ci/policies`,
        ciScripts: `/tmp/summit-ui-test-${process.pid}/.ci/scripts`,
        artifacts: `/tmp/summit-ui-test-${process.pid}/.artifacts`,
    },
}));
vitest_1.vi.mock('../server/utils/git.js', () => ({
    getBranches: () => [
        { name: 'main', type: 'other', remote: false },
        { name: 'feature/test-foo', type: 'feature', remote: false },
        { name: 'claude/build-ui', type: 'claude', remote: false },
    ],
    getTags: () => ['v1.0.0', 'v0.9.0'],
    getLatestCommit: () => ({
        hash: 'abc1234def5678901234567890',
        message: 'chore: initial commit',
        author: 'Test User',
        date: '2026-03-07T00:00:00Z',
    }),
    countSignedCommits: () => 0,
}));
// ── Seed fixture directory ─────────────────────────────────────────────────────
(0, fs_1.mkdirSync)(`${TMP}/.artifacts/pr`, { recursive: true });
(0, fs_1.mkdirSync)(`${TMP}/.ci/policies`, { recursive: true });
(0, fs_1.mkdirSync)(`${TMP}/.ci/scripts`, { recursive: true });
(0, fs_1.mkdirSync)(`${TMP}/.agentic-prompts`, { recursive: true });
(0, fs_1.mkdirSync)(`${TMP}/.claude`, { recursive: true });
(0, fs_1.mkdirSync)(`${TMP}/.jules`, { recursive: true });
(0, fs_1.writeFileSync)(`${TMP}/.artifacts/pr/pr-42.json`, JSON.stringify({ pr: 42, concern: 'auth', patch_hash: 'abc123', status: 'merged', timestamp: '2026-03-01T00:00:00Z', message: 'Fixed auth bug' }));
(0, fs_1.writeFileSync)(`${TMP}/.artifacts/pr/pr-99.json`, JSON.stringify({ pr: 99, concern: 'security', patch_hash: 'def456', status: 'quarantined', timestamp: '2026-02-28T00:00:00Z' }));
(0, fs_1.writeFileSync)(`${TMP}/.ci/policies/test.rego`, 'package test\ndefault allow = false');
(0, fs_1.writeFileSync)(`${TMP}/.agentic-prompts/runbook.md`, '# CI Ops Runbook\n\nKeep it simple.');
(0, fs_1.writeFileSync)(`${TMP}/.claude/notes.md`, '# Claude Notes\n\nSome patterns here.');
(0, fs_1.writeFileSync)(`${TMP}/.jules/palette.md`, '# Palette\n\nColor tokens.');
// ── Import app (config + git already mocked) ──────────────────────────────────
const supertest_1 = __importDefault(require("supertest"));
const index_js_1 = require("../server/index.js");
let app;
(0, vitest_1.beforeAll)(() => { app = (0, index_js_1.createApp)(); });
(0, vitest_1.afterAll)(() => { try {
    (0, fs_1.rmSync)(TMP, { recursive: true });
}
catch { /* ok */ } });
// ── /health ───────────────────────────────────────────────────────────────────
(0, vitest_1.describe)('GET /health', () => {
    (0, vitest_1.it)('returns ok', async () => {
        const res = await (0, supertest_1.default)(app).get('/health');
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body.status).toBe('ok');
    });
});
// ── /metrics ──────────────────────────────────────────────────────────────────
(0, vitest_1.describe)('GET /metrics', () => {
    (0, vitest_1.it)('returns prometheus text', async () => {
        const res = await (0, supertest_1.default)(app).get('/metrics');
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.headers['content-type']).toContain('text/plain');
    });
});
// ── /api/prompts/search ───────────────────────────────────────────────────────
(0, vitest_1.describe)('GET /api/prompts/search', () => {
    (0, vitest_1.it)('returns paginated structure', async () => {
        const res = await (0, supertest_1.default)(app).get('/api/prompts/search?q=');
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body).toMatchObject({ items: vitest_1.expect.any(Array), total: vitest_1.expect.any(Number), page: 1 });
    });
    (0, vitest_1.it)('filters by registry=claude', async () => {
        const res = await (0, supertest_1.default)(app).get('/api/prompts/search?q=&registry=claude');
        (0, vitest_1.expect)(res.status).toBe(200);
        res.body.items.forEach((i) => (0, vitest_1.expect)(i.registry).toBe('claude'));
    });
    (0, vitest_1.it)('searches by keyword', async () => {
        const res = await (0, supertest_1.default)(app).get('/api/prompts/search?q=Runbook');
        (0, vitest_1.expect)(res.status).toBe(200);
        const found = res.body.items
            .some((i) => /runbook/i.test(i.title) || /runbook/i.test(i.excerpt));
        (0, vitest_1.expect)(found).toBe(true);
    });
    (0, vitest_1.it)('respects pageSize', async () => {
        const res = await (0, supertest_1.default)(app).get('/api/prompts/search?q=&pageSize=1');
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body.items.length).toBeLessThanOrEqual(1);
    });
});
// ── /api/prompts/registries ───────────────────────────────────────────────────
(0, vitest_1.describe)('GET /api/prompts/registries', () => {
    (0, vitest_1.it)('returns counts per registry', async () => {
        const res = await (0, supertest_1.default)(app).get('/api/prompts/registries');
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(typeof res.body['agentic-prompts']).toBe('number');
        (0, vitest_1.expect)(typeof res.body.claude).toBe('number');
        (0, vitest_1.expect)(typeof res.body.jules).toBe('number');
    });
});
// ── /api/artifacts ────────────────────────────────────────────────────────────
(0, vitest_1.describe)('GET /api/artifacts', () => {
    (0, vitest_1.it)('returns paginated artifact list', async () => {
        const res = await (0, supertest_1.default)(app).get('/api/artifacts');
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body.total).toBeGreaterThanOrEqual(2);
    });
    (0, vitest_1.it)('filters by status=merged', async () => {
        const res = await (0, supertest_1.default)(app).get('/api/artifacts?status=merged');
        (0, vitest_1.expect)(res.status).toBe(200);
        res.body.items.forEach((a) => (0, vitest_1.expect)(a.status).toBe('merged'));
    });
    (0, vitest_1.it)('returns single artifact by PR', async () => {
        const res = await (0, supertest_1.default)(app).get('/api/artifacts/42');
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body[0].pr).toBe(42);
    });
    (0, vitest_1.it)('returns 404 for unknown PR', async () => {
        (0, vitest_1.expect)((await (0, supertest_1.default)(app).get('/api/artifacts/9999')).status).toBe(404);
    });
});
// ── /api/artifacts/summary ────────────────────────────────────────────────────
(0, vitest_1.describe)('GET /api/artifacts/summary', () => {
    (0, vitest_1.it)('returns counts by status', async () => {
        const res = await (0, supertest_1.default)(app).get('/api/artifacts/summary');
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body.byStatus.merged).toBeGreaterThanOrEqual(1);
        (0, vitest_1.expect)(res.body.byStatus.quarantined).toBeGreaterThanOrEqual(1);
    });
});
// ── /api/dashboard ────────────────────────────────────────────────────────────
(0, vitest_1.describe)('GET /api/dashboard', () => {
    (0, vitest_1.it)('returns dashboard structure', async () => {
        const res = await (0, supertest_1.default)(app).get('/api/dashboard');
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body).toMatchObject({
            branches: { total: vitest_1.expect.any(Number) },
            tags: { total: vitest_1.expect.any(Number) },
            artifacts: { total: vitest_1.expect.any(Number) },
            topFindings: vitest_1.expect.any(Array),
        });
    });
    (0, vitest_1.it)('surfaces quarantined artifact as error finding', async () => {
        const res = await (0, supertest_1.default)(app).get('/api/dashboard');
        const findings = res.body.topFindings;
        const q = findings.find((f) => f.message.includes('QUARANTINED'));
        (0, vitest_1.expect)(q?.severity).toBe('error');
    });
});
// ── /api/release/gonogo ───────────────────────────────────────────────────────
(0, vitest_1.describe)('GET /api/release/gonogo', () => {
    (0, vitest_1.it)('returns go/no-go structure', async () => {
        const res = await (0, supertest_1.default)(app).get('/api/release/gonogo');
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body).toMatchObject({
            verdict: vitest_1.expect.stringMatching(/^(GO|NO-GO|PENDING)$/),
            provenance: vitest_1.expect.any(Object),
            policies: vitest_1.expect.any(Array),
            evidence: vitest_1.expect.any(Array),
        });
    });
    (0, vitest_1.it)('sets provenance from git mock', async () => {
        const res = await (0, supertest_1.default)(app).get('/api/release/gonogo');
        (0, vitest_1.expect)(res.body.provenance.latestTag).toBe('v1.0.0');
        (0, vitest_1.expect)(res.body.provenance.latestCommit).toBe('abc1234def5678901234567890');
    });
    (0, vitest_1.it)('finds test.rego in policies', async () => {
        const res = await (0, supertest_1.default)(app).get('/api/release/gonogo');
        const policies = res.body.policies;
        (0, vitest_1.expect)(policies.some((p) => p.file === 'test.rego')).toBe(true);
    });
});
