import test from 'node:test';
import assert from 'node:assert';
import { canSelfHeal, MAX_SELF_HEAL_ATTEMPTS } from '../../../antigravity/ai-stack/self-heal.js';

test('self-heal limits', () => {
  assert.strictEqual(canSelfHeal(0), true);
  assert.strictEqual(canSelfHeal(1), false);
  assert.strictEqual(MAX_SELF_HEAL_ATTEMPTS, 1);
});
