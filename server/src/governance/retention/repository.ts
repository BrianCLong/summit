import { Pool } from 'pg';
import pino from 'pino';
import {
  AppliedRetentionPolicy,
  ArchivalWorkflow,
  DatasetMetadata,
  LegalHold,
  PendingDeletion,
  PurgeManifest,
  RetentionRecord,
  RetentionSchedule,
} from './types.js';

export class DataRetentionRepository {
  private readonly pool: Pool;
  private readonly logger = (pino as any)({ name: 'data-retention-repository' });
  private readonly records = new Map<string, RetentionRecord>();
  private readonly purgeManifests = new Map<string, PurgeManifest[]>();

  constructor(pool: Pool) {
    this.pool = pool;
  }

  getAllRecords(): RetentionRecord[] {
    return Array.from(this.records.values());
  }

  getRecord(datasetId: string): RetentionRecord | undefined {
    return this.records.get(datasetId);
  }

  async upsertRecord(record: RetentionRecord): Promise<void> {
    this.records.set(record.metadata.datasetId, record);
    await this.persistRecord(record);
  }

  async updatePolicy(
    datasetId: string,
    policy: AppliedRetentionPolicy,
  ): Promise<void> {
    const record = this.records.get(datasetId);
    if (!record) {
      throw new Error(`Unknown dataset ${datasetId}`);
    }

    record.policy = policy;
    record.lastEvaluatedAt = new Date();
    await this.persistRecord(record);
  }

  async updateMetadata(
    datasetId: string,
    metadata: DatasetMetadata,
  ): Promise<void> {
    const record = this.records.get(datasetId);
    if (!record) {
      throw new Error(`Unknown dataset ${datasetId}`);
    }

    record.metadata = metadata;
    record.lastEvaluatedAt = new Date();
    await this.persistRecord(record);
  }

  async setLegalHold(datasetId: string, legalHold?: LegalHold): Promise<void> {
    const record = this.records.get(datasetId);
    if (!record) {
      throw new Error(`Unknown dataset ${datasetId}`);
    }

    record.legalHold = legalHold;
    record.lastEvaluatedAt = new Date();
    await this.persistRecord(record);
  }

  async setSchedule(
    datasetId: string,
    schedule?: RetentionSchedule,
  ): Promise<void> {
    const record = this.records.get(datasetId);
    if (!record) {
      throw new Error(`Unknown dataset ${datasetId}`);
    }

    record.schedule = schedule;
    await this.persistRecord(record);
  }

  async appendArchivalEvent(
    datasetId: string,
    workflow: ArchivalWorkflow,
  ): Promise<void> {
    const record = this.records.get(datasetId);
    if (!record) {
      throw new Error(`Unknown dataset ${datasetId}`);
    }

    record.archiveHistory.push(workflow);
    await this.persistRecord(record);
  }

  async markPendingDeletion(
    datasetId: string,
    pendingDeletion: PendingDeletion,
  ): Promise<void> {
    const record = this.records.get(datasetId);
    if (!record) {
      throw new Error(`Unknown dataset ${datasetId}`);
    }

    record.pendingDeletion = pendingDeletion;
    await this.persistRecord(record);
  }

  async clearPendingDeletion(datasetId: string): Promise<void> {
    const record = this.records.get(datasetId);
    if (!record) {
      throw new Error(`Unknown dataset ${datasetId}`);
    }

    record.pendingDeletion = undefined;
    await this.persistRecord(record);
  }

  async deleteRecord(datasetId: string): Promise<void> {
    this.records.delete(datasetId);
    try {
      await this.pool.query(
        'DELETE FROM data_retention_records WHERE dataset_id = $1',
        [datasetId],
      );
    } catch (error: any) {
      if (this.isIgnorablePersistenceError(error)) {
        return;
      }
      this.logger.error({ error }, 'Failed to delete data retention record.');
      throw error;
    }
  }

  async storePurgeManifest(
    tenantId: string,
    manifest: PurgeManifest,
  ): Promise<void> {
    const entries = this.purgeManifests.get(tenantId) ?? [];
    entries.push(manifest);
    this.purgeManifests.set(tenantId, entries);

    try {
      await this.pool.query(
        `INSERT INTO rtbf_purge_manifests (
          id,
          tenant_id,
          request_id,
          manifest,
          signature,
          signature_algorithm,
          created_at
        ) VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7)`,
        [
          manifest.id,
          tenantId,
          manifest.requestId,
          JSON.stringify(manifest),
          manifest.signature,
          manifest.signatureAlgorithm,
          manifest.createdAt,
        ],
      );
    } catch (error: any) {
      if (this.isIgnorablePersistenceError(error)) {
        this.logger.debug(
          { error: error.message },
          'Falling back to in-memory purge manifest storage.',
        );
        return;
      }
      this.logger.error({ error }, 'Failed to persist purge manifest.');
      throw error;
    }
  }

  getPurgeManifests(tenantId: string): PurgeManifest[] {
    return this.purgeManifests.get(tenantId) ?? [];
  }

  private async persistRecord(record: RetentionRecord): Promise<void> {
    try {
      await this.pool.query(
        `INSERT INTO data_retention_records (
          dataset_id,
          metadata,
          policy,
          legal_hold,
          schedule,
          archive_history,
          pending_deletion,
          last_evaluated_at,
          updated_at
        ) VALUES ($1, $2::jsonb, $3::jsonb, $4::jsonb, $5::jsonb, $6::jsonb, $7::jsonb, $8, now())
        ON CONFLICT (dataset_id)
        DO UPDATE SET
          metadata = EXCLUDED.metadata,
          policy = EXCLUDED.policy,
          legal_hold = EXCLUDED.legal_hold,
          schedule = EXCLUDED.schedule,
          archive_history = EXCLUDED.archive_history,
          pending_deletion = EXCLUDED.pending_deletion,
          last_evaluated_at = EXCLUDED.last_evaluated_at,
          updated_at = now()`,
        [
          record.metadata.datasetId,
          JSON.stringify(record.metadata),
          JSON.stringify(record.policy),
          record.legalHold ? JSON.stringify(record.legalHold) : null,
          record.schedule ? JSON.stringify(record.schedule) : null,
          JSON.stringify(record.archiveHistory),
          record.pendingDeletion
            ? JSON.stringify(record.pendingDeletion)
            : null,
          record.lastEvaluatedAt,
        ],
      );
    } catch (error: any) {
      if (this.isIgnorablePersistenceError(error)) {
        this.logger.debug(
          { error: error.message },
          'Falling back to in-memory retention repository.',
        );
        return;
      }

      this.logger.error({ error }, 'Failed to persist data retention record.');
      throw error;
    }
  }

  private isIgnorablePersistenceError(error: any): boolean {
    if (!error) {
      return false;
    }

    if (error.code === '42P01') {
      return true;
    }

    if (error.code === '42703') {
      return true;
    }

    if (
      typeof error.message === 'string' &&
      error.message.includes('does not exist')
    ) {
      return true;
    }

    return false;
  }
}
