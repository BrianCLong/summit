import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { scoreEvidencePrecision, scoreToolEfficiency } from '../../evaluation/scoring/evidence.js';

test('Tooluse fixtures exist', () => {
  assert.ok(fs.existsSync('evaluation/benchmarks/tooluse/cases.json'));
  assert.ok(fs.existsSync('GOLDEN/datasets/tooluse/tooluse_001.json'));
});

test('Tooluse deterministic outputs validation', () => {
  const casesPath = path.resolve('evaluation/benchmarks/tooluse/cases.json');
  const resultsPath = path.resolve('GOLDEN/datasets/tooluse/tooluse_001.json');

  const cases = JSON.parse(fs.readFileSync(casesPath, 'utf8'));
  const golden = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));

  // Calculate and test task 1
  const task1 = cases.find((c: any) => c.id === 'task_1');
  const result1 = golden.results.find((r: any) => r.task_id === 'task_1');

  assert.ok(task1);
  assert.ok(result1);

  const precision1 = scoreEvidencePrecision(task1.expected_evidence, result1.provided_evidence);
  assert.strictEqual(precision1, 1.0);

  const efficiency1 = scoreToolEfficiency(task1.optimal_steps, result1.actual_steps);
  assert.strictEqual(efficiency1, 1.0);

  // Calculate and test task 2
  const task2 = cases.find((c: any) => c.id === 'task_2');
  const result2 = golden.results.find((r: any) => r.task_id === 'task_2');

  assert.ok(task2);
  assert.ok(result2);

  const precision2 = scoreEvidencePrecision(task2.expected_evidence, result2.provided_evidence);
  assert.strictEqual(precision2, 1.0);

  const efficiency2 = scoreToolEfficiency(task2.optimal_steps, result2.actual_steps);
  // task_2 has 1 optimal step, but 2 actual steps in the golden file
  assert.strictEqual(efficiency2, 0.5);
});
