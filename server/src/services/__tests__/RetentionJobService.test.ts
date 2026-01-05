import {
  RETENTION_POLICY_AUTHORITY,
  RetentionPolicy,
  RetentionRule,
} from '../../policies/retentionPolicy.js';
import {
  RetentionJobService,
  RetentionStore,
} from '../RetentionJobService.js';
import type { Receipt } from '../ReceiptService.js';

const dayMs = 24 * 60 * 60 * 1000;

type MemoryRecord = {
  id: string;
  resourceType: string;
  createdAt: Date;
  archived?: boolean;
  anonymized?: boolean;
};

class InMemoryRetentionStore implements RetentionStore {
  constructor(private records: MemoryRecord[]) {}

  async deleteExpired(rule: RetentionRule, cutoff: Date) {
    const before = this.records.length;
    this.records = this.records.filter((record) => {
      if (record.resourceType !== rule.resource.type) return true;
      return record.createdAt >= cutoff;
    });
    return before - this.records.length;
  }

  async archiveExpired(rule: RetentionRule, cutoff: Date) {
    let affected = 0;
    this.records = this.records.map((record) => {
      if (
        record.resourceType === rule.resource.type &&
        record.createdAt < cutoff
      ) {
        affected += 1;
        return { ...record, archived: true };
      }
      return record;
    });
    return affected;
  }

  async anonymizeExpired(rule: RetentionRule, cutoff: Date) {
    let affected = 0;
    this.records = this.records.map((record) => {
      if (
        record.resourceType === rule.resource.type &&
        record.createdAt < cutoff
      ) {
        affected += 1;
        return { ...record, anonymized: true };
      }
      return record;
    });
    return affected;
  }

  snapshot() {
    return this.records;
  }
}

describe('RetentionJobService', () => {
  it('applies retention actions and emits receipts with policy version', async () => {
    const now = Date.now();
    const records: MemoryRecord[] = [
      {
        id: 'telemetry-old',
        resourceType: 'telemetry',
        createdAt: new Date(now - 40 * dayMs),
      },
      {
        id: 'telemetry-new',
        resourceType: 'telemetry',
        createdAt: new Date(now - 2 * dayMs),
      },
      {
        id: 'evidence-old',
        resourceType: 'evidence',
        createdAt: new Date(now - 400 * dayMs),
      },
      {
        id: 'audit-old',
        resourceType: 'audit',
        createdAt: new Date(now - 5 * dayMs),
      },
    ];
    const store = new InMemoryRetentionStore(records);
    const receiptWriter = {
      generateReceipt: jest
        .fn()
        .mockResolvedValue({ id: 'receipt-1' } as Receipt),
    };

    const policy: RetentionPolicy = {
      metadata: {
        id: 'retention-test',
        version: '3.1.0',
        name: 'Retention policy',
        authority: RETENTION_POLICY_AUTHORITY,
      },
      rules: [
        {
          id: 'telemetry-delete',
          resource: { type: 'telemetry' },
          retentionDays: 30,
          action: 'DELETE',
        },
        {
          id: 'evidence-archive',
          resource: { type: 'evidence' },
          retentionDays: 365,
          action: 'ARCHIVE',
        },
        {
          id: 'audit-anonymize',
          resource: { type: 'audit' },
          retentionDays: 3,
          action: 'ANONYMIZE',
        },
      ],
    };

    const service = new RetentionJobService(store, receiptWriter);
    const result = await service.runPolicy(policy, {
      actorId: 'retention-job',
      tenantId: 'tenant-1',
      runId: 'run-55',
    });

    expect(result.policyId).toBe('retention-test');
    expect(result.policyVersion).toBe('3.1.0');
    expect(result.results).toHaveLength(3);
    expect(store.snapshot()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'telemetry-new' }),
      ]),
    );
    expect(store.snapshot()).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: 'telemetry-old' })]),
    );
    expect(store.snapshot()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'evidence-old', archived: true }),
        expect.objectContaining({ id: 'audit-old', anonymized: true }),
      ]),
    );
    expect(receiptWriter.generateReceipt).toHaveBeenCalledTimes(3);
    for (const call of receiptWriter.generateReceipt.mock.calls) {
      expect(call[0]).toEqual(
        expect.objectContaining({
          policyDecisionId: 'retention-test@3.1.0',
          input: expect.objectContaining({
            policyVersion: '3.1.0',
          }),
        }),
      );
    }
  });
});
