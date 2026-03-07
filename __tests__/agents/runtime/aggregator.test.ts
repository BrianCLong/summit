import test from 'node:test';
import assert from 'node:assert';
import { aggregateResults } from '../../../agents/runtime/merge/aggregator.ts';

test('aggregateResults should sort deterministically, remove timestamps, and redact', () => {
  const results = [
    {
      taskId: 'b-task', ok: true, rc: 0,
      stdout: 'some text sk-123456789012345678901234567890123456789012345678',
      stderr: '',
      startedAt: 100, endedAt: 200, workerId: 'w2', attempt: 1
    },
    {
      taskId: 'a-task', ok: false, rc: 1,
      stdout: '',
      stderr: 'error msg',
      startedAt: 50, endedAt: 300, workerId: 'w1', attempt: 1
    }
  ];

  const aggregated = aggregateResults(results);

  // Deterministic sorting
  assert.strictEqual(aggregated[0].taskId, 'a-task');
  assert.strictEqual(aggregated[1].taskId, 'b-task');

  // Timestamps stripped, duration added
  assert.strictEqual(aggregated[0].startedAt, undefined);
  assert.strictEqual(aggregated[0].durationMs, 250);

  // Redaction
  assert.strictEqual(aggregated[1].stdout.includes('sk-'), false);
  assert.strictEqual(aggregated[1].stdout.includes('[REDACTED_SECRET]'), true);
});
