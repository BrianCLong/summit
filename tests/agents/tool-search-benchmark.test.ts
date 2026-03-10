import { test } from 'node:test';
import * as assert from 'node:assert';
import { ToolRegistry } from '../../src/agents/tool-search/tool-registry';

test('Tool Search Benchmark Simulation', () => {
  const registry = new ToolRegistry();
  for (let i = 0; i < 50; i++) {
    registry.register({
      id: `tool-${i}`,
      description: `Tool number ${i}`,
      schema: { large: 'payload'.repeat(100) }
    });
  }

  const index = registry.getIndex();
  const indexTokens = JSON.stringify(index).length;
  const fullTokens = JSON.stringify(Array.from(registry.tools.values())).length;

  assert.ok(indexTokens < fullTokens * 0.3, 'Token budget < baseline by 30%');
});
