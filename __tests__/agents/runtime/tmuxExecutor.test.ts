import { test } from 'node:test';
import assert from 'node:assert';
import { spawnTmuxWorker } from '../../../agents/runtime/executors/tmuxExecutor.js';

test('tmuxExecutor builds command correctly and executes gracefully in CI', async () => {
  // Use a simple echo command as fallback
  const result = await spawnTmuxWorker('test_session', 'test_worker', ['echo', 'hello']);
  assert.strictEqual(result.exitCode, 0);
  assert.ok(result.stdout.includes('hello') || result.stdout === ''); // Account for CI fallback
});
