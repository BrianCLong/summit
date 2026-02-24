import { jest, describe, it, expect, beforeEach, afterAll, beforeAll } from '@jest/globals';

jest.unstable_mockModule('../../../provenance/ledger.js', () => ({
  provenanceLedger: {
    appendEntry: jest.fn(),
  },
}));

const mockDlq = {
  enqueue: jest.fn(),
};

jest.unstable_mockModule('../../../lib/dlq/index.js', () => ({
  dlqFactory: jest.fn(() => mockDlq),
}));

describe('EntityResolutionV2Service guardrails', () => {
  let EntityResolutionV2Service: typeof import('../EntityResolutionV2Service').EntityResolutionV2Service;
  let provenanceLedger: { appendEntry: jest.Mock };
  const originalEnv = { ...process.env };

  beforeAll(async () => {
    ({ EntityResolutionV2Service } = await import('../EntityResolutionV2Service'));
    ({ provenanceLedger } = await import('../../../provenance/ledger.js'));
  });

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('computes guardrail metrics from fixtures', () => {
    process.env.ER_GUARDRAIL_MIN_PRECISION = '0.1';
    process.env.ER_GUARDRAIL_MIN_RECALL = '0.1';
    process.env.ER_GUARDRAIL_MATCH_THRESHOLD = '0.6';
    process.env.ER_GUARDRAIL_DATASET_ID = 'baseline';

    const service = new EntityResolutionV2Service({ dlq: mockDlq });
    const result = service.evaluateGuardrails();

    expect(result.datasetId).toBe('baseline');
    expect(result.metrics.totalPairs).toBeGreaterThan(0);
    expect(result.metrics.precision).toBeGreaterThanOrEqual(0);
    expect(result.metrics.recall).toBeGreaterThanOrEqual(0);
  });

  it('blocks merges when guardrails fail without override', async () => {
    process.env.ER_GUARDRAIL_MIN_PRECISION = '0.99';
    process.env.ER_GUARDRAIL_MIN_RECALL = '0.99';
    process.env.ER_GUARDRAIL_MATCH_THRESHOLD = '0.8';

    const service = new EntityResolutionV2Service({ dlq: mockDlq });
    const session = {
      run: jest.fn().mockResolvedValue({
        records: [
          {
            get: () => ({
              labels: ['Entity'],
              properties: { id: 'm1', name: 'Alpha' },
            }),
          },
          {
            get: () => ({
              labels: ['Entity'],
              properties: { id: 'm2', name: 'Beta' },
            }),
          },
        ],
      }),
    };

    await expect(
      service.merge(session as any, {
        masterId: 'm1',
        mergeIds: ['m2'],
        userContext: { userId: 'tester', tenantId: 'tenant-1' },
        rationale: 'test',
        guardrailDatasetId: 'low-recall',
      })
    ).rejects.toThrow(/guardrails failed/i);
  });

  it('logs override reason when guardrails fail but override is provided', async () => {
    process.env.ER_GUARDRAIL_MIN_PRECISION = '0.99';
    process.env.ER_GUARDRAIL_MIN_RECALL = '0.99';
    process.env.ER_GUARDRAIL_MATCH_THRESHOLD = '0.8';

    const service = new EntityResolutionV2Service({ dlq: mockDlq });
    const tx = {
      run: jest.fn(async (query: string) => {
        if (query.includes('MERGE (d:ERDecision {idempotencyKey')) {
          return {
            records: [
              {
                get: (key: string) => {
                  if (key === 'decisionId') return 'dec-guardrail';
                  if (key === 'mergeId') return 'merge-guardrail';
                  if (key === 'masterId') return 'm1';
                  if (key === 'mergeIds') return ['m2'];
                  if (key === 'created') return false;
                  return null;
                },
              },
            ],
          };
        }
        return { records: [] };
      }),
      commit: jest.fn().mockResolvedValue(undefined),
      rollback: jest.fn().mockResolvedValue(undefined),
    };
    const session = {
      run: jest.fn().mockResolvedValue({
        records: [
          {
            get: () => ({
              labels: ['Entity'],
              properties: { id: 'm1', name: 'Alpha' },
            }),
          },
          {
            get: () => ({
              labels: ['Entity'],
              properties: { id: 'm2', name: 'Beta' },
            }),
          },
        ],
      }),
      beginTransaction: jest.fn().mockReturnValue(tx),
    };

    const result = await service.merge(session as any, {
      masterId: 'm1',
      mergeIds: ['m2'],
      mergeId: 'merge-guardrail',
      userContext: { userId: 'tester', tenantId: 'tenant-1' },
      rationale: 'override test',
      guardrailDatasetId: 'low-recall',
      guardrailOverrideReason: 'Approved by lead analyst.',
    });

    expect(result.overrideUsed).toBe(true);
    expect(provenanceLedger.appendEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: 'ER_GUARDRAIL_OVERRIDE',
        actorId: 'tester',
        payload: expect.objectContaining({
          reason: 'Approved by lead analyst.',
        }),
      })
    );
  });
});
