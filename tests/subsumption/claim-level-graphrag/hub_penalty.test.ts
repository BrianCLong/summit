import { calculateHubPenalty, rerankEvidence } from '../../../src/subsumption/claim_level/hub_penalty';

describe('Hub Penalty', () => {
  test('should return 0 penalty for low degree nodes', () => {
    expect(calculateHubPenalty(50, 100)).toBe(0);
    expect(calculateHubPenalty(100, 100)).toBe(0);
  });

  test('should return positive penalty for high degree nodes', () => {
    expect(calculateHubPenalty(110, 100)).toBe(1); // log10(10) = 1
    expect(calculateHubPenalty(1000, 0)).toBe(3); // log10(1000) = 3
  });

  test('should rerank candidates based on penalty', () => {
    const candidates = [
      { id: 'hub', score: 0.9, degree: 1000 },     // Penalty ~3 -> -2.1
      { id: 'leaf', score: 0.8, degree: 10 }       // Penalty 0 -> 0.8
    ];

    const reranked = rerankEvidence(candidates, 1.0);
    expect(reranked[0].id).toBe('leaf');
    expect(reranked[1].id).toBe('hub');
  });
});
