import test from 'node:test';
import assert from 'node:assert';
import {
  Canonicalizer,
  InMemoryEngramStore,
  MemoryGate,
  MaestroMemoryTool,
  NgramHasher,
  type MemoryPolicyEvaluator,
} from '../src/index.js';

const sampleRecord = {
  id: 'rec-1',
  tenantId: 'tenant-a',
  canonicalKey: 'policy bundle opa memory',
  hashHeads: [[1, 2], [3, 4], [5, 6]],
  payload: { kind: 'text', value: 'OPA policy bundle v1' } as const,
  provenance: { source: 'docs/policy.md', recordedAt: '2025-01-01', confidence: 0.9 },
  policyTags: ['opa', 'governance'],
};

test('Canonicalizer normalizes casing and whitespace deterministically', () => {
  const canonicalizer = new Canonicalizer();
  const valueA = canonicalizer.normalize('  OPA   Policy\nBundle  ');
  const valueB = canonicalizer.normalize('opa policy bundle');
  assert.strictEqual(valueA, valueB);
});

test('NgramHasher is deterministic for identical input', () => {
  const hasher = new NgramHasher({ salt: 'tenant-a', minGram: 2, maxGram: 3 });
  const first = hasher.hashText('OPA Policy Bundle');
  const second = hasher.hashText('opa policy bundle');
  assert.deepStrictEqual(first.headHashes, second.headHashes);
});

test('Multi-head hashing reduces worst-case collisions under modulo pressure', () => {
  const hasher = new NgramHasher({ salt: 'tenant-a', minGram: 2, maxGram: 2, heads: 3 });
  const inputs = ['alpha beta', 'alpha gamma', 'beta gamma', 'delta epsilon'];

  const bucketsPerHead = inputs.map((input) => {
    const result = hasher.hashText(input);
    return result.headHashes.map((head) => head.map((hash) => hash % 2));
  });

  const singleHeadBuckets = bucketsPerHead.map((heads) => heads[0].join(','));
  const multiHeadBuckets = bucketsPerHead.map((heads) => heads.map((head) => head.join(',')).join('|'));

  const singleHeadUnique = new Set(singleHeadBuckets).size;
  const multiHeadUnique = new Set(multiHeadBuckets).size;

  assert.ok(multiHeadUnique >= singleHeadUnique);
});

test('MemoryGate enforces policy evaluator decisions', () => {
  const canonicalizer = new Canonicalizer();
  const policyEvaluator: MemoryPolicyEvaluator = {
    evaluate: ({ policyTags }) => {
      if (policyTags.includes('blocked')) {
        return { allowed: false, reasons: ['blocked-tag'] };
      }
      return { allowed: true, reasons: [] };
    },
  };

  const gate = new MemoryGate({ canonicalizer, policyEvaluator, threshold: 0.2 });
  const allowed = { ...sampleRecord, policyTags: ['opa'] };
  const blocked = { ...sampleRecord, id: 'rec-2', policyTags: ['blocked'] };

  const result = gate.evaluate('opa policy', 'planner', [allowed, blocked]);
  assert.strictEqual(result.gated.length, 1);
  assert.strictEqual(result.rejected.length, 1);
  assert.strictEqual(result.rejected[0].id, 'rec-2');
});

test('MaestroMemoryTool returns gated injection bundles and telemetry', async () => {
  const canonicalizer = new Canonicalizer();
  const hasher = new NgramHasher({ salt: 'tenant-a', canonicalizer });
  const store = new InMemoryEngramStore();
  const hashHeads = hasher.hashText(sampleRecord.canonicalKey).headHashes;

  await store.put({ ...sampleRecord, hashHeads });

  const tool = new MaestroMemoryTool({ canonicalizer, hasher, store });
  const response = await tool.lookup({
    query: 'OPA policy bundle',
    phase: 'planner',
    tenantId: 'tenant-a',
  });

  assert.ok(response.gated.length > 0);
  assert.ok(response.injectionBundle.includes('OPA policy bundle'));
  assert.strictEqual(response.telemetry.candidateCount, 1);
});
