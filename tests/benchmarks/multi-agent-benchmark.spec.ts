import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { scoreEvidencePrecision } from '../../evaluation/scoring/evidence.js';

test('Multi-agent fixtures exist', () => {
  assert.ok(fs.existsSync('evaluation/benchmarks/multi_agent/cases.json'));
  assert.ok(fs.existsSync('GOLDEN/datasets/multi_agent/multi_agent_001.json'));
});

test('Multi-agent expected coordination matching', () => {
  const casesPath = path.resolve('evaluation/benchmarks/multi_agent/cases.json');
  const resultsPath = path.resolve('GOLDEN/datasets/multi_agent/multi_agent_001.json');

  const cases = JSON.parse(fs.readFileSync(casesPath, 'utf8'));
  const golden = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));

  // Test Task 1
  const task1 = cases.find((c: any) => c.id === 'ma_task_1');
  const result1 = golden.results.find((r: any) => r.task_id === 'ma_task_1');

  assert.ok(task1);
  assert.ok(result1);

  // Assert expected vs actual evidence precision
  const precision1 = scoreEvidencePrecision(task1.expected_evidence, result1.provided_evidence);
  assert.strictEqual(precision1, 1.0);

  // Assert coordination overlap
  for (const expectedCoord of task1.expected_coordination) {
    const matched = result1.agent_logs.some((log: any) =>
      log.from === expectedCoord.from &&
      log.to === expectedCoord.to &&
      log.action === expectedCoord.action
    );
    assert.ok(matched, `Expected coordination not met: ${expectedCoord.from} -> ${expectedCoord.to} : ${expectedCoord.action}`);
  }

  // Test Task 2
  const task2 = cases.find((c: any) => c.id === 'ma_task_2');
  const result2 = golden.results.find((r: any) => r.task_id === 'ma_task_2');

  assert.ok(task2);
  assert.ok(result2);

  // Assert expected vs actual evidence precision
  const precision2 = scoreEvidencePrecision(task2.expected_evidence, result2.provided_evidence);
  assert.strictEqual(precision2, 1.0);

  // Assert coordination overlap
  for (const expectedCoord of task2.expected_coordination) {
    const matched = result2.agent_logs.some((log: any) =>
      log.from === expectedCoord.from &&
      log.to === expectedCoord.to &&
      log.action === expectedCoord.action
    );
    assert.ok(matched, `Expected coordination not met: ${expectedCoord.from} -> ${expectedCoord.to} : ${expectedCoord.action}`);
  }
});
