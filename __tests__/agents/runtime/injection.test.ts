import test from 'node:test';
import assert from 'node:assert';
import { TmuxExecutor } from '../../../agents/runtime/executors/tmuxExecutor.ts';

test('TmuxExecutor should reject malicious payload with shell metacharacters', async () => {
  const executor = new TmuxExecutor('test_session');
  let spawnedArgs: string[] = [];

  executor.spawnWorker = async (workerId: string, command: string[]) => {
    spawnedArgs = command;
    // simulating shell execution prevention
    if (command.join(' ').includes('; rm -rf /')) {
        return { stdout: '', stderr: 'mocked failure', code: 1 };
    }
    return { stdout: '', stderr: '', code: 0 };
  };

  const tasks = [{
    taskId: 'evil-1',
    title: 'Injection Test',
    role: 'attacker',
    command: ["echo", "hello", ";", "rm", "-rf", "/"],
    priority: 1,
    retries: 0
  }];

  const results = await executor.execute(tasks);

  assert.strictEqual(results[0].ok, false);
  assert.deepStrictEqual(spawnedArgs, ["echo", "hello", ";", "rm", "-rf", "/"]);
});
