import pino from 'pino';
import { DataRetentionEngine } from './dataRetentionEngine.js';
import { DataRetentionRepository } from './repository.js';
import { RetentionPolicyModel } from './policyModel.js';
import {
  PendingDeletion,
  ResolvedRetentionPolicy,
  RetentionRecord,
  RetentionSweepReport,
  RetentionSweepRow,
} from './types.js';
import {
  PinoRetentionAuditLogger,
  RetentionAuditLogger,
} from './auditLogger.js';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function isLegalHoldActive(record: RetentionRecord, reference: Date): boolean {
  if (!record.legalHold) {
    return false;
  }

  if (!record.legalHold.expiresAt) {
    return true;
  }

  return record.legalHold.expiresAt > reference;
}

export interface RetentionSweeperOptions {
  engine: DataRetentionEngine;
  repository: DataRetentionRepository;
  policyModel: RetentionPolicyModel;
  auditLogger?: RetentionAuditLogger;
  enforcementEnvVar?: string;
  clock?: () => Date;
}

export class RetentionSweeper {
  private readonly engine: DataRetentionEngine;
  private readonly repository: DataRetentionRepository;
  private readonly policyModel: RetentionPolicyModel;
  private readonly auditLogger: RetentionAuditLogger;
  private readonly enforcementEnvVar: string;
  private readonly clock: () => Date;
  private readonly logger = pino({ name: 'retention-sweeper' });
  private timer?: NodeJS.Timeout;

  constructor(options: RetentionSweeperOptions) {
    this.engine = options.engine;
    this.repository = options.repository;
    this.policyModel = options.policyModel;
    this.auditLogger = options.auditLogger ?? new PinoRetentionAuditLogger();
    this.enforcementEnvVar = options.enforcementEnvVar ?? 'RETENTION_ENFORCEMENT';
    this.clock = options.clock ?? (() => new Date());
  }

  start(intervalMs = 15 * 60 * 1000): void {
    if (this.timer) {
      return;
    }

    this.timer = setInterval(() => {
      void this.run();
    }, intervalMs);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  async run(options: {
    dryRun?: boolean;
    runId?: string;
    referenceTime?: Date;
  } = {}): Promise<RetentionSweepReport> {
    const dryRun = options.dryRun ?? false;
    const referenceTime = options.referenceTime ?? this.clock();
    const runId =
      options.runId ?? `sweep-${referenceTime.toISOString().replace(/[:.]/g, '-')}`;
    const enforcementEnabled = process.env[this.enforcementEnvVar] === '1';
    const allowMutations = enforcementEnabled && !dryRun;

    const report: RetentionSweepReport = {
      runId,
      dryRun,
      enforcementEnabled,
      marked: [],
      deleted: [],
      skipped: [],
      generatedAt: referenceTime,
    };

    const records = this.repository
      .getAllRecords()
      .slice()
      .sort((a, b) => a.metadata.datasetId.localeCompare(b.metadata.datasetId));

    if (!enforcementEnabled && !dryRun) {
      report.skipped.push({
        datasetId: '*',
        reason: 'enforcement-disabled',
      });
      return report;
    }

    for (const record of records) {
      if (isLegalHoldActive(record, referenceTime)) {
        report.skipped.push({
          datasetId: record.metadata.datasetId,
          reason: 'legal-hold',
        });
        continue;
      }

      const resolved = this.policyModel.resolve(record);
      const expiresAt = new Date(
        record.metadata.createdAt.getTime() + resolved.retentionDays * MS_PER_DAY,
      );
      const deleteAfter = new Date(
        expiresAt.getTime() + resolved.purgeGraceDays * MS_PER_DAY,
      );

      if (!record.pendingDeletion && referenceTime >= expiresAt) {
        const pending: PendingDeletion = {
          runId,
          markedAt: referenceTime,
          executeAfter: deleteAfter,
          reason: 'retention-expired',
          resolvedPolicy: resolved,
        };

        const row: RetentionSweepRow = {
          datasetId: record.metadata.datasetId,
          policySource: resolved.source,
          executeAfter: pending.executeAfter,
          reason: pending.reason,
        };

        if (allowMutations) {
          await this.repository.markPendingDeletion(
            record.metadata.datasetId,
            pending,
          );
          await this.auditLogger.log({
            event: 'deletion.marked',
            datasetId: record.metadata.datasetId,
            policyId: resolved.appliedPolicyId ?? record.policy.templateId,
            severity: 'info',
            message: 'Dataset marked for deletion after grace period',
            metadata: {
              runId,
              executeAfter: pending.executeAfter,
              policySource: resolved.source,
              appliedLayers: resolved.appliedLayers,
            },
            timestamp: referenceTime,
          });
        }

        report.marked.push(row);
        continue;
      }

      if (
        record.pendingDeletion &&
        referenceTime >= record.pendingDeletion.executeAfter
      ) {
        const row: RetentionSweepRow = {
          datasetId: record.metadata.datasetId,
          policySource: record.pendingDeletion.resolvedPolicy.source,
          executeAfter: record.pendingDeletion.executeAfter,
          reason: record.pendingDeletion.reason,
        };

        if (allowMutations) {
          await this.engine.purgeDataset(record.metadata.datasetId, 'scheduler', {
            runId,
            resolvedPolicy: record.pendingDeletion.resolvedPolicy,
          });
          await this.repository.deleteRecord(record.metadata.datasetId);
          await this.auditLogger.log({
            event: 'deletion.executed',
            datasetId: record.metadata.datasetId,
            policyId:
              record.pendingDeletion.resolvedPolicy.appliedPolicyId ??
              record.policy.templateId,
            severity: 'info',
            message: 'Dataset hard-deleted by retention sweeper',
            metadata: {
              runId,
              policySource: record.pendingDeletion.resolvedPolicy.source,
              appliedLayers:
                record.pendingDeletion.resolvedPolicy.appliedLayers ?? [],
            },
            timestamp: referenceTime,
          });
        }

        report.deleted.push(row);
      }
    }

    return report;
  }
}
