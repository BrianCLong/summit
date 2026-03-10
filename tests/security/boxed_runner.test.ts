import test from 'node:test';
import assert from 'node:assert';
import { runBoxedAgent, BoxPolicy, Task } from '../../summit/agents/boxed_runner.js';

test('runBoxedAgent should execute normally if policy is valid and mutableConfig is false', async () => {
  const policy: BoxPolicy = {
    maxSteps: 10,
    maxTokens: 100,
    network: 'off',
    writablePaths: [],
    allowToolIds: [],
    mutableConfig: false
  };

  const task: Task = { id: 't1', prompt: 'test', context: {} };
  const res = await runBoxedAgent(task, policy);
  assert.strictEqual(res.output, 'Boxed execution completed.');
});

test('runBoxedAgent should throw if mutableConfig is not false', async () => {
  const policy: any = {
    maxSteps: 10,
    maxTokens: 100,
    network: 'off',
    writablePaths: [],
    allowToolIds: [],
    mutableConfig: true // Violation
  };

  const task: Task = { id: 't1', prompt: 'test', context: {} };
  await assert.rejects(runBoxedAgent(task, policy), /Policy violation: mutableConfig must be false/);
});

test('runBoxedAgent policy should be frozen', async () => {
  const policy: BoxPolicy = {
    maxSteps: 10,
    maxTokens: 100,
    network: 'off',
    writablePaths: [],
    allowToolIds: [],
    mutableConfig: false
  };

  const task: Task = { id: 't1', prompt: 'test', context: {} };
  await runBoxedAgent(task, policy);

  assert.throws(() => {
    (policy as any).maxSteps = 20;
  }, TypeError);
});
