import test from 'node:test';
import assert from 'node:assert';
import { scoreEvidence } from '../../evaluation/scoring/evidence.js';
import fs from 'node:fs';
import path from 'node:path';

test('scoreEvidence calculates ratio correctly', () => {
  assert.strictEqual(scoreEvidence(['A', 'B'], ['A', 'C']), 0.5);
  assert.strictEqual(scoreEvidence(['A', 'B'], ['A', 'B']), 1);
  assert.strictEqual(scoreEvidence(['A', 'B'], ['C', 'D']), 0);
  assert.strictEqual(scoreEvidence([], ['A']), 1);
});

test('GraphRAG cases schema is valid array', () => {
  const casesPath = path.resolve('evaluation/benchmarks/graphrag/cases.json');
  const content = fs.readFileSync(casesPath, 'utf8');
  const cases = JSON.parse(content);
  assert.ok(Array.isArray(cases));
  assert.ok(cases.length > 0);
  assert.ok(cases[0].task);
  assert.ok(Array.isArray(cases[0].required_evidence));
});
