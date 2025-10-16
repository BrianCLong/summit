import { Pool } from 'pg';
import pino from 'pino';
import { runCypher } from '../../graph/neo4j.js';
import { DataRetentionRepository } from './repository.js';
import { RetentionScheduler } from './scheduler.js';
import {
  AppliedRetentionPolicy,
  ArchivalWorkflow,
  ClassificationResult,
  DatasetMetadata,
  LegalHold,
  RetentionRecord,
  RetentionSchedule,
} from './types.js';
import {
  POLICY_TEMPLATE_LIBRARY,
  selectTemplateForDataset,
  getPolicyTemplateById,
  resolveClassification,
} from './policyTemplates.js';
import {
  PinoRetentionAuditLogger,
  RetentionAuditLogger,
} from './auditLogger.js';

export interface DataRetentionEngineOptions {
  pool: Pool;
  auditLogger?: RetentionAuditLogger;
  scheduler?: RetentionScheduler;
  repository?: DataRetentionRepository;
  runCypher?: (cypher: string, params?: Record<string, any>) => Promise<any>;
}

interface ComplianceReportRow {
  datasetId: string;
  datasetName: string;
  classification: string;
  policyId: string;
  retentionDays: number;
  onLegalHold: boolean;
  nextPurge?: Date;
  lastRun?: Date;
  archivedCount: number;
}

export interface ComplianceReportSummary {
  generatedAt: Date;
  totalDatasets: number;
  datasetsOnLegalHold: number;
  overdueDatasets: number;
  archivedInPeriod: number;
  details: ComplianceReportRow[];
}

export class DataRetentionEngine {
  private readonly logger = pino({ name: 'data-retention-engine' });
  private readonly pool: Pool;
  private readonly repository: DataRetentionRepository;
  private readonly scheduler: RetentionScheduler;
  private readonly auditLogger: RetentionAuditLogger;
  private readonly cypherRunner: (
    cypher: string,
    params?: Record<string, any>,
  ) => Promise<any>;

  constructor(options: DataRetentionEngineOptions) {
    this.pool = options.pool;
    this.repository =
      options.repository ?? new DataRetentionRepository(options.pool);
    this.scheduler = options.scheduler ?? new RetentionScheduler();
    this.auditLogger = options.auditLogger ?? new PinoRetentionAuditLogger();
    this.cypherRunner = options.runCypher ?? runCypher;
  }

  listPolicyTemplates() {
    return POLICY_TEMPLATE_LIBRARY;
  }

  getRecord(datasetId: string): RetentionRecord | undefined {
    return this.repository.getRecord(datasetId);
  }

  classifyDataset(metadata: DatasetMetadata): ClassificationResult {
    const { level, rationale } = resolveClassification(metadata);
    const templateSelection = selectTemplateForDataset(metadata);
    return {
      level,
      recommendedTemplateId: templateSelection.template.id,
      rationale,
    };
  }

  async registerDataset(
    metadata: DatasetMetadata,
    appliedBy: string,
  ): Promise<RetentionRecord> {
    const { template, rationale } = selectTemplateForDataset(metadata);
    const policy: AppliedRetentionPolicy = {
      datasetId: metadata.datasetId,
      templateId: template.id,
      retentionDays: template.retentionDays,
      purgeGraceDays: template.purgeGraceDays,
      legalHoldAllowed: template.legalHoldAllowed,
      storageTargets: template.storageTargets,
      classificationLevel: template.classificationLevel,
      safeguards: template.defaultSafeguards,
      appliedAt: new Date(),
      appliedBy,
    };

    const record: RetentionRecord = {
      metadata,
      policy,
      legalHold: undefined,
      schedule: undefined,
      archiveHistory: [],
      lastEvaluatedAt: new Date(),
    };

    await this.repository.upsertRecord(record);

    await this.auditLogger.log({
      event: 'policy.applied',
      datasetId: metadata.datasetId,
      policyId: policy.templateId,
      severity: 'info',
      message: `Applied template ${template.id} (${template.name})`,
      metadata: { rationale, appliedBy },
      timestamp: new Date(),
    });

    return record;
  }

  async applyCustomPolicy(
    datasetId: string,
    overrides: Partial<AppliedRetentionPolicy>,
  ): Promise<AppliedRetentionPolicy> {
    const record = this.repository.getRecord(datasetId);
    if (!record) {
      throw new Error(`Unknown dataset ${datasetId}`);
    }

    const template = getPolicyTemplateById(
      overrides.templateId ?? record.policy.templateId,
    );
    if (!template) {
      throw new Error(`Unknown retention template ${overrides.templateId}`);
    }

    const policy: AppliedRetentionPolicy = {
      ...record.policy,
      ...overrides,
      templateId: template.id,
      retentionDays: overrides.retentionDays ?? template.retentionDays,
      purgeGraceDays: overrides.purgeGraceDays ?? template.purgeGraceDays,
      legalHoldAllowed: overrides.legalHoldAllowed ?? template.legalHoldAllowed,
      storageTargets: overrides.storageTargets ?? template.storageTargets,
      classificationLevel:
        overrides.classificationLevel ?? template.classificationLevel,
      safeguards: overrides.safeguards ?? template.defaultSafeguards,
      appliedAt: new Date(),
      appliedBy: overrides.appliedBy ?? record.policy.appliedBy,
    };

    await this.repository.updatePolicy(datasetId, policy);

    await this.auditLogger.log({
      event: 'policy.updated',
      datasetId,
      policyId: policy.templateId,
      severity: 'info',
      message: 'Retention policy updated',
      metadata: { overrides },
      timestamp: new Date(),
    });

    return policy;
  }

  async schedulePurge(
    datasetId: string,
    intervalMs: number,
  ): Promise<RetentionSchedule> {
    const record = this.repository.getRecord(datasetId);
    if (!record) {
      throw new Error(`Unknown dataset ${datasetId}`);
    }

    const nextRun = new Date(Date.now() + intervalMs);
    const schedule: RetentionSchedule = {
      datasetId,
      intervalMs,
      nextRun,
      lastRun: record.schedule?.lastRun,
      policyId: record.policy.templateId,
    };

    this.scheduler.register(schedule, async () => {
      await this.purgeDataset(datasetId, 'scheduler');
      const updated = this.scheduler.getSchedule(datasetId);
      if (updated) {
        await this.repository.setSchedule(datasetId, updated);
      }
    });

    this.scheduler.start();
    await this.repository.setSchedule(datasetId, schedule);

    await this.auditLogger.log({
      event: 'purge.scheduled',
      datasetId,
      policyId: record.policy.templateId,
      severity: 'info',
      message: `Scheduled purge every ${intervalMs / 1000} seconds`,
      metadata: { intervalMs },
      timestamp: new Date(),
    });

    return schedule;
  }

  async purgeDataset(
    datasetId: string,
    trigger: 'manual' | 'scheduler' | 'compliance' = 'manual',
  ): Promise<void> {
    const record = this.repository.getRecord(datasetId);
    if (!record) {
      throw new Error(`Unknown dataset ${datasetId}`);
    }

    if (record.legalHold) {
      const expiresAt = record.legalHold.expiresAt;
      if (!expiresAt || expiresAt > new Date()) {
        await this.auditLogger.log({
          event: 'purge.skipped',
          datasetId,
          policyId: record.policy.templateId,
          severity: 'warn',
          message: 'Purge skipped due to active legal hold',
          metadata: { trigger, legalHold: record.legalHold },
          timestamp: new Date(),
        });
        return;
      }

      await this.repository.setLegalHold(datasetId, undefined);
    }

    await this.performPostgresPurge(record);
    await this.performNeo4jPurge(record);

    await this.auditLogger.log({
      event: 'purge.executed',
      datasetId,
      policyId: record.policy.templateId,
      severity: 'info',
      message: `Dataset purged via ${trigger}`,
      metadata: { trigger },
      timestamp: new Date(),
    });
  }

  async applyLegalHold(datasetId: string, legalHold: LegalHold): Promise<void> {
    const record = this.repository.getRecord(datasetId);
    if (!record) {
      throw new Error(`Unknown dataset ${datasetId}`);
    }

    if (!record.policy.legalHoldAllowed && legalHold.scope === 'full') {
      throw new Error('Policy does not allow full legal holds');
    }

    await this.repository.setLegalHold(datasetId, legalHold);

    await this.auditLogger.log({
      event: 'legal-hold.applied',
      datasetId,
      policyId: record.policy.templateId,
      severity: 'warn',
      message: 'Legal hold applied to dataset',
      metadata: { legalHold },
      timestamp: new Date(),
    });
  }

  async releaseLegalHold(datasetId: string, releasedBy: string): Promise<void> {
    const record = this.repository.getRecord(datasetId);
    if (!record?.legalHold) {
      return;
    }

    await this.repository.setLegalHold(datasetId, undefined);

    await this.auditLogger.log({
      event: 'legal-hold.released',
      datasetId,
      policyId: record.policy.templateId,
      severity: 'info',
      message: 'Legal hold released',
      metadata: { releasedBy },
      timestamp: new Date(),
    });
  }

  async archiveDataset(
    datasetId: string,
    initiatedBy: string,
    targetLocation: string,
  ): Promise<ArchivalWorkflow> {
    const record = this.repository.getRecord(datasetId);
    if (!record) {
      throw new Error(`Unknown dataset ${datasetId}`);
    }

    const workflow: ArchivalWorkflow = {
      datasetId,
      initiatedBy,
      initiatedAt: new Date(),
      targetLocation,
      status: 'in-progress',
    };

    await this.repository.appendArchivalEvent(datasetId, workflow);

    try {
      await this.performArchival(record, targetLocation);
      workflow.status = 'completed';
    } catch (error) {
      workflow.status = 'failed';
      workflow.details = { error: (error as Error).message };
      throw error;
    } finally {
      await this.repository.appendArchivalEvent(datasetId, workflow);
    }

    await this.auditLogger.log({
      event: 'archive.completed',
      datasetId,
      policyId: record.policy.templateId,
      severity: workflow.status === 'completed' ? 'info' : 'error',
      message: `Archival workflow ${workflow.status}`,
      metadata: { targetLocation, initiatedBy },
      timestamp: new Date(),
    });

    return workflow;
  }

  generateComplianceReport(start: Date, end: Date): ComplianceReportSummary {
    const records = this.repository.getAllRecords();
    const rows: ComplianceReportRow[] = records.map((record) => {
      const schedule = record.schedule;
      const archivedCount = record.archiveHistory.filter(
        (entry) => entry.initiatedAt >= start && entry.initiatedAt <= end,
      ).length;
      return {
        datasetId: record.metadata.datasetId,
        datasetName: record.metadata.name,
        classification: record.policy.classificationLevel,
        policyId: record.policy.templateId,
        retentionDays: record.policy.retentionDays,
        onLegalHold: Boolean(
          record.legalHold &&
            (!record.legalHold.expiresAt ||
              record.legalHold.expiresAt > new Date()),
        ),
        nextPurge: schedule?.nextRun,
        lastRun: schedule?.lastRun,
        archivedCount,
      };
    });

    const overdueDatasets = rows.filter((row) => {
      if (!row.nextPurge) {
        return false;
      }
      return row.nextPurge < new Date();
    }).length;

    const report: ComplianceReportSummary = {
      generatedAt: new Date(),
      totalDatasets: rows.length,
      datasetsOnLegalHold: rows.filter((row) => row.onLegalHold).length,
      overdueDatasets,
      archivedInPeriod: rows.reduce(
        (count, row) => count + row.archivedCount,
        0,
      ),
      details: rows,
    };

    return report;
  }

  private async performPostgresPurge(record: RetentionRecord): Promise<void> {
    if (!record.policy.storageTargets.includes('postgres')) {
      return;
    }

    const tableTags = record.metadata.tags.filter((tag) =>
      tag.startsWith('postgres:table:'),
    );
    const tables = tableTags
      .map((tag) => tag.replace('postgres:table:', ''))
      .filter((table) => /^[a-zA-Z0-9_]+$/.test(table));

    for (const table of tables) {
      try {
        await this.pool.query(
          `DELETE FROM ${table} WHERE dataset_id = $1 AND (retention_expires_at IS NULL OR retention_expires_at < now())`,
          [record.metadata.datasetId],
        );
      } catch (error: any) {
        if (error.code === '42P01') {
          this.logger.warn(
            { table },
            'Postgres purge skipped because table is missing.',
          );
          continue;
        }
        throw error;
      }
    }
  }

  private async performNeo4jPurge(record: RetentionRecord): Promise<void> {
    if (!record.policy.storageTargets.includes('neo4j')) {
      return;
    }

    const labelTags = record.metadata.tags.filter((tag) =>
      tag.startsWith('neo4j:label:'),
    );
    const labels = labelTags
      .map((tag) => tag.replace('neo4j:label:', ''))
      .filter((label) => /^[A-Za-z0-9_]+$/.test(label));

    for (const label of labels) {
      await this.cypherRunner(
        `MATCH (n:${label} { datasetId: $datasetId })
         WHERE coalesce(n.retentionExpiresAt, datetime()) <= datetime()
         DETACH DELETE n`,
        { datasetId: record.metadata.datasetId },
      );
    }
  }

  private async performArchival(
    record: RetentionRecord,
    targetLocation: string,
  ): Promise<void> {
    if (record.policy.storageTargets.includes('postgres')) {
      try {
        await this.pool.query(
          `UPDATE data_retention_records
           SET archive_history = coalesce(archive_history, '[]'::jsonb) || $2::jsonb
           WHERE dataset_id = $1`,
          [
            record.metadata.datasetId,
            JSON.stringify({
              targetLocation,
              archivedAt: new Date().toISOString(),
            }),
          ],
        );
      } catch (error: any) {
        if (error.code !== '42P01') {
          throw error;
        }
      }
    }

    if (record.policy.storageTargets.includes('neo4j')) {
      await this.cypherRunner(
        `MATCH (n { datasetId: $datasetId })
         SET n.storageTier = 'archive', n.archivedAt = datetime()`,
        { datasetId: record.metadata.datasetId },
      );
    }
  }
}
