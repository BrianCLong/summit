import {
  assembleReceiptBundle,
  unpackBundle,
  type Receipt,
  type PolicyDecision,
} from '../src/export';

describe('receipt bundle assembler', () => {
  const baseReceipts: Receipt[] = [
    {
      id: 'r-1',
      subject: 'case-123',
      issuedAt: '2024-01-01T00:00:00Z',
      amount: 100,
      secret: 'redact-me',
    },
    {
      id: 'r-2',
      subject: 'case-123',
      issuedAt: '2024-01-02T00:00:00Z',
      amount: 200,
    },
  ];

  const baseDecisions: PolicyDecision[] = [
    {
      id: 'p-1',
      rule: 'export:dataset',
      outcome: 'allow',
      issuedAt: '2024-01-01T00:00:00Z',
      rationale: ['meets policy'],
      reviewer: 'compliance-officer',
    },
    {
      id: 'p-2',
      rule: 'export:dataset',
      outcome: 'review',
      issuedAt: '2024-01-02T00:00:00Z',
      rationale: ['needs manager approval'],
    },
  ];

  test('assembles bundle with manifest and redacted fields', async () => {
    const result = await assembleReceiptBundle({
      receipts: baseReceipts,
      policyDecisions: baseDecisions,
      manifest: {
        caseId: 'case-123',
        requestedBy: 'analyst-7',
        policyVersion: '2024.11',
      },
      redaction: {
        receipts: ['secret'],
        policyDecisions: ['reviewer'],
      },
    });

    expect(result.manifest.receiptCount).toBe(2);
    expect(result.manifest.policyDecisionCount).toBe(2);
    expect(result.manifest.merkleRoot).not.toEqual('');
    expect(result.manifest.receipts[0].redactedFields).toContain('secret');
    expect(result.manifest.policyDecisions[0].redactedFields).toContain(
      'reviewer',
    );

    const files = await unpackBundle(result.bundle);
    expect(Object.keys(files)).toEqual(
      expect.arrayContaining([
        'manifest.json',
        'receipts.json',
        'policy-decisions.json',
      ]),
    );

    const receipts = JSON.parse(files['receipts.json']);
    expect(receipts[0].secret).toBeUndefined();

    const manifest = JSON.parse(files['manifest.json']);
    expect(manifest.caseId).toBe('case-123');
    expect(manifest.redactionsApplied.receipts).toContain('secret');
  });

  test('applies selective disclosure filters', async () => {
    const result = await assembleReceiptBundle({
      receipts: baseReceipts,
      policyDecisions: baseDecisions,
      selectiveDisclosure: {
        receiptIds: ['r-2'],
        decisionIds: ['p-2'],
      },
    });

    expect(result.receipts).toHaveLength(1);
    expect(result.receipts[0].id).toBe('r-2');
    expect(result.policyDecisions).toHaveLength(1);
    expect(result.policyDecisions[0].id).toBe('p-2');

    const manifest = JSON.parse(
      (await unpackBundle(result.bundle))['manifest.json'],
    );
    expect(manifest.receiptCount).toBe(1);
    expect(manifest.policyDecisionCount).toBe(1);
    expect(manifest.selectiveDisclosure.receiptIds).toContain('r-2');
  });
});
