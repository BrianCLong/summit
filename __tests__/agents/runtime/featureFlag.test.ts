import { test } from 'node:test';
import assert from 'node:assert';
import { executeBurst } from '../../../agents/runtime/executors/burstExecutor.js';
import { config } from '../../../agents/runtime/config.js';

test('featureFlag prevents burst execution by default', async () => {
  const original = config.multiAgentBurstEnabled;
  config.multiAgentBurstEnabled = false;

  try {
    const tasks = [{ taskId: 'task1', title: 't1', role: 'r1', command: ['echo', '1'], priority: 1, retries: 0 }];
    await assert.rejects(async () => {
      await executeBurst(tasks);
    }, /MULTI_AGENT_BURST_DISABLED/);
  } finally {
    config.multiAgentBurstEnabled = original;
  }
});
