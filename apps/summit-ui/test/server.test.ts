/**
 * Integration tests for Summit Code UI Express routes.
 *
 * vi.mock is hoisted before static imports, so process.env is set too late
 * for config.ts (which evaluates at import time). Solution: mock config.js
 * directly using inline path computation (no imports inside factory needed –
 * process and template literals are available as globals).
 */
import { describe, it, expect, vi, afterAll, beforeAll } from 'vitest';
import { mkdirSync, writeFileSync, rmSync } from 'fs';

// ── Derive stable temp path (process.pid is a JS global, no import needed) ───
const TMP = `/tmp/summit-ui-test-${process.pid}`;

// ── Mock config BEFORE any static imports pull it in ─────────────────────────
vi.mock('../server/config.js', () => ({
  REPO_ROOT: `/tmp/summit-ui-test-${process.pid}`,
  PORT: 3742,
  PATHS: {
    agenticPrompts: `/tmp/summit-ui-test-${process.pid}/.agentic-prompts`,
    claude:         `/tmp/summit-ui-test-${process.pid}/.claude`,
    jules:          `/tmp/summit-ui-test-${process.pid}/.jules`,
    artifactsPr:    `/tmp/summit-ui-test-${process.pid}/.artifacts/pr`,
    ciPolicies:     `/tmp/summit-ui-test-${process.pid}/.ci/policies`,
    ciScripts:      `/tmp/summit-ui-test-${process.pid}/.ci/scripts`,
    artifacts:      `/tmp/summit-ui-test-${process.pid}/.artifacts`,
  },
}));

vi.mock('../server/utils/git.js', () => ({
  getBranches:        () => [
    { name: 'main',             type: 'other',   remote: false },
    { name: 'feature/test-foo', type: 'feature', remote: false },
    { name: 'claude/build-ui',  type: 'claude',  remote: false },
  ],
  getTags:            () => ['v1.0.0', 'v0.9.0'],
  getLatestCommit:    () => ({
    hash:    'abc1234def5678901234567890',
    message: 'chore: initial commit',
    author:  'Test User',
    date:    '2026-03-07T00:00:00Z',
  }),
  countSignedCommits: () => 0,
}));

// ── Seed fixture directory ─────────────────────────────────────────────────────
mkdirSync(`${TMP}/.artifacts/pr`,  { recursive: true });
mkdirSync(`${TMP}/.ci/policies`,   { recursive: true });
mkdirSync(`${TMP}/.ci/scripts`,    { recursive: true });
mkdirSync(`${TMP}/.agentic-prompts`, { recursive: true });
mkdirSync(`${TMP}/.claude`,        { recursive: true });
mkdirSync(`${TMP}/.jules`,         { recursive: true });

writeFileSync(`${TMP}/.artifacts/pr/pr-42.json`,
  JSON.stringify({ pr: 42, concern: 'auth', patch_hash: 'abc123', status: 'merged', timestamp: '2026-03-01T00:00:00Z', message: 'Fixed auth bug' }),
);
writeFileSync(`${TMP}/.artifacts/pr/pr-99.json`,
  JSON.stringify({ pr: 99, concern: 'security', patch_hash: 'def456', status: 'quarantined', timestamp: '2026-02-28T00:00:00Z' }),
);
writeFileSync(`${TMP}/.ci/policies/test.rego`, 'package test\ndefault allow = false');
writeFileSync(`${TMP}/.agentic-prompts/runbook.md`, '# CI Ops Runbook\n\nKeep it simple.');
writeFileSync(`${TMP}/.claude/notes.md`,   '# Claude Notes\n\nSome patterns here.');
writeFileSync(`${TMP}/.jules/palette.md`,  '# Palette\n\nColor tokens.');

// ── Import app (config + git already mocked) ──────────────────────────────────
import request from 'supertest';
import { createApp } from '../server/index.js';

let app: ReturnType<typeof createApp>;
beforeAll(() => { app = createApp(); });
afterAll(() => { try { rmSync(TMP, { recursive: true }); } catch { /* ok */ } });

// ── /health ───────────────────────────────────────────────────────────────────
describe('GET /health', () => {
  it('returns ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

// ── /metrics ──────────────────────────────────────────────────────────────────
describe('GET /metrics', () => {
  it('returns prometheus text', async () => {
    const res = await request(app).get('/metrics');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/plain');
  });
});

// ── /api/prompts/search ───────────────────────────────────────────────────────
describe('GET /api/prompts/search', () => {
  it('returns paginated structure', async () => {
    const res = await request(app).get('/api/prompts/search?q=');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ items: expect.any(Array), total: expect.any(Number), page: 1 });
  });

  it('filters by registry=claude', async () => {
    const res = await request(app).get('/api/prompts/search?q=&registry=claude');
    expect(res.status).toBe(200);
    (res.body.items as Array<{ registry: string }>).forEach(
      (i) => expect(i.registry).toBe('claude'),
    );
  });

  it('searches by keyword', async () => {
    const res = await request(app).get('/api/prompts/search?q=Runbook');
    expect(res.status).toBe(200);
    const found = (res.body.items as Array<{ title: string; excerpt: string }>)
      .some((i) => /runbook/i.test(i.title) || /runbook/i.test(i.excerpt));
    expect(found).toBe(true);
  });

  it('respects pageSize', async () => {
    const res = await request(app).get('/api/prompts/search?q=&pageSize=1');
    expect(res.status).toBe(200);
    expect((res.body.items as unknown[]).length).toBeLessThanOrEqual(1);
  });
});

// ── /api/prompts/registries ───────────────────────────────────────────────────
describe('GET /api/prompts/registries', () => {
  it('returns counts per registry', async () => {
    const res = await request(app).get('/api/prompts/registries');
    expect(res.status).toBe(200);
    expect(typeof res.body['agentic-prompts']).toBe('number');
    expect(typeof res.body.claude).toBe('number');
    expect(typeof res.body.jules).toBe('number');
  });
});

// ── /api/artifacts ────────────────────────────────────────────────────────────
describe('GET /api/artifacts', () => {
  it('returns paginated artifact list', async () => {
    const res = await request(app).get('/api/artifacts');
    expect(res.status).toBe(200);
    expect(res.body.total).toBeGreaterThanOrEqual(2);
  });

  it('filters by status=merged', async () => {
    const res = await request(app).get('/api/artifacts?status=merged');
    expect(res.status).toBe(200);
    (res.body.items as Array<{ status: string }>).forEach(
      (a) => expect(a.status).toBe('merged'),
    );
  });

  it('returns single artifact by PR', async () => {
    const res = await request(app).get('/api/artifacts/42');
    expect(res.status).toBe(200);
    expect(res.body[0].pr).toBe(42);
  });

  it('returns 404 for unknown PR', async () => {
    expect((await request(app).get('/api/artifacts/9999')).status).toBe(404);
  });
});

// ── /api/artifacts/summary ────────────────────────────────────────────────────
describe('GET /api/artifacts/summary', () => {
  it('returns counts by status', async () => {
    const res = await request(app).get('/api/artifacts/summary');
    expect(res.status).toBe(200);
    expect(res.body.byStatus.merged).toBeGreaterThanOrEqual(1);
    expect(res.body.byStatus.quarantined).toBeGreaterThanOrEqual(1);
  });
});

// ── /api/dashboard ────────────────────────────────────────────────────────────
describe('GET /api/dashboard', () => {
  it('returns dashboard structure', async () => {
    const res = await request(app).get('/api/dashboard');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      branches: { total: expect.any(Number) },
      tags:     { total: expect.any(Number) },
      artifacts:{ total: expect.any(Number) },
      topFindings: expect.any(Array),
    });
  });

  it('surfaces quarantined artifact as error finding', async () => {
    const res = await request(app).get('/api/dashboard');
    const findings = res.body.topFindings as Array<{ severity: string; message: string }>;
    const q = findings.find((f) => f.message.includes('QUARANTINED'));
    expect(q?.severity).toBe('error');
  });
});

// ── /api/release/gonogo ───────────────────────────────────────────────────────
describe('GET /api/release/gonogo', () => {
  it('returns go/no-go structure', async () => {
    const res = await request(app).get('/api/release/gonogo');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      verdict:    expect.stringMatching(/^(GO|NO-GO|PENDING)$/),
      provenance: expect.any(Object),
      policies:   expect.any(Array),
      evidence:   expect.any(Array),
    });
  });

  it('sets provenance from git mock', async () => {
    const res = await request(app).get('/api/release/gonogo');
    expect(res.body.provenance.latestTag).toBe('v1.0.0');
    expect(res.body.provenance.latestCommit).toBe('abc1234def5678901234567890');
  });

  it('finds test.rego in policies', async () => {
    const res = await request(app).get('/api/release/gonogo');
    const policies = res.body.policies as Array<{ file: string }>;
    expect(policies.some((p) => p.file === 'test.rego')).toBe(true);
  });
});
