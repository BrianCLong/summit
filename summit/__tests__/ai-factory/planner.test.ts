import test from 'node:test';
import assert from 'node:assert';
import { createPlan } from '../../agents/factory/planner';

test('createPlan returns valid plan structure', () => {
  const plan = createPlan('test-issue', [{ id: 'TEST-CLAIM' }]);
  assert.strictEqual(plan.itemSlug, 'test-issue');
  assert.ok(Array.isArray(plan.workItems));
});
