import { describe, expect, it, beforeEach, afterEach, jest } from '@jest/globals';
import { Pool } from 'pg';
import { DataRetentionEngine } from '../governance/retention/dataRetentionEngine.js';
import { DataRetentionRepository } from '../governance/retention/repository.js';
import { RetentionScheduler } from '../governance/retention/scheduler.js';
import { RetentionPolicyModel } from '../governance/retention/policyModel.js';
import { RetentionSweeper } from '../governance/retention/retentionSweeper.js';
import { RetentionAuditLogger } from '../governance/retention/auditLogger.js';
import { RetentionRecord } from '../governance/retention/types.js';

const fixedNow = new Date('2024-01-31T00:00:00.000Z');

function mockPool(): Pool {
  return {
    query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
  } as unknown as Pool;
}

function mockAudit(): RetentionAuditLogger {
  return {
    log: jest.fn().mockResolvedValue(undefined),
  };
}

function baseRecord(datasetId: string, overrides: Partial<RetentionRecord> = {}): RetentionRecord {
  return {
    metadata: {
      datasetId,
      name: datasetId,
      dataType: 'analytics',
      containsPersonalData: false,
      jurisdictions: ['us'],
      tags: ['postgres:table:records'],
      storageSystems: ['postgres'],
      owner: 'tester',
      createdAt: new Date('2023-12-01T00:00:00.000Z'),
      tenantId: 'tenant-1',
      caseId: 'case-1',
      evidenceType: 'video',
      ...(overrides.metadata || {}),
    },
    policy: {
      datasetId,
      templateId: 'base-template',
      retentionDays: 90,
      purgeGraceDays: 10,
      legalHoldAllowed: true,
      storageTargets: ['postgres'],
      classificationLevel: 'internal',
      safeguards: [],
      appliedAt: new Date('2023-12-01T00:00:00.000Z'),
      appliedBy: 'system',
      ...(overrides.policy || {}),
    },
    archiveHistory: [],
    lastEvaluatedAt: fixedNow,
    ...(overrides as any),
  };
}

describe('RetentionSweeper integration', () => {
  let pool: Pool;
  let repository: DataRetentionRepository;
  let auditLogger: RetentionAuditLogger;
  let scheduler: RetentionScheduler;
  let engine: DataRetentionEngine;
  let policyModel: RetentionPolicyModel;

  beforeEach(() => {
    pool = mockPool();
    repository = new DataRetentionRepository(pool);
    auditLogger = mockAudit();
    scheduler = new RetentionScheduler(5);
    engine = new DataRetentionEngine({
      pool,
      repository,
      scheduler,
      auditLogger,
      runCypher: jest.fn().mockResolvedValue([]),
    });
    policyModel = new RetentionPolicyModel({
      tenants: [
        {
          tenantId: 'tenant-1',
          retentionDays: 45,
          purgeGraceDays: 3,
          updatedAt: new Date('2023-11-01T00:00:00.000Z'),
          updatedBy: 'ops',
        },
      ],
      cases: [
        {
          tenantId: 'tenant-1',
          caseId: 'case-1',
          retentionDays: 25,
          purgeGraceDays: 2,
          updatedAt: new Date('2023-11-02T00:00:00.000Z'),
          updatedBy: 'ops',
          reason: 'Legal team shortened window',
        },
      ],
      evidenceTypes: [
        {
          tenantId: 'tenant-1',
          evidenceType: 'video',
          retentionDays: 10,
          purgeGraceDays: 1,
          updatedAt: new Date('2023-11-03T00:00:00.000Z'),
          updatedBy: 'legal',
          reason: 'Transient captures',
        },
      ],
    });
  });

  afterEach(() => {
    delete process.env.RETENTION_ENFORCEMENT;
    scheduler.stop();
  });

  it('produces deterministic dry-run reports with mixed fixtures', async () => {
    process.env.RETENTION_ENFORCEMENT = '0';
    const sweeper = new RetentionSweeper({
      engine,
      repository,
      policyModel,
      auditLogger,
      clock: () => fixedNow,
    });

    await repository.upsertRecord(
      baseRecord('ds-video-expired', {
        metadata: { evidenceType: 'video' },
      }),
    );

    await repository.upsertRecord(
      baseRecord('ds-case-only', {
        metadata: { evidenceType: 'document' },
      }),
    );

    await repository.upsertRecord(
      baseRecord('ds-legal-hold', {
        legalHold: {
          datasetId: 'ds-legal-hold',
          reason: 'Litigation',
          requestedBy: 'legal',
          createdAt: fixedNow,
          expiresAt: new Date('2024-12-31T00:00:00.000Z'),
          scope: 'full',
        },
      }),
    );

    const report = await sweeper.run({
      dryRun: true,
      runId: 'dry-run-001',
      referenceTime: fixedNow,
    });

    expect(report).toMatchInlineSnapshot(`
{
  "deleted": [],
  "dryRun": true,
  "enforcementEnabled": false,
  "generatedAt": 2024-01-31T00:00:00.000Z,
  "marked": [
    {
      "datasetId": "ds-case-only",
      "executeAfter": 2023-12-28T00:00:00.000Z,
      "policySource": "case-override",
      "reason": "retention-expired",
    },
    {
      "datasetId": "ds-video-expired",
      "executeAfter": 2023-12-12T00:00:00.000Z,
      "policySource": "evidence-type-override",
      "reason": "retention-expired",
    },
  ],
  "runId": "dry-run-001",
  "skipped": [
    {
      "datasetId": "ds-legal-hold",
      "reason": "legal-hold",
    },
  ],
}
`);
  });

  it('marks expired datasets for deletion and then hard-deletes after grace', async () => {
    process.env.RETENTION_ENFORCEMENT = '1';
    const sweeper = new RetentionSweeper({
      engine,
      repository,
      policyModel,
      auditLogger,
      clock: () => fixedNow,
    });

    const record = baseRecord('ds-expired', {
      metadata: { evidenceType: 'video' },
    });
    await repository.upsertRecord(record);

    const firstRun = await sweeper.run({ runId: 'run-mark', referenceTime: fixedNow });
    const stored = repository.getRecord('ds-expired');
    expect(firstRun.marked).toHaveLength(1);
    expect(stored?.pendingDeletion?.runId).toBe('run-mark');
    const auditEvents = (auditLogger.log as jest.Mock).mock.calls.map(
      (call) => call[0].event,
    );
    expect(auditEvents).toContain('deletion.marked');

    const secondReference = new Date(
      (stored?.pendingDeletion?.executeAfter ?? fixedNow).getTime() + 60 * 1000,
    );

    const secondRun = await sweeper.run({
      runId: 'run-delete',
      referenceTime: secondReference,
    });

    const deleteCall = (pool.query as jest.Mock).mock.calls.find(([sql]) =>
      (sql as string).includes('DELETE FROM records'),
    );
    expect(deleteCall?.[0]).toContain('DELETE FROM records');
    expect(secondRun.deleted[0].datasetId).toBe('ds-expired');
    expect(repository.getRecord('ds-expired')).toBeUndefined();
    expect(
      (auditLogger.log as jest.Mock).mock.calls.some(
        (call) => call[0].event === 'deletion.executed',
      ),
    ).toBe(true);
  });

  it('honors legal holds even when enforcement is enabled', async () => {
    process.env.RETENTION_ENFORCEMENT = '1';
    const sweeper = new RetentionSweeper({
      engine,
      repository,
      policyModel,
      auditLogger,
      clock: () => fixedNow,
    });

    await repository.upsertRecord(
      baseRecord('ds-held', {
        legalHold: {
          datasetId: 'ds-held',
          reason: 'Active investigation',
          requestedBy: 'legal',
          createdAt: fixedNow,
          scope: 'full',
        },
      }),
    );

    const report = await sweeper.run({ runId: 'run-hold', referenceTime: fixedNow });
    expect(report.marked).toHaveLength(0);
    expect(report.deleted).toHaveLength(0);
    expect(report.skipped[0]).toEqual({
      datasetId: 'ds-held',
      reason: 'legal-hold',
    });
  });
});
