import { assessThreatCase } from '../score_engine';

describe('determinism', () => {
  it('returns stable output for same input', () => {
    const input = [
      {
        indicator_id: 'TA_COMM_001',
        value: 1 as const,
        confidence: 0.8,
        evidence_ids: ['EVID:mosaic-threat-model:MSG:001'],
      },
    ];
    const a = assessThreatCase('CASE-1', 'general', input);
    const b = assessThreatCase('CASE-1', 'general', input);
    expect(a).toEqual(b);
  });
});
