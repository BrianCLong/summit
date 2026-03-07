import { test } from 'node:test';
import assert from 'node:assert';
import { runGoal } from '../../../agents/runtime/controller.js';
import { hashObject } from '../../../agents/runtime/artifacts.js';

test('controller generates deterministic plans', async () => {
  const goal = { goalId: 't1', prompt: 'test prompt', mode: 'tmux' as const };
  const res1 = await runGoal(goal);
  const res2 = await runGoal(goal);

  assert.strictEqual(hashObject(res1.plan), hashObject(res2.plan));
});
