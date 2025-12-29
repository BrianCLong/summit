import {
  evaluateEvidenceScore,
  scoreEvidenceCompleteness,
} from '../evidenceScore.js';

describe('evidence completeness scoring', () => {
  test('identifies missing receipt evidence fields deterministically', () => {
    const receipt = {
      runId: 'run-123',
      summary: { runbook: 'demo', startedAt: '2024-01-01T00:00:00Z' },
      evidence: { artifacts: [] },
    } as any;

    const result = scoreEvidenceCompleteness(receipt, 'receipt');

    expect(result.score).toBeCloseTo(0.3, 4);
    expect(result.missing).toEqual([
      'receiptId',
      'summary.status',
      'summary.endedAt',
      'signer.kid',
      'signature',
      'evidence.artifacts',
      'hashes.inputsOutputs',
    ]);
  });

  test('threshold evaluation maps to warn or error modes', () => {
    const baseScore = { score: 0.5, missing: ['summary.status'] };

    const warnEvaluation = evaluateEvidenceScore(baseScore, 0.8, 'warn');
    expect(warnEvaluation.severity).toBe('warn');
    expect(warnEvaluation.triggered).toBe(true);

    const errorEvaluation = evaluateEvidenceScore(baseScore, 0.8, 'error');
    expect(errorEvaluation.severity).toBe('error');
    expect(errorEvaluation.triggered).toBe(true);
  });
});
