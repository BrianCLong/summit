// tests/subsumption/claim-level-graphrag/claim_verifier.test.ts
import { verifyClaim } from '../../../src/subsumption/claim_level/claim_verifier_mock';

describe('Claim Verifier (Mock)', () => {
  test('should return supported for normal claims', async () => {
    const claim = { claim_id: 'CLM-001', text: 'The sky is blue.' };
    const verified = await verifyClaim(claim);
    expect(verified.support).toBe('supported');
    expect(verified.evidence_refs.length).toBeGreaterThan(0);
  });

  test('should return unsupported for green cheese', async () => {
    const claim = { claim_id: 'CLM-002', text: 'The moon is made of green cheese.' };
    const verified = await verifyClaim(claim);
    expect(verified.support).toBe('unsupported');
    expect(verified.evidence_refs).toEqual([]);
  });

  test('should return contradicted for flat earth', async () => {
    const claim = { claim_id: 'CLM-003', text: 'The Earth is flat.' };
    const verified = await verifyClaim(claim);
    expect(verified.support).toBe('contradicted');
  });
});
