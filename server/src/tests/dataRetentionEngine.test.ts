import { Pool } from 'pg';
import { DataRetentionEngine } from '../governance/retention/dataRetentionEngine.js';
import { RetentionScheduler } from '../governance/retention/scheduler.js';
import { DatasetMetadata, LegalHold } from '../governance/retention/types.js';
import { RetentionAuditLogger } from '../governance/retention/auditLogger.js';

function createMockPool() {
  return {
    query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
  } as unknown as Pool;
}

function createAuditLogger(): RetentionAuditLogger {
  return {
    log: jest.fn().mockResolvedValue(undefined),
  };
}

function createMetadata(
  overrides: Partial<DatasetMetadata> = {},
): DatasetMetadata {
  return {
    datasetId:
      overrides.datasetId ?? `dataset-${Math.random().toString(36).slice(2)}`,
    name: overrides.name ?? 'Test Dataset',
    description: overrides.description,
    dataType: overrides.dataType ?? 'communications',
    containsPersonalData: overrides.containsPersonalData ?? true,
    containsFinancialData: overrides.containsFinancialData ?? false,
    containsHealthData: overrides.containsHealthData ?? false,
    jurisdictions: overrides.jurisdictions ?? ['us'],
    tags: overrides.tags ?? [
      'neo4j:label:TestLabel',
      'postgres:table:test_table',
    ],
    storageSystems: overrides.storageSystems ?? ['neo4j', 'postgres'],
    owner: overrides.owner ?? 'tester@intelgraph.dev',
    createdAt: overrides.createdAt ?? new Date(),
    recordCount: overrides.recordCount,
  };
}

describe('DataRetentionEngine', () => {
  it('applies policy templates automatically during registration', async () => {
    const pool = createMockPool();
    const scheduler = new RetentionScheduler(1000);
    const auditLogger = createAuditLogger();
    const runCypher = jest.fn().mockResolvedValue([]);
    const engine = new DataRetentionEngine({
      pool,
      scheduler,
      auditLogger,
      runCypher,
    });

    const metadata = createMetadata();
    const record = await engine.registerDataset(metadata, 'tester');

    expect(record.policy.templateId).toBe('pii-365d');
    expect(record.policy.retentionDays).toBe(365);
    expect((auditLogger.log as jest.Mock).mock.calls[0][0].event).toBe(
      'policy.applied',
    );

    scheduler.stop();
  });

  it('prevents purges when a legal hold is active', async () => {
    const pool = createMockPool();
    const scheduler = new RetentionScheduler(1000);
    const auditLogger = createAuditLogger();
    const runCypher = jest.fn().mockResolvedValue([]);
    const engine = new DataRetentionEngine({
      pool,
      scheduler,
      auditLogger,
      runCypher,
    });

    const metadata = createMetadata({ datasetId: 'legal-hold-test' });
    await engine.registerDataset(metadata, 'tester');

    const legalHold: LegalHold = {
      datasetId: 'legal-hold-test',
      reason: 'Pending litigation',
      requestedBy: 'legal@intelgraph.dev',
      createdAt: new Date(),
      scope: 'full',
    };

    await engine.applyLegalHold('legal-hold-test', legalHold);
    await engine.purgeDataset('legal-hold-test', 'manual');

    expect(auditLogger.log as jest.Mock).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'purge.skipped' }),
    );

    scheduler.stop();
  });

  it('executes scheduled purges across storage backends', async () => {
    const pool = createMockPool();
    const scheduler = new RetentionScheduler(5);
    const auditLogger = createAuditLogger();
    const runCypher = jest.fn().mockResolvedValue([]);
    const engine = new DataRetentionEngine({
      pool,
      scheduler,
      auditLogger,
      runCypher,
    });

    const metadata = createMetadata({
      datasetId: 'scheduled-dataset',
      dataType: 'analytics',
      containsPersonalData: false,
      tags: [
        'neo4j:label:RetentionNode',
        'postgres:table:retention_table',
        'public-intel',
      ],
      storageSystems: ['neo4j', 'postgres'],
    });

    await engine.registerDataset(metadata, 'scheduler');
    await engine.schedulePurge('scheduled-dataset', 10);

    await scheduler.runDueTasks(new Date(Date.now() + 20));

    expect(pool.query as unknown as jest.Mock).toHaveBeenCalledWith(
      expect.stringContaining('DELETE FROM retention_table'),
      ['scheduled-dataset'],
    );
    expect(runCypher).toHaveBeenCalled();

    scheduler.stop();
  });

  it('generates compliance reports with legal hold visibility', async () => {
    const pool = createMockPool();
    const scheduler = new RetentionScheduler(1000);
    const auditLogger = createAuditLogger();
    const runCypher = jest.fn().mockResolvedValue([]);
    const engine = new DataRetentionEngine({
      pool,
      scheduler,
      auditLogger,
      runCypher,
    });

    const metadata = createMetadata({ datasetId: 'report-dataset' });
    await engine.registerDataset(metadata, 'compliance');

    await engine.applyLegalHold('report-dataset', {
      datasetId: 'report-dataset',
      reason: 'Regulatory request',
      requestedBy: 'compliance@intelgraph.dev',
      createdAt: new Date(),
      scope: 'full',
    });

    const report = engine.generateComplianceReport(
      new Date(Date.now() - 1000),
      new Date(Date.now() + 1000),
    );

    expect(report.totalDatasets).toBeGreaterThanOrEqual(1);
    expect(report.datasetsOnLegalHold).toBeGreaterThanOrEqual(1);
    expect(report.details[0].policyId).toBeDefined();

    scheduler.stop();
  });

  it('archives datasets and records audit events', async () => {
    const pool = createMockPool();
    const scheduler = new RetentionScheduler(1000);
    const auditLogger = createAuditLogger();
    const runCypher = jest.fn().mockResolvedValue([]);
    const engine = new DataRetentionEngine({
      pool,
      scheduler,
      auditLogger,
      runCypher,
    });

    const metadata = createMetadata({ datasetId: 'archive-dataset' });
    await engine.registerDataset(metadata, 'archiver');

    await engine.archiveDataset(
      'archive-dataset',
      'archiver',
      'glacier://intelgraph/archive-dataset',
    );

    expect(pool.query as unknown as jest.Mock).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE data_retention_records'),
      expect.any(Array),
    );
    expect(runCypher).toHaveBeenCalledWith(
      expect.stringContaining('MATCH (n { datasetId: $datasetId })'),
      expect.objectContaining({ datasetId: 'archive-dataset' }),
    );
    expect(auditLogger.log as jest.Mock).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'archive.completed' }),
    );

    scheduler.stop();
  });
});
