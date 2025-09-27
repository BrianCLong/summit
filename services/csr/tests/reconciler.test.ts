import { ConsentStateReconciler } from '../src/reconciler';
import { ConsentRecord } from '../src/types';

describe('ConsentStateReconciler', () => {
  const baseRecords: ConsentRecord[] = [
    {
      recordId: 'partner-1',
      subjectId: 'user-1',
      consentType: 'email_marketing',
      status: 'revoked',
      source: 'partner',
      timestamp: '2024-01-02T10:00:00.000Z'
    },
    {
      recordId: 'app-1',
      subjectId: 'user-1',
      consentType: 'email_marketing',
      status: 'granted',
      source: 'app_sdk',
      timestamp: '2024-01-03T10:00:00.000Z'
    },
    {
      recordId: 'crm-1',
      subjectId: 'user-1',
      consentType: 'email_marketing',
      status: 'revoked',
      source: 'crm',
      timestamp: '2024-01-01T08:00:00.000Z'
    }
  ];

  it('applies precedence before recency when resolving conflicts', () => {
    const reconciler = new ConsentStateReconciler();

    const partnerResult = reconciler.ingest([baseRecords[0]]);
    expect(partnerResult.proofs[0].appliedRule).toBe('new-record');

    const appResult = reconciler.ingest([baseRecords[1]]);
    expect(appResult.proofs[0].appliedRule).toBe('source-precedence');

    const crmResult = reconciler.ingest([baseRecords[2]]);
    expect(crmResult.proofs[0].appliedRule).toBe('source-precedence');

    const finalState = reconciler.getSubjectState('user-1');
    expect(finalState).toBeDefined();
    expect(finalState?.email_marketing).toMatchObject({
      status: 'revoked',
      source: 'crm',
      recordId: 'crm-1'
    });
  });

  it('prefers the most recent record when precedence ties', () => {
    const reconciler = new ConsentStateReconciler();
    const firstIngest = reconciler.ingest([
      {
        recordId: 'app-2',
        subjectId: 'user-2',
        consentType: 'sms',
        status: 'revoked',
        source: 'app_sdk',
        timestamp: '2024-02-01T00:00:00.000Z'
      }
    ]);
    expect(firstIngest.proofs[0].appliedRule).toBe('new-record');

    const secondIngest = reconciler.ingest([
      {
        recordId: 'app-3',
        subjectId: 'user-2',
        consentType: 'sms',
        status: 'granted',
        source: 'app_sdk',
        timestamp: '2024-02-02T00:00:00.000Z'
      }
    ]);

    const proof = secondIngest.proofs.find((entry) => entry.recordId === 'app-3');
    expect(proof?.appliedRule).toBe('recency');
    expect(proof?.before?.recordId).toBe('app-2');
    expect(proof?.after.recordId).toBe('app-3');
  });

  it('provides diff and rollback snapshots', () => {
    const reconciler = new ConsentStateReconciler();
    const result = reconciler.ingest(baseRecords);

    const diff = reconciler.diff(result.beforeSnapshotId);
    expect(diff.entries.length).toBeGreaterThan(0);

    reconciler.rollback(result.beforeSnapshotId);
    const rolledBackState = reconciler.getSubjectState('user-1');
    expect(rolledBackState).toBeUndefined();

    const rollbackDiff = reconciler.diff(result.beforeSnapshotId);
    expect(rollbackDiff.entries).toHaveLength(0);
  });
});
