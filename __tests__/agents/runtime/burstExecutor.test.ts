import test from 'node:test';
import assert from 'node:assert';
import { BurstExecutor } from '../../../agents/runtime/executors/burstExecutor.ts';
import { config } from '../../../agents/runtime/config.ts';

test('BurstExecutor should fail if burst is disabled', async () => {
  const executor = new BurstExecutor();
  const tasks = [{
    taskId: 't1', title: 'test', role: 'test', command: ['echo', 'test'], priority: 1, retries: 0
  }];

  // ensure it's disabled initially
  config.multiAgentBurstEnabled = false;

  await assert.rejects(
    async () => { await executor.execute(tasks); },
    (err: any) => {
      assert.strictEqual(err.message, 'MULTI_AGENT_BURST_DISABLED');
      return true;
    }
  );
});

test('BurstExecutor should execute if burst is enabled', async () => {
  const executor = new BurstExecutor();
  const tasks = [{
    taskId: 't1', title: 'test', role: 'test', command: ['echo', 'test'], priority: 1, retries: 0
  }];

  config.multiAgentBurstEnabled = true;
  const results = await executor.execute(tasks);

  assert.strictEqual(results.length, 1);
  assert.strictEqual(results[0].ok, true);

  // Reset for other tests
  config.multiAgentBurstEnabled = false;
});
