import { test } from 'node:test';
import * as assert from 'node:assert';
import { AgentOrchestrator } from '../../src/agents/agent-orchestrator';

test('Agent Orchestrator runs', async () => {
  const orchestrator = new AgentOrchestrator();
  const res = await orchestrator.runAll(['p1']);
  assert.strictEqual(res.length, 1);
});
