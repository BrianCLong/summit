import {
  createEmptyVerificationSignals,
  validateConfidenceReport,
} from '../ConfidenceReport.js';

describe('ConfidenceReport validation', () => {
  it('accepts valid reports', () => {
    const errors = validateConfidenceReport({
      p_correct: 0.72,
      tool_types_used: ['EVIDENCE'],
      noise_signals: {
        source_agreement_score: 0.4,
        retrieval_entropy: 0.6,
        contradiction_count: 1,
        provenance_coverage: 0.8,
        recency_risk: 0.5,
        recency_known: true,
      },
      verification_signals: createEmptyVerificationSignals(),
      contradiction_count: 1,
      provenance_coverage: {
        coverage: 0.8,
        sources_with_provenance: 2,
        total_sources: 2,
      },
      risk_tier: 'medium',
      notes: ['example note'],
      timestamp: '2026-01-14T00:00:00Z',
    });

    expect(errors).toEqual([]);
  });

  it('flags invalid bounds', () => {
    const errors = validateConfidenceReport({
      p_correct: 1.2,
      tool_types_used: ['VERIFICATION'],
      noise_signals: {
        source_agreement_score: 1.2,
        retrieval_entropy: -1,
        contradiction_count: 0,
        provenance_coverage: 0.2,
        recency_risk: 0.4,
        recency_known: false,
      },
      verification_signals: createEmptyVerificationSignals(),
      contradiction_count: 0,
      provenance_coverage: {
        coverage: 1.4,
        sources_with_provenance: 0,
        total_sources: 0,
      },
      risk_tier: 'low',
      notes: [],
      timestamp: '',
    });

    expect(errors.length).toBeGreaterThan(0);
  });
});
