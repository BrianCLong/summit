import test from 'node:test';
import assert from 'node:assert';
import { canPromote } from '../../../agentic/ai-stack/promotion-gate.js';

test('promotion logic', () => {
  const good = {
    agentId: 'ag1',
    hiddenEvalPass: true,
    costDeltaPct: 10,
    qualityDeltaPct: 5,
    policyViolations: 0
  };
  const bad = { ...good, policyViolations: 1 };

  assert.strictEqual(canPromote(good), true);
  assert.strictEqual(canPromote(bad), false);
});
