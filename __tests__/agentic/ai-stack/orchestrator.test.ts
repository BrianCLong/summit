import test from 'node:test';
import assert from 'node:assert';
import { orchestrate, StackEvent } from '../../../agentic/ai-stack/orchestrator.js';

test('orchestrate runs correctly', async () => {
  const event: StackEvent = { id: 'test-123', type: 'test', payload: {} };
  const run = await orchestrate(event);
  assert.strictEqual(run.runId, 'run-tg-test-123');
  assert.strictEqual(run.lane, 'automation');
  assert.strictEqual(run.taskGraphId, 'tg-test-123');
  assert.deepStrictEqual(run.evidenceIds, ['ev-tg-test-123']);
});
