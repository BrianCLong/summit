import { test } from 'node:test';
import * as assert from 'node:assert';
import { routeMemory, MEMORY_ORCH_ENABLED } from '../../../src/agents/memory/orchestrator';

test('Memory Orchestrator', () => {
  assert.strictEqual(routeMemory('test'), 'cold');
});
