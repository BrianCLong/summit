import test from 'node:test';
import assert from 'node:assert';
import { normalizeTrigger } from '../../../agentic/ai-stack/trigger-bus.js';

test('normalizeTrigger', () => {
  const result = normalizeTrigger({ id: 'evt-1' });
  assert.strictEqual(result.id, 'evt-1');
  assert.strictEqual(result.type, 'webhook');
});
