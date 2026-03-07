import test from 'node:test';
import assert from 'node:assert';
import { config } from '../../../agents/runtime/config.ts';

test('Feature flag for burst executor should be off by default', () => {
  assert.strictEqual(config.multiAgentBurstEnabled, false);
});
