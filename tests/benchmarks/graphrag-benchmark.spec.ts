import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import { scoreEvidencePrecision, scoreToolEfficiency } from '../../evaluation/scoring/evidence.js';

test('scoreEvidencePrecision - calculates exact hits', () => {
  const required = ['EVID:1', 'EVID:2'];
  const providedFull = ['EVID:1', 'EVID:2', 'EVID:3'];
  const providedPartial = ['EVID:1'];

  assert.strictEqual(scoreEvidencePrecision(required, providedFull), 1.0);
  assert.strictEqual(scoreEvidencePrecision(required, providedPartial), 0.5);
});

test('scoreToolEfficiency - bounds correctly', () => {
  assert.strictEqual(scoreToolEfficiency(2, 2), 1.0);
  assert.strictEqual(scoreToolEfficiency(2, 4), 0.5);
  assert.strictEqual(scoreToolEfficiency(2, 1), 1.0); // Took fewer steps than optimal
});

test('GraphRAG fixtures exist', () => {
  assert.ok(fs.existsSync('evaluation/benchmarks/graphrag/cases.json'));
  assert.ok(fs.existsSync('GOLDEN/datasets/graphrag/graphrag_001.json'));
});
