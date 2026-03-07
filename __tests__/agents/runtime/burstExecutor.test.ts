import { test } from 'node:test';
import assert from 'node:assert';
import { executeBurst } from '../../../agents/runtime/executors/burstExecutor.js';
import { config } from '../../../agents/runtime/config.js';

test('burstExecutor runs tasks when enabled', async () => {
  const original = config.multiAgentBurstEnabled;
  config.multiAgentBurstEnabled = true;

  try {
    const tasks = [{ taskId: 'task1', title: 't1', role: 'r1', command: ['echo', '1'], priority: 1, retries: 0 }];
    const results = await executeBurst(tasks);
    assert.strictEqual(results.length, 1);
    assert.strictEqual(results[0].taskId, 'task1');
    assert.strictEqual(results[0].ok, true);
  } finally {
    config.multiAgentBurstEnabled = original;
  }
});
