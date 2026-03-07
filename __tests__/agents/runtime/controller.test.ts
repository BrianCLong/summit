import test from 'node:test';
import assert from 'node:assert';
import { runGoal } from '../../../agents/runtime/controller.ts';

test('Controller should build a deterministic plan', async () => {
  const goal = { goalId: 'goal-1', prompt: 'test goal', mode: 'tmux' as const };
  const result = await runGoal(goal);

  assert.strictEqual(result.evidencePrefix, 'SUMMIT-MAR-goal-1');
  assert.strictEqual(result.plan.length, 4);
  assert.match(result.plan[0].taskId, /-t1$/);
});
