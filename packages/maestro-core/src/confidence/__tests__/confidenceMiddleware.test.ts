import { createConfidenceMiddleware } from '../../middleware/confidenceMiddleware.js';
import { EvidenceBundle } from '../evidenceNoise.js';

describe('confidence middleware', () => {
  it('records verification signals and caps noisy evidence', () => {
    const middleware = createConfidenceMiddleware({
      risk_tier: 'high',
      now: new Date('2026-01-14T00:00:00Z'),
    });

    middleware.recordToolCall('EVIDENCE');
    const bundle: EvidenceBundle = {
      items: [
        {
          url: 'https://alpha.example.com',
          snippet: 'alpha',
          retrievedAt: '2024-01-01T00:00:00Z',
        },
        {
          url: 'https://beta.example.com',
          snippet: 'beta',
          retrievedAt: '2023-01-01T00:00:00Z',
          contradiction: true,
        },
      ],
      contradictions: ['alpha vs beta'],
    };

    middleware.recordEvidenceBundle(bundle);
    middleware.recordVerificationSignal('exec_error');

    const report = middleware.finalizeReport(0.9, '2026-01-14T00:00:00Z');

    expect(report.verification_signals.exec_error).toBe(1);
    expect(report.notes.some((note) => note.includes('High-risk'))).toBe(false);
    expect(report.p_correct).toBeGreaterThan(0);
  });
});
