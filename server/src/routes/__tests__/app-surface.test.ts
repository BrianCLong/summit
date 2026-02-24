import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { createHash, randomUUID } from 'crypto';
import { mkdtemp, readFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

// ---------------------------------------------------------------------------
// Unit Tests: Schemas
// ---------------------------------------------------------------------------

describe('PolicyPreflightRequestSchema', () => {
  let PolicyPreflightRequestSchema: any;

  beforeEach(async () => {
    const mod = await import('../../app-surface/schemas.js');
    PolicyPreflightRequestSchema = mod.PolicyPreflightRequestSchema;
  });

  it('accepts a valid request', () => {
    const input = {
      environment: 'dev',
      tools: ['nl2cypher'],
      rationale: 'Testing the pipeline',
    };
    const result = PolicyPreflightRequestSchema.safeParse(input);
    expect(result.success).toBe(true);
    expect(result.data.dryRun).toBe(false); // default
  });

  it('rejects empty tools array', () => {
    const input = {
      environment: 'prod',
      tools: [],
      rationale: 'Need access',
    };
    const result = PolicyPreflightRequestSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('rejects invalid environment', () => {
    const input = {
      environment: 'local',
      tools: ['nl2cypher'],
      rationale: 'Reason',
    };
    const result = PolicyPreflightRequestSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('rejects missing rationale', () => {
    const input = {
      environment: 'staging',
      tools: ['graphrag'],
    };
    const result = PolicyPreflightRequestSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('rejects rationale exceeding 2000 chars', () => {
    const input = {
      environment: 'dev',
      tools: ['nl2cypher'],
      rationale: 'x'.repeat(2001),
    };
    const result = PolicyPreflightRequestSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('accepts dryRun=true', () => {
    const input = {
      environment: 'staging',
      tools: ['graphrag'],
      rationale: 'Dry run test',
      dryRun: true,
    };
    const result = PolicyPreflightRequestSchema.safeParse(input);
    expect(result.success).toBe(true);
    expect(result.data.dryRun).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Unit Tests: Deterministic Hashing
// ---------------------------------------------------------------------------

describe('deterministicHash', () => {
  let deterministicHash: any;

  beforeEach(async () => {
    const mod = await import('../../app-surface/evidence.js');
    deterministicHash = mod.deterministicHash;
  });

  it('produces the same hash for identical inputs', () => {
    const obj = { b: 2, a: 1 };
    const hash1 = deterministicHash(obj);
    const hash2 = deterministicHash(obj);
    expect(hash1).toBe(hash2);
  });

  it('produces the same hash regardless of key insertion order', () => {
    const obj1 = { a: 1, b: 2, c: 3 };
    const obj2 = { c: 3, a: 1, b: 2 };
    expect(deterministicHash(obj1)).toBe(deterministicHash(obj2));
  });

  it('produces a valid 64-char hex SHA-256', () => {
    const hash = deterministicHash({ test: 'value' });
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('produces different hashes for different inputs', () => {
    const hash1 = deterministicHash({ a: 1 });
    const hash2 = deterministicHash({ a: 2 });
    expect(hash1).not.toBe(hash2);
  });
});

// ---------------------------------------------------------------------------
// Unit Tests: Evidence Bundle Builder
// ---------------------------------------------------------------------------

describe('buildEvidenceBundle', () => {
  let buildEvidenceBundle: any;

  beforeEach(async () => {
    const mod = await import('../../app-surface/evidence.js');
    buildEvidenceBundle = mod.buildEvidenceBundle;
  });

  it('builds a valid evidence bundle', () => {
    const request = {
      environment: 'dev' as const,
      tools: ['nl2cypher', 'graphrag'],
      rationale: 'Investigation support',
      dryRun: false,
    };
    const verdicts = [
      { tool: 'nl2cypher', allowed: true, reason: 'In allowlist' },
      { tool: 'graphrag', allowed: true, reason: 'In allowlist' },
    ];

    const bundle = buildEvidenceBundle(request, verdicts, 'ALLOW', 'user-123');

    expect(bundle.id).toBeDefined();
    expect(bundle.timestamp).toBeDefined();
    expect(bundle.actor).toBe('user-123');
    expect(bundle.action).toBe('policy_preflight');
    expect(bundle.policyDecision).toBe('ALLOW');
    expect(bundle.inputsHash).toMatch(/^[a-f0-9]{64}$/);
    expect(bundle.outputsHash).toMatch(/^[a-f0-9]{64}$/);
    expect(bundle.tools).toEqual(['nl2cypher', 'graphrag']);
    expect(bundle.toolVerdicts).toHaveLength(2);
  });

  it('produces deterministic inputsHash for same inputs', () => {
    const request = {
      environment: 'prod' as const,
      tools: ['nl2cypher'],
      rationale: 'Stable hash test',
      dryRun: true,
    };
    const verdicts = [{ tool: 'nl2cypher', allowed: true, reason: 'OK' }];

    const b1 = buildEvidenceBundle(request, verdicts, 'ALLOW', 'actor');
    const b2 = buildEvidenceBundle(request, verdicts, 'ALLOW', 'actor');

    expect(b1.inputsHash).toBe(b2.inputsHash);
    expect(b1.outputsHash).toBe(b2.outputsHash);
    // IDs should differ (UUID)
    expect(b1.id).not.toBe(b2.id);
  });
});

// ---------------------------------------------------------------------------
// Unit Tests: Evidence Persistence
// ---------------------------------------------------------------------------

describe('persistEvidenceBundle', () => {
  let buildEvidenceBundle: any;
  let persistEvidenceBundle: any;
  let tempDir: string;

  beforeEach(async () => {
    const mod = await import('../../app-surface/evidence.js');
    buildEvidenceBundle = mod.buildEvidenceBundle;
    persistEvidenceBundle = mod.persistEvidenceBundle;
    tempDir = await mkdtemp(join(tmpdir(), 'evidence-test-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('persists bundle as JSON file and is readable', async () => {
    const bundle = buildEvidenceBundle(
      { environment: 'dev' as const, tools: ['nl2cypher'], rationale: 'Test', dryRun: false },
      [{ tool: 'nl2cypher', allowed: true, reason: 'OK' }],
      'ALLOW',
      'tester',
    );

    const filePath = await persistEvidenceBundle(bundle, tempDir);
    expect(filePath).toContain(bundle.id);

    const content = JSON.parse(await readFile(filePath, 'utf-8'));
    expect(content.id).toBe(bundle.id);
    expect(content.inputsHash).toBe(bundle.inputsHash);
  });
});

// ---------------------------------------------------------------------------
// Unit Tests: Tool Allowlist
// ---------------------------------------------------------------------------

describe('toolAllowlist', () => {
  let isToolAllowed: any;
  let getAllowedTools: any;
  let clearAllowlistCache: any;

  beforeEach(async () => {
    const mod = await import('../../app-surface/toolAllowlist.js');
    isToolAllowed = mod.isToolAllowed;
    getAllowedTools = mod.getAllowedTools;
    clearAllowlistCache = mod.clearAllowlistCache;
    clearAllowlistCache();
  });

  it('allows a tool in its environment', () => {
    expect(isToolAllowed('dev', 'nl2cypher')).toBe(true);
  });

  it('denies a tool not in prod allowlist', () => {
    expect(isToolAllowed('prod', 'sandbox-query')).toBe(false);
  });

  it('denies any tool for non-existent environment', () => {
    expect(isToolAllowed('unknown' as any, 'nl2cypher')).toBe(false);
  });

  it('returns correct allowlist for staging', () => {
    const tools = getAllowedTools('staging');
    expect(tools).toContain('graphrag');
    expect(tools).not.toContain('sandbox-query');
  });
});

// ---------------------------------------------------------------------------
// Integration Test: Preflight Endpoint
// ---------------------------------------------------------------------------

describe('POST /api/app-surface/preflight', () => {
  let app: any;
  let request: any;

  beforeEach(async () => {
    // Mock auth + tenant middleware to pass through
    jest.unstable_mockModule('../../middleware/auth.js', () => ({
      authMiddleware: (_req: any, _res: any, next: any) => next(),
      requireAuth: () => (_req: any, _res: any, next: any) => next(),
      ensureRole: () => (_req: any, _res: any, next: any) => next(),
      ensureAuthenticated: (_req: any, _res: any, next: any) => next(),
    }));

    jest.unstable_mockModule('../../middleware/tenant.js', () => ({
      tenantMiddleware: (_req: any, _res: any, next: any) => next(),
    }));

    // Import the route after mocks
    const express = (await import('express')).default;
    const routerModule = await import('../app-surface.js');
    const supertest = (await import('supertest')).default;

    const testApp = express();
    testApp.use(express.json());
    // Simulate an authenticated user
    testApp.use((req: any, _res: any, next: any) => {
      req.user = { id: 'test-user-001', sub: 'test-user-001' };
      next();
    });
    testApp.use('/api/app-surface', routerModule.default);
    app = testApp;
    request = supertest;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns ALLOW when all tools are in the allowlist', async () => {
    const res = await request(app)
      .post('/api/app-surface/preflight')
      .send({
        environment: 'dev',
        tools: ['nl2cypher', 'graphrag'],
        rationale: 'Integration test',
      })
      .expect(200);

    expect(res.body.verdict).toBe('ALLOW');
    expect(res.body.toolVerdicts).toHaveLength(2);
    expect(res.body.evidenceId).toBeDefined();
    expect(res.body.dryRun).toBe(false);
  });

  it('returns DENY when all tools are outside the allowlist', async () => {
    const res = await request(app)
      .post('/api/app-surface/preflight')
      .send({
        environment: 'prod',
        tools: ['sandbox-query', 'data-ingest'],
        rationale: 'Should be denied',
      })
      .expect(200);

    expect(res.body.verdict).toBe('DENY');
    expect(res.body.toolVerdicts.every((v: any) => !v.allowed)).toBe(true);
  });

  it('returns PARTIAL when some tools are allowed', async () => {
    const res = await request(app)
      .post('/api/app-surface/preflight')
      .send({
        environment: 'prod',
        tools: ['nl2cypher', 'sandbox-query'],
        rationale: 'Mixed access test',
      })
      .expect(200);

    expect(res.body.verdict).toBe('PARTIAL');
  });

  it('returns 400 for invalid payload', async () => {
    const res = await request(app)
      .post('/api/app-surface/preflight')
      .send({ environment: 'invalid' })
      .expect(400);

    expect(res.body.error).toBe('ValidationError');
  });

  it('includes dryRun flag in response', async () => {
    const res = await request(app)
      .post('/api/app-surface/preflight')
      .send({
        environment: 'dev',
        tools: ['nl2cypher'],
        rationale: 'Dry run',
        dryRun: true,
      })
      .expect(200);

    expect(res.body.dryRun).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Integration Test: Allowlist Endpoint
// ---------------------------------------------------------------------------

describe('GET /api/app-surface/allowlist/:env', () => {
  let app: any;
  let request: any;

  beforeEach(async () => {
    const express = (await import('express')).default;
    const routerModule = await import('../app-surface.js');
    const supertest = (await import('supertest')).default;

    const testApp = express();
    testApp.use(express.json());
    testApp.use('/api/app-surface', routerModule.default);
    app = testApp;
    request = supertest;
  });

  it('returns tools for valid environment', async () => {
    const res = await request(app)
      .get('/api/app-surface/allowlist/dev')
      .expect(200);

    expect(res.body.environment).toBe('dev');
    expect(Array.isArray(res.body.tools)).toBe(true);
    expect(res.body.tools.length).toBeGreaterThan(0);
  });

  it('returns 400 for invalid environment', async () => {
    await request(app)
      .get('/api/app-surface/allowlist/invalid')
      .expect(400);
  });
});
