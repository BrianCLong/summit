import test from 'node:test';
import assert from 'node:assert';
import { evaluateSearchPolicy, EvalTask, SearchBudget } from '../../summit/evaluation/search_budget_harness.js';

test('evaluateSearchPolicy executes within budget', async () => {
  const budget: SearchBudget = {
    maxNodes: 10,
    maxDepth: 5,
    maxRollouts: 2
  };
  const task: EvalTask = { id: 'task1', problem: 'Find path' };

  const result = await evaluateSearchPolicy(task, budget);
  assert.strictEqual(result.trace[0].event, 'search_start');
});

test('evaluateSearchPolicy throws on negative budget', async () => {
  const budget: SearchBudget = {
    maxNodes: -1,
    maxDepth: 5,
    maxRollouts: 2
  };
  const task: EvalTask = { id: 'task1', problem: 'Find path' };

  await assert.rejects(evaluateSearchPolicy(task, budget), /Invalid budget bounds/);
});
