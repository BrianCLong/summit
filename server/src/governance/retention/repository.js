"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataRetentionRepository = void 0;
const pino_1 = __importDefault(require("pino"));
class DataRetentionRepository {
    pool;
    logger = pino_1.default({ name: 'data-retention-repository' });
    records = new Map();
    constructor(pool) {
        this.pool = pool;
    }
    getAllRecords() {
        return Array.from(this.records.values());
    }
    getRecord(datasetId) {
        return this.records.get(datasetId);
    }
    async upsertRecord(record) {
        this.records.set(record.metadata.datasetId, record);
        await this.persistRecord(record);
    }
    async updatePolicy(datasetId, policy) {
        const record = this.records.get(datasetId);
        if (!record) {
            throw new Error(`Unknown dataset ${datasetId}`);
        }
        record.policy = policy;
        record.lastEvaluatedAt = new Date();
        await this.persistRecord(record);
    }
    async updateMetadata(datasetId, metadata) {
        const record = this.records.get(datasetId);
        if (!record) {
            throw new Error(`Unknown dataset ${datasetId}`);
        }
        record.metadata = metadata;
        record.lastEvaluatedAt = new Date();
        await this.persistRecord(record);
    }
    async setLegalHold(datasetId, legalHold) {
        const record = this.records.get(datasetId);
        if (!record) {
            throw new Error(`Unknown dataset ${datasetId}`);
        }
        record.legalHold = legalHold;
        record.lastEvaluatedAt = new Date();
        await this.persistRecord(record);
    }
    async setSchedule(datasetId, schedule) {
        const record = this.records.get(datasetId);
        if (!record) {
            throw new Error(`Unknown dataset ${datasetId}`);
        }
        record.schedule = schedule;
        await this.persistRecord(record);
    }
    async appendArchivalEvent(datasetId, workflow) {
        const record = this.records.get(datasetId);
        if (!record) {
            throw new Error(`Unknown dataset ${datasetId}`);
        }
        record.archiveHistory.push(workflow);
        await this.persistRecord(record);
    }
    async markPendingDeletion(datasetId, pendingDeletion) {
        const record = this.records.get(datasetId);
        if (!record) {
            throw new Error(`Unknown dataset ${datasetId}`);
        }
        record.pendingDeletion = pendingDeletion;
        await this.persistRecord(record);
    }
    async clearPendingDeletion(datasetId) {
        const record = this.records.get(datasetId);
        if (!record) {
            throw new Error(`Unknown dataset ${datasetId}`);
        }
        record.pendingDeletion = undefined;
        await this.persistRecord(record);
    }
    async deleteRecord(datasetId) {
        this.records.delete(datasetId);
        try {
            await this.pool.query('DELETE FROM data_retention_records WHERE dataset_id = $1', [datasetId]);
        }
        catch (error) {
            if (this.isIgnorablePersistenceError(error)) {
                return;
            }
            this.logger.error({ error }, 'Failed to delete data retention record.');
            throw error;
        }
    }
    async persistRecord(record) {
        try {
            await this.pool.query(`INSERT INTO data_retention_records (
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
          updated_at = now()`, [
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
            ]);
        }
        catch (error) {
            if (this.isIgnorablePersistenceError(error)) {
                this.logger.debug({ error: error.message }, 'Falling back to in-memory retention repository.');
                return;
            }
            this.logger.error({ error }, 'Failed to persist data retention record.');
            throw error;
        }
    }
    isIgnorablePersistenceError(error) {
        if (!error) {
            return false;
        }
        if (error.code === '42P01') {
            return true;
        }
        if (error.code === '42703') {
            return true;
        }
        if (typeof error.message === 'string' &&
            error.message.includes('does not exist')) {
            return true;
        }
        return false;
    }
}
exports.DataRetentionRepository = DataRetentionRepository;
