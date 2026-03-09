import { test } from 'node:test';
import * as assert from 'node:assert';
import { ToolRegistry } from '../../src/agents/tool-search/tool-registry';

test('Tool Registry limits token usage by only returning index', () => {
  const registry = new ToolRegistry();
  registry.register({
    id: 'test-tool',
    description: 'A test tool',
    schema: { type: 'object', properties: { deeply: { type: 'string' } } }
  });

  const index = registry.getIndex();
  assert.strictEqual(index.length, 1);
  assert.strictEqual(index[0].id, 'test-tool');
  assert.strictEqual((index[0] as any).schema, undefined);
});
