import assert from 'node:assert/strict';
import test from 'node:test';
import { buildEvidence } from '../compare_digests_lib.mjs';

test('buildEvidence marks passing digests without delta', () => {
  const evidence = buildEvidence({
    pgDigest: 'a'.repeat(64),
    neoDigest: 'a'.repeat(64),
    projection: 'entities_v1',
  });

  assert.equal(evidence.passed, true);
  assert.equal(evidence.delta, undefined);
  assert.equal(evidence.projection, 'entities_v1');
});

test('buildEvidence records delta on mismatch', () => {
  const evidence = buildEvidence({
    pgDigest: 'a'.repeat(64),
    neoDigest: 'b'.repeat(64),
    projection: 'entities_v1',
  });

  assert.equal(evidence.passed, false);
  assert.equal(evidence.delta.length, 1);
  assert.deepEqual(evidence.delta[0], {
    field: 'run_digest',
    expected: 'a'.repeat(64),
    actual: 'b'.repeat(64),
  });
});
