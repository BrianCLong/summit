import { test } from 'node:test';
import assert from 'node:assert';
import { aggregateResults, buildStamp } from '../../../agents/runtime/merge/aggregator.js';

test('aggregator creates stable summaries', () => {
  const goal = { goalId: 'g1', prompt: 'test', mode: 'tmux' as const };
  const tasks = [];
  const results = [
    { taskId: 't1', ok: true, rc: 0, stdout: 'hello', stderr: '', startedAt: 1000, endedAt: 2000, workerId: 'w1', attempt: 1 }
  ];

  const summary = aggregateResults(goal, tasks, results);
  assert.strictEqual(summary.okCount, 1);
  assert.strictEqual(summary.results[0].durationSec, 1);
});

test('buildStamp creates correct stamp object', () => {
  const stamp = buildStamp('hash1', 'hash2');
  assert.strictEqual(stamp.deterministic, true);
  assert.strictEqual(stamp.planHash, 'hash1');
  assert.strictEqual(stamp.configHash, 'hash2');
});
