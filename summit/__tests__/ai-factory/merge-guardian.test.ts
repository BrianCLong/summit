import test from 'node:test';
import assert from 'node:assert';
import { evaluateMergeReadiness } from '../../agents/factory/merge-guardian';

test('evaluateMergeReadiness blocks on missing artifacts', () => {
  const result = evaluateMergeReadiness([], { driftDetected: false });
  assert.strictEqual(result.passed, false);
  assert.ok(result.blockers.includes('Missing required artifacts'));
});

test('evaluateMergeReadiness blocks on policy drift', () => {
  const result = evaluateMergeReadiness([{ id: 'art1' }], { driftDetected: true });
  assert.strictEqual(result.passed, false);
  assert.ok(result.blockers.includes('Branch protection policy drift detected'));
});

test('evaluateMergeReadiness passes when all valid', () => {
  const result = evaluateMergeReadiness([{ id: 'art1' }], { driftDetected: false });
  assert.strictEqual(result.passed, true);
  assert.strictEqual(result.blockers.length, 0);
});
