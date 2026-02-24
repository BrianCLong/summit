/**
 * Policy Preflight - Integration Tests
 *
 * Tests the policy preflight runner end-to-end with a real
 * tool allowlist config. Validates the deny-by-default invariant.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { writeFile, mkdtemp, rm, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { runPolicyPreflight } from '../../src/app-surface/policy-preflight.js';
import { resetAllowlistCache } from '../../src/app-surface/tool-allowlist.js';

describe('Policy Preflight Runner', () => {
  let tmpDir: string;
  let configDir: string;
  let evidenceDir: string;

  const testAllowlist = {
    version: '1.0.0-test',
    environments: {
      dev: {
        allowedTools: ['graph-query', 'entity-search', 'debug-inspect'],
        denyByDefault: true,
        requireRationale: false,
      },
      staging: {
        allowedTools: ['graph-query', 'entity-search'],
        denyByDefault: true,
        requireRationale: true,
      },
      prod: {
        allowedTools: ['graph-query'],
        denyByDefault: true,
        requireRationale: true,
      },
    },
  };

  beforeAll(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'preflight-test-'));
    configDir = join(tmpDir, 'config');
    evidenceDir = join(tmpDir, 'evidence');
    await mkdir(configDir, { recursive: true });
    await mkdir(evidenceDir, { recursive: true });

    await writeFile(
      join(configDir, 'tool-allowlist.json'),
      JSON.stringify(testAllowlist),
    );

    process.env.TOOL_ALLOWLIST_PATH = join(configDir, 'tool-allowlist.json');
    process.env.EVIDENCE_STORAGE_DIR = evidenceDir;
  });

  afterAll(async () => {
    delete process.env.TOOL_ALLOWLIST_PATH;
    delete process.env.EVIDENCE_STORAGE_DIR;
    await rm(tmpDir, { recursive: true, force: true });
  });

  beforeEach(() => {
    resetAllowlistCache();
  });

  it('ALLOWS all tools that are in the dev allowlist', async () => {
    const result = await runPolicyPreflight({
      environment: 'dev',
      tools: ['graph-query', 'entity-search'],
      rationale: 'Testing tool access in dev',
      actor: 'test-user',
    });

    expect(result.verdict).toBe('ALLOW');
    expect(result.allowedTools).toEqual(['graph-query', 'entity-search']);
    expect(result.deniedTools).toEqual([]);
    expect(result.evidenceId).toMatch(/^ev-/);
    expect(result.reasons).toHaveLength(2);
    expect(result.reasons.every((r) => r.verdict === 'ALLOW')).toBe(true);
  });

  it('DENIES tools not in the environment allowlist', async () => {
    const result = await runPolicyPreflight({
      environment: 'prod',
      tools: ['graph-query', 'debug-inspect'],
      rationale: 'Trying debug in prod',
      actor: 'test-user',
    });

    expect(result.verdict).toBe('DENY');
    expect(result.allowedTools).toEqual(['graph-query']);
    expect(result.deniedTools).toEqual(['debug-inspect']);

    const denyReason = result.reasons.find((r) => r.tool === 'debug-inspect');
    expect(denyReason?.verdict).toBe('DENY');
    expect(denyReason?.reason).toContain('not in the prod allowlist');
  });

  it('DENIES when ALL tools are not in the allowlist', async () => {
    const result = await runPolicyPreflight({
      environment: 'prod',
      tools: ['debug-inspect', 'sandbox-exec'],
      rationale: 'Testing deny-all scenario',
      actor: 'test-user',
    });

    expect(result.verdict).toBe('DENY');
    expect(result.allowedTools).toEqual([]);
    expect(result.deniedTools).toEqual(['debug-inspect', 'sandbox-exec']);
  });

  it('produces an evidence bundle with every preflight', async () => {
    const result = await runPolicyPreflight({
      environment: 'staging',
      tools: ['graph-query'],
      rationale: 'Evidence test',
      actor: 'evidence-test-user',
    });

    expect(result.evidenceId).toBeTruthy();
    expect(result.evidenceId).toMatch(/^ev-/);
  });

  it('rejects invalid input with ZodError', async () => {
    await expect(
      runPolicyPreflight({
        environment: 'invalid',
        tools: ['graph-query'],
        rationale: 'Test',
      }),
    ).rejects.toThrow();
  });

  it('rejects empty tools array', async () => {
    await expect(
      runPolicyPreflight({
        environment: 'dev',
        tools: [],
        rationale: 'Test',
      }),
    ).rejects.toThrow();
  });

  it('rejects empty rationale', async () => {
    await expect(
      runPolicyPreflight({
        environment: 'dev',
        tools: ['graph-query'],
        rationale: '',
      }),
    ).rejects.toThrow();
  });

  it('returns consistent structure for ALLOW and DENY', async () => {
    const allow = await runPolicyPreflight({
      environment: 'dev',
      tools: ['graph-query'],
      rationale: 'Allow test',
      actor: 'test-user',
    });

    const deny = await runPolicyPreflight({
      environment: 'prod',
      tools: ['debug-inspect'],
      rationale: 'Deny test',
      actor: 'test-user',
    });

    // Both should have the same shape
    for (const result of [allow, deny]) {
      expect(result).toHaveProperty('verdict');
      expect(result).toHaveProperty('reasons');
      expect(result).toHaveProperty('evidenceId');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('environment');
      expect(result).toHaveProperty('requestedTools');
      expect(result).toHaveProperty('allowedTools');
      expect(result).toHaveProperty('deniedTools');
      expect(result).toHaveProperty('dryRun');
    }
  });

  it('enforces deny-by-default: unknown tools are denied', async () => {
    const result = await runPolicyPreflight({
      environment: 'dev',
      tools: ['totally-unknown-tool'],
      rationale: 'Testing unknown tool',
      actor: 'test-user',
    });

    expect(result.verdict).toBe('DENY');
    expect(result.deniedTools).toContain('totally-unknown-tool');
  });
});
