import { test } from 'node:test';
import * as assert from 'node:assert';
import { ToolPolicy } from '../../src/agents/tool-search/tool-policy';

test('Tool Policy prevents unknown tools', () => {
  const policy = new ToolPolicy();
  policy.allowTool('safe-tool');

  assert.strictEqual(policy.isAllowed('safe-tool'), true);
  assert.strictEqual(policy.isAllowed('malicious-tool'), false);
});
