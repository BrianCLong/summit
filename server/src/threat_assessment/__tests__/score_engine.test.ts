import { assessThreatCase } from '../score_engine';

describe('score engine', () => {
  it('produces deterministic score breakdown', () => {
    const result = assessThreatCase('CASE-1', 'public_figure', [
      {
        indicator_id: 'TA_COMM_001',
        value: 2,
        confidence: 1,
        evidence_ids: ['EVID:mosaic-threat-model:MSG:001'],
      },
      {
        indicator_id: 'TA_PLAN_012',
        value: 1,
        confidence: 0.9,
        evidence_ids: ['EVID:mosaic-threat-model:OBS:004'],
      },
    ]);
    expect(result.risk_score).toBeGreaterThan(0);
    expect(result.evidence_ids).toEqual([
      'EVID:mosaic-threat-model:MSG:001',
      'EVID:mosaic-threat-model:OBS:004',
    ]);
  });
});
