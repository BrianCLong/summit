import {
  applyEvidenceNoiseCap,
  scoreEvidenceNoise,
} from '../evidenceNoise.js';
import { createEmptyVerificationSignals } from '../ConfidenceReport.js';

describe('evidence noise scoring', () => {
  it('scores provenance, entropy, and contradictions', () => {
    const result = scoreEvidenceNoise({
      items: [
        {
          url: 'https://alpha.example.com/post',
          snippet: 'First source',
          retrievedAt: '2024-01-01T00:00:00Z',
        },
        {
          url: 'https://beta.example.com/post',
          snippet: 'Second source',
          retrievedAt: '2023-01-01T00:00:00Z',
          contradiction: true,
        },
      ],
      contradictions: ['alpha vs beta'],
    });

    expect(result.noise.provenance_coverage).toBe(1);
    expect(result.noise.contradiction_count).toBe(2);
    expect(result.noise.source_agreement_score).toBeCloseTo(0.5, 5);
    expect(result.noise.retrieval_entropy).toBeGreaterThan(0);
  });

  it('caps confidence when noisy evidence lacks verification', () => {
    const noise = scoreEvidenceNoise({
      items: [
        { url: 'https://alpha.example.com', snippet: 'A' },
        { url: 'https://beta.example.com', snippet: 'B', contradiction: true },
        { sourceId: 'anonymous' },
      ],
      contradictions: ['A vs B'],
    }).noise;

    const result = applyEvidenceNoiseCap(
      0.9,
      ['EVIDENCE'],
      noise,
      createEmptyVerificationSignals(),
      {
        cap: 0.65,
        entropy_high: 0.7,
        agreement_low: 0.4,
        provenance_low: 0.6,
      },
    );

    expect(result.p_correct).toBeLessThanOrEqual(0.65);
    expect(result.cap_applied).toBe(true);
    expect(result.notes[0]).toMatch(/capped/);
  });
});
