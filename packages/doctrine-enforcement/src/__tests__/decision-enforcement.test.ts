import { DecisionValidator, InformationGate, RefusalRecord } from '../index.js';

describe('Doctrine enforcement spine', () => {
  it('accepts a decision with evidence, authority, and bounded confidence', () => {
    const result = DecisionValidator.validate({
      id: 'decision-1',
      summary: 'Approve containment for suspected manipulation',
      evidence: [{ id: 'ev-123', description: 'Incident timeline', source: 'ledger' }],
      confidence: 0.72,
      authority: { actor: 'Alice Analyst', role: 'Duty Officer' },
    });

    expect(result.ok).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('rejects decisions missing evidence, authority, or valid confidence', () => {
    const result = DecisionValidator.validate({
      summary: '',
      evidence: [{ id: '', description: 'blank evidence' }],
      confidence: 1.5,
      authority: { actor: '', role: '' },
    });

    expect(result.ok).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'summary' }),
        expect.objectContaining({ field: 'evidence' }),
        expect.objectContaining({ field: 'confidence' }),
        expect.objectContaining({ field: 'authority' }),
      ]),
    );
  });

  it('blocks inadmissible information at the gate', () => {
    const now = new Date('2026-01-01T00:00:00Z');
    const result = InformationGate.admit(
      {
        id: 'fact-1',
        source: '',
        attribution: '',
        receivedAt: new Date('2025-12-31T23:59:59Z'),
        expiresAt: new Date('2026-01-01T00:00:00Z'),
        revoked: true,
      },
      now,
    );

    expect(result.ok).toBe(false);
    expect(result.issues.map((issue) => issue.field)).toEqual(
      expect.arrayContaining(['source', 'attribution', 'expiresAt', 'revoked']),
    );
  });

  it('records refusal details for auditability', () => {
    const record = new RefusalRecord({
      reason: 'Evidence chain is missing and authority is unclear',
      decisionId: 'decision-2',
      evidenceIds: ['ev-missing'],
      actor: 'Bob Custodian',
      doctrineRefs: ['narrative-invariants', 'refusal-surface'],
      containment: 'Sandbox execution and notify counter-intel',
      createdAt: new Date('2026-01-01T01:02:03Z'),
    });

    expect(record.toJSON()).toEqual({
      reason: 'Evidence chain is missing and authority is unclear',
      decisionId: 'decision-2',
      evidenceIds: ['ev-missing'],
      actor: 'Bob Custodian',
      doctrineRefs: ['narrative-invariants', 'refusal-surface'],
      containment: 'Sandbox execution and notify counter-intel',
      createdAt: '2026-01-01T01:02:03.000Z',
    });
  });
});
