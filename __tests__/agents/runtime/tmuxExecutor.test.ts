import test from 'node:test';
import assert from 'node:assert';
import { TmuxExecutor } from '../../../agents/runtime/executors/tmuxExecutor.ts';

test('TmuxExecutor should return expected task result formats without shell injection', async () => {
  const executor = new TmuxExecutor('test_session');

  // mock spawnWorker to verify it doesn't construct an unsafe shell string
  executor.spawnWorker = async (workerId: string, cmd: string[]) => {
    assert.ok(workerId.startsWith('worker'));
    assert.deepStrictEqual(cmd, ['echo', 'hello']);
    return { stdout: 'Mocked tmux spawn', stderr: '', code: 0 };
  };

  const tasks = [{
    taskId: 't1',
    title: 'test task',
    role: 'tester',
    command: ['echo', 'hello'],
    priority: 1,
    retries: 0
  }];

  const results = await executor.execute(tasks);
  assert.strictEqual(results.length, 1);
  assert.strictEqual(results[0].ok, true);
  assert.strictEqual(results[0].workerId, 'worker1');
});
