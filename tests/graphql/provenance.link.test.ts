import { jest } from '@jest/globals';

jest.unstable_mockModule('../../server/src/db/repositories/trustRiskRepo.ts', () => ({
  getTrustScore: jest.fn(async () => ({ tenant_id: 't0', subject_id: 's1', score: 0.8, reasons: ['baseline'], updated_at: new Date().toISOString() })),
  upsertTrustScore: jest.fn(async () => 'ts_t0_s1'),
}));

describe('linkTrustScoreEvidence resolver', () => {
  it('updates trust score with evidence id and returns updated TrustScore', async () => {
    const { provenanceResolvers } = await import('../../server/src/graphql/resolvers/provenance');
    const result = await provenanceResolvers.Mutation.linkTrustScoreEvidence({}, { tenantId: 't0', subjectId: 's1', evidenceId: 'ev_1' });
    expect(result.subjectId).toBe('s1');
    expect(result.score).toBeDefined();
    expect(Array.isArray(result.reasons)).toBe(true);
    expect(typeof result.updatedAt).toBe('string');
  });
});

