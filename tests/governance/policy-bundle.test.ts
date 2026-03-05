import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { canonicalPolicySha256, buildBundle } from '../../summit/agents/policy/bundle/build-bundle';
import { verifyBundle } from '../../summit/agents/policy/bundle/verify-bundle';

const ORIGINAL_CWD = process.cwd();
const tempDirs: string[] = [];

function setupTempRepo(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'policy-bundle-'));
  tempDirs.push(dir);
  process.chdir(dir);
  fs.mkdirSync('summit/agents/policy', { recursive: true });
  fs.mkdirSync('summit/agents/skills', { recursive: true });
  fs.writeFileSync(
    'summit/agents/policy/policy.yml',
    'version: 1\nsemantics:\n  allowed_actions: [invoke_skill]\nintensity:\n  min: 1\n  max: 5\n',
    'utf8'
  );
  fs.writeFileSync('summit/agents/skills/registry.snapshot.json', '{"snapshot_version":1,"skills":[]}', 'utf8');
  return dir;
}

afterEach(() => {
  process.chdir(ORIGINAL_CWD);
  for (const dir of tempDirs.splice(0, tempDirs.length)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe('policy bundle', () => {
  it('keeps deterministic hash stable across YAML key ordering', () => {
    const yamlA = 'a: 1\nb: { c: 2, d: 3 }\n';
    const yamlB = 'b:\n  d: 3\n  c: 2\na: 1\n';
    expect(canonicalPolicySha256(yamlA)).toBe(canonicalPolicySha256(yamlB));
  });

  it('fails verify when policy changes but bundle is stale', () => {
    setupTempRepo();
    buildBundle('prod', {
      createdAt: '2026-01-01T00:00:00.000Z',
      approvals: ['governance'],
      signatures: [{ type: 'sha256', signer: 'test', sig: 'abc' }],
    });

    fs.appendFileSync('summit/agents/policy/policy.yml', '\nnew_guardrail: enabled\n');

    const result = verifyBundle('prod');
    expect(result.ok).toBe(false);
    expect(result.errors.join(' ')).toContain('policy_sha256 mismatch');
  });

  it('fails in prod when approvals are missing', () => {
    setupTempRepo();
    buildBundle('prod', {
      createdAt: '2026-01-01T00:00:00.000Z',
      approvals: [],
      signatures: [{ type: 'sha256', signer: 'test', sig: 'abc' }],
    });
    const result = verifyBundle('prod');
    expect(result.ok).toBe(false);
    expect(result.errors.join(' ')).toContain('approvals containing "governance"');
  });

  it('fails in prod when signatures are empty', () => {
    setupTempRepo();
    buildBundle('prod', {
      createdAt: '2026-01-01T00:00:00.000Z',
      approvals: ['governance'],
      signatures: [],
    });
    const result = verifyBundle('prod');
    expect(result.ok).toBe(false);
    expect(result.errors.join(' ')).toContain('at least one signature');
  });

  it('passes in dev/test without signatures requirement', () => {
    setupTempRepo();
    buildBundle('dev', { createdAt: '2026-01-01T00:00:00.000Z' });
    buildBundle('test', { createdAt: '2026-01-01T00:00:00.000Z' });

    expect(verifyBundle('dev').ok).toBe(true);
    expect(verifyBundle('test').ok).toBe(true);
  });
});
