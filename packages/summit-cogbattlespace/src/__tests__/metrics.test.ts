import { computeDivergenceMetrics } from '../pipeline/computeMetrics';

describe('computeDivergenceMetrics', () => {
  it('emits divergence score when type is contradicts', () => {
    const asOf = new Date().toISOString();
    const out = computeDivergenceMetrics(
      [
        {
          id: 'link_1234',
          narrativeId: 'narrative_1',
          claimId: 'claim_1',
          type: 'contradicts',
          score: 0.8,
          observedAt: asOf,
          provenance: { artifactIds: [] },
        },
      ],
      asOf,
    );

    expect(out[0]?.divergenceScore).toBeCloseTo(0.8);
  });
});
