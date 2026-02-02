import { describe, it, expect } from 'vitest';
import { calculatePressureScore } from '../src/pressure_score';

describe('Pressure Score', () => {
  it('should calculate a deterministic score based on inputs', () => {
    const leakRecords = [
      {
        evidence_id: 'EVD-1',
        victim_name: 'Test Corp',
        source: 'Site A',
        sector: 'Healthcare',
        dataset_tags: ['pii']
      }
    ];

    const findings = [
      {
        evidence_id: 'EVD-2',
        finding_type: 'MISCONFIG',
        description: 'Internet exposed MongoDB with PII',
        severity: 'CRITICAL',
        affected_asset: 'db.example.com'
      } as const
    ];

    const noteAnalysis = {
      evidence_id: 'EVD-3',
      tactics: ['SURVEILLANCE_CLAIM', 'TIME_PRESSURE', 'LEGAL_LIABILITY_FRAMING'] as any[],
      confidence: 0.8,
      summary: 'High pressure note'
    };

    const score = calculatePressureScore(leakRecords, findings, noteAnalysis);

    expect(score.overall_score).toBeGreaterThan(50);
    expect(score.vectors.legal_regulatory).toBe(10); // 5 (PII) + 5 (Healthcare) + 2 (Note) capped at 10
    expect(score.vectors.coercion).toBe(10); // 5 + 5
    expect(score.explain.legal_regulatory).toContain('PII exposure: true');
  });

  it('should handle minimal inputs', () => {
    const score = calculatePressureScore([], [], null);
    expect(score.overall_score).toBe(0);
    expect(score.vectors.legal_regulatory).toBe(0);
  });
});
