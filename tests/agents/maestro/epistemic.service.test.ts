import { test } from 'node:test';
import * as assert from 'node:assert';
import { evaluateIntent, TRUST_CP_ENABLED } from '../../../src/agents/maestro/epistemic/api';

test('Epistemic API', () => {
  const res = evaluateIntent({
    task_id: '1',
    teleology_context_id: 'ctx',
    subject_ref: 'sub',
    claim_id: 'claim-1',
    action_type: 'PUB'
  });
  assert.strictEqual(res, 'APPROVE');
});
