import { describe, it } from 'node:test';
import assert from 'node:assert';
import { scoreEvidenceTrust } from '../../src/evidence/trust/trustEngine';

describe('TrustEngine', () => {
  it('should score trust', () => {
    const trust = scoreEvidenceTrust({ citationVerified: true, sourceReputation: 0.8 });
    assert.ok(trust.score >= 0.5);
    assert.strictEqual(trust.modelVersion, 'sep-trust-v1');
  });
});
