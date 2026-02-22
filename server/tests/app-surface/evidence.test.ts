/**
 * Evidence Bundle - Hashing Determinism Tests
 *
 * Verifies that:
 * 1. Same inputs always produce the same hash (determinism)
 * 2. Different inputs produce different hashes
 * 3. Key ordering does not affect the hash (canonicalization)
 * 4. Evidence bundles are correctly structured
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import {
  deterministicHash,
  deepDeterministicHash,
  canonicalize,
  sha256,
  emitEvidenceBundle,
} from '../../src/app-surface/evidence.js';
import { EvidenceBundleSchema } from '../../src/app-surface/types.js';
import { mkdtemp, rm, readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('Evidence Bundle - Hashing', () => {
  describe('deterministicHash', () => {
    it('produces the same hash for identical objects', () => {
      const obj = { a: 1, b: 'hello', c: true };
      const hash1 = deterministicHash(obj);
      const hash2 = deterministicHash(obj);
      expect(hash1).toBe(hash2);
    });

    it('produces the same hash regardless of key insertion order', () => {
      const obj1 = { a: 1, b: 2 };
      const obj2 = { b: 2, a: 1 };
      expect(deterministicHash(obj1)).toBe(deterministicHash(obj2));
    });

    it('produces different hashes for different values', () => {
      const hash1 = deterministicHash({ a: 1 });
      const hash2 = deterministicHash({ a: 2 });
      expect(hash1).not.toBe(hash2);
    });

    it('returns a 64-character hex string (SHA-256)', () => {
      const hash = deterministicHash({ test: true });
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe('deepDeterministicHash', () => {
    it('handles nested objects deterministically', () => {
      const obj1 = { a: { b: { c: 1 } }, d: [1, 2, 3] };
      const obj2 = { d: [1, 2, 3], a: { b: { c: 1 } } };
      expect(deepDeterministicHash(obj1)).toBe(deepDeterministicHash(obj2));
    });

    it('handles arrays consistently', () => {
      const obj1 = { items: [1, 2, 3] };
      const obj2 = { items: [1, 2, 3] };
      expect(deepDeterministicHash(obj1)).toBe(deepDeterministicHash(obj2));
    });

    it('distinguishes different array orders', () => {
      const obj1 = { items: [1, 2, 3] };
      const obj2 = { items: [3, 2, 1] };
      expect(deepDeterministicHash(obj1)).not.toBe(deepDeterministicHash(obj2));
    });

    it('handles null and undefined', () => {
      expect(canonicalize(null)).toBe('null');
      expect(canonicalize(undefined)).toBe(undefined);
    });

    it('handles deeply nested key reordering', () => {
      const obj1 = {
        environment: 'dev',
        tools: ['graph-query'],
        rationale: 'test',
        nested: { z: 3, a: 1, m: 2 },
      };
      const obj2 = {
        nested: { a: 1, m: 2, z: 3 },
        rationale: 'test',
        tools: ['graph-query'],
        environment: 'dev',
      };
      expect(deepDeterministicHash(obj1)).toBe(deepDeterministicHash(obj2));
    });
  });

  describe('canonicalize', () => {
    it('produces consistent canonical strings', () => {
      expect(canonicalize({ b: 2, a: 1 })).toBe('{"a":1,"b":2}');
    });

    it('handles primitives', () => {
      expect(canonicalize(42)).toBe('42');
      expect(canonicalize('hello')).toBe('"hello"');
      expect(canonicalize(true)).toBe('true');
    });

    it('handles arrays', () => {
      expect(canonicalize([1, 'two', { a: 3 }])).toBe('[1,"two",{"a":3}]');
    });
  });

  describe('sha256', () => {
    it('produces consistent hashes', () => {
      expect(sha256('hello')).toBe(sha256('hello'));
    });

    it('produces different hashes for different inputs', () => {
      expect(sha256('hello')).not.toBe(sha256('world'));
    });
  });
});

describe('Evidence Bundle - Emitter', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'evidence-test-'));
    process.env.EVIDENCE_STORAGE_DIR = tmpDir;
  });

  afterEach(async () => {
    delete process.env.EVIDENCE_STORAGE_DIR;
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('produces a valid evidence bundle', async () => {
    const bundle = await emitEvidenceBundle({
      actor: 'test-user',
      action: 'policy_preflight',
      inputs: { environment: 'dev', tools: ['graph-query'] },
      outputs: { verdict: 'ALLOW' },
      policyDecision: 'ALLOW',
      environment: 'dev',
    });

    // Validate against schema
    expect(() => EvidenceBundleSchema.parse(bundle)).not.toThrow();
    expect(bundle.id).toMatch(/^ev-/);
    expect(bundle.version).toBe('1.0');
    expect(bundle.actor).toBe('test-user');
    expect(bundle.policyDecision).toBe('ALLOW');
    expect(bundle.integrityHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('persists the bundle to disk', async () => {
    const bundle = await emitEvidenceBundle({
      actor: 'test-user',
      action: 'policy_preflight',
      inputs: { environment: 'prod', tools: ['copilot-ask'] },
      outputs: { verdict: 'DENY' },
      policyDecision: 'DENY',
      environment: 'prod',
    });

    const files = await readdir(tmpDir);
    expect(files).toHaveLength(1);
    expect(files[0]).toBe(`${bundle.id}.json`);

    const content = JSON.parse(await readFile(join(tmpDir, files[0]), 'utf8'));
    expect(content.id).toBe(bundle.id);
    expect(content.integrityHash).toBe(bundle.integrityHash);
  });

  it('produces deterministic hashes for same inputs', async () => {
    const inputs = { environment: 'dev', tools: ['graph-query'] };
    const bundle1 = await emitEvidenceBundle({
      actor: 'user-a',
      action: 'policy_preflight',
      inputs,
      outputs: { verdict: 'ALLOW' },
      policyDecision: 'ALLOW',
      environment: 'dev',
    });
    const bundle2 = await emitEvidenceBundle({
      actor: 'user-a',
      action: 'policy_preflight',
      inputs,
      outputs: { verdict: 'ALLOW' },
      policyDecision: 'ALLOW',
      environment: 'dev',
    });

    // Same inputs should produce the same inputsHash
    expect(bundle1.inputsHash).toBe(bundle2.inputsHash);
    // Different IDs/timestamps mean different integrityHash
    expect(bundle1.integrityHash).not.toBe(bundle2.integrityHash);
  });
});
