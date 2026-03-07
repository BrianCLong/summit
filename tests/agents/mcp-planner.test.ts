import { test } from 'node:test';
import * as assert from 'node:assert';
import { McpPlanner } from '../../src/agents/mcp/planner';

test('MCP Planner decomposes task', () => {
  const planner = new McpPlanner();
  const plan = planner.planTask('test');
  assert.ok(plan.steps.length > 0);
});
