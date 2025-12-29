import { EntityResolutionV2Service } from '../EntityResolutionV2Service';
import { provenanceLedger } from '../../../provenance/ledger';
import { writeAudit } from '../../../utils/audit.js';

jest.mock('../../../config/database.js', () => ({
  getPostgresPool: jest.fn(() => ({
    query: jest.fn().mockResolvedValue({ rows: [] }),
  })),
}));

jest.mock('../../../utils/audit.js', () => ({
  writeAudit: jest.fn(),
}));

jest.mock('../../../provenance/ledger', () => ({
  provenanceLedger: {
    appendEntry: jest.fn(),
  },
}));

describe('EntityResolutionV2Service guardrails', () => {
  const originalEnv = { ...process.env };

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

    const service = new EntityResolutionV2Service();
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

    const service = new EntityResolutionV2Service();
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

    const service = new EntityResolutionV2Service();
    const tx = {
      run: jest.fn().mockResolvedValue({ records: [] }),
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
    expect(writeAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'ER_GUARDRAIL_OVERRIDE',
        details: expect.objectContaining({
          reason: 'Approved by lead analyst.',
        }),
      }),
    );
  });
});
