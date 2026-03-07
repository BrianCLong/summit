import { test } from 'node:test';
import * as assert from 'node:assert';
import { EpistemicClaim } from '../../src/graphrag/schema/epistemic';

test('Epistemic Schema', () => {
  const claim: EpistemicClaim = {
    claim_id: 'claim-123',
    subject_ref: 'subject-123',
    statement: 'Test statement',
    status: 'hypothesized',
    confidence: 0.8,
    epistemic_uncertainty: 0.1,
    aleatoric_uncertainty: 0.1,
    domain: 'osint'
  };
  assert.strictEqual(claim.claim_id, 'claim-123');
});
