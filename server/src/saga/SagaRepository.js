"use strict";
/**
 * Saga Repository
 *
 * Persistence layer for saga state management.
 * Supports PostgreSQL storage with optional Redis caching.
 *
 * SOC 2 Controls: CC5.2 (Process Integrity), CC7.1 (System Operations)
 *
 * @module saga/SagaRepository
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SAGA_TABLE_MIGRATION = exports.SagaRepository = void 0;
const uuid_1 = require("uuid");
const data_envelope_js_1 = require("../types/data-envelope.js");
const logger_js_1 = __importDefault(require("../utils/logger.js"));
// ============================================================================
// Helper Functions
// ============================================================================
function createVerdict(result, reason) {
    return {
        verdictId: `verdict-${(0, uuid_1.v4)()}`,
        policyId: 'saga-repository-policy',
        result,
        decidedAt: new Date(),
        reason,
        evaluator: 'SagaRepository',
    };
}
// ============================================================================
// Saga Repository Implementation
// ============================================================================
class SagaRepository {
    pgPool;
    redis;
    config;
    constructor(pgPool, redis, config) {
        this.pgPool = pgPool;
        this.redis = redis || null;
        this.config = {
            tableName: config?.tableName || 'saga_instances',
            cacheTTLSeconds: config?.cacheTTLSeconds || 300,
            enableCache: config?.enableCache ?? true,
        };
        logger_js_1.default.info({ config: this.config }, 'SagaRepository initialized');
    }
    /**
     * Create a new saga instance
     */
    async create(instance) {
        const client = await this.pgPool.connect();
        try {
            const result = await client.query(`
        INSERT INTO ${this.config.tableName} (
          id, saga_type, current_step, status, payload,
          created_at, tenant_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
        `, [
                instance.id,
                instance.sagaType,
                instance.currentStep,
                instance.status,
                JSON.stringify(instance.payload),
                instance.createdAt,
                instance.tenantId,
            ]);
            const created = this.rowToInstance(result.rows[0]);
            // Cache if enabled
            if (this.config.enableCache && this.redis) {
                await this.cacheInstance(created);
            }
            logger_js_1.default.debug({ sagaId: created.id, sagaType: created.sagaType }, 'Saga instance created');
            return (0, data_envelope_js_1.createDataEnvelope)(created, {
                source: 'SagaRepository',
                governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, 'Saga created'),
                classification: data_envelope_js_1.DataClassification.INTERNAL,
            });
        }
        catch (error) {
            logger_js_1.default.error({ error, sagaId: instance.id }, 'Failed to create saga instance');
            throw error;
        }
        finally {
            client.release();
        }
    }
    /**
     * Find saga by ID
     */
    async findById(id) {
        // Try cache first
        if (this.config.enableCache && this.redis) {
            const cached = await this.getCached(id);
            if (cached) {
                return (0, data_envelope_js_1.createDataEnvelope)(cached, {
                    source: 'SagaRepository:cache',
                    governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, 'Saga found in cache'),
                    classification: data_envelope_js_1.DataClassification.INTERNAL,
                });
            }
        }
        const client = await this.pgPool.connect();
        try {
            const result = await client.query(`SELECT * FROM ${this.config.tableName} WHERE id = $1`, [id]);
            if (result.rows.length === 0) {
                return (0, data_envelope_js_1.createDataEnvelope)(null, {
                    source: 'SagaRepository',
                    governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, 'Saga not found'),
                    classification: data_envelope_js_1.DataClassification.INTERNAL,
                });
            }
            const instance = this.rowToInstance(result.rows[0]);
            // Cache for next time
            if (this.config.enableCache && this.redis) {
                await this.cacheInstance(instance);
            }
            return (0, data_envelope_js_1.createDataEnvelope)(instance, {
                source: 'SagaRepository',
                governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, 'Saga found'),
                classification: data_envelope_js_1.DataClassification.INTERNAL,
            });
        }
        finally {
            client.release();
        }
    }
    /**
     * Find sagas by query
     */
    async find(query) {
        const client = await this.pgPool.connect();
        try {
            const conditions = [];
            const params = [];
            let paramIndex = 1;
            if (query.tenantId) {
                conditions.push(`tenant_id = $${paramIndex++}`);
                params.push(query.tenantId);
            }
            if (query.sagaType) {
                conditions.push(`saga_type = $${paramIndex++}`);
                params.push(query.sagaType);
            }
            if (query.status) {
                conditions.push(`status = $${paramIndex++}`);
                params.push(query.status);
            }
            if (query.createdAfter) {
                conditions.push(`created_at >= $${paramIndex++}`);
                params.push(query.createdAfter.toISOString());
            }
            if (query.createdBefore) {
                conditions.push(`created_at <= $${paramIndex++}`);
                params.push(query.createdBefore.toISOString());
            }
            const whereClause = conditions.length > 0
                ? `WHERE ${conditions.join(' AND ')}`
                : '';
            const limitClause = query.limit ? `LIMIT ${query.limit}` : '';
            const offsetClause = query.offset ? `OFFSET ${query.offset}` : '';
            const result = await client.query(`
        SELECT * FROM ${this.config.tableName}
        ${whereClause}
        ORDER BY created_at DESC
        ${limitClause}
        ${offsetClause}
        `, params);
            const instances = result.rows.map((row) => this.rowToInstance(row));
            return (0, data_envelope_js_1.createDataEnvelope)(instances, {
                source: 'SagaRepository',
                governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, `Found ${instances.length} sagas`),
                classification: data_envelope_js_1.DataClassification.INTERNAL,
            });
        }
        finally {
            client.release();
        }
    }
    /**
     * Update saga step
     */
    async updateStep(id, step) {
        const client = await this.pgPool.connect();
        try {
            await client.query(`
        UPDATE ${this.config.tableName}
        SET current_step = $1, updated_at = $2
        WHERE id = $3
        `, [step, new Date().toISOString(), id]);
            // Invalidate cache
            if (this.config.enableCache && this.redis) {
                await this.invalidateCache(id);
            }
            return (0, data_envelope_js_1.createDataEnvelope)(true, {
                source: 'SagaRepository',
                governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, 'Step updated'),
                classification: data_envelope_js_1.DataClassification.INTERNAL,
            });
        }
        catch (error) {
            logger_js_1.default.error({ error, sagaId: id }, 'Failed to update saga step');
            return (0, data_envelope_js_1.createDataEnvelope)(false, {
                source: 'SagaRepository',
                governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.FLAG, 'Step update failed'),
                classification: data_envelope_js_1.DataClassification.INTERNAL,
            });
        }
        finally {
            client.release();
        }
    }
    /**
     * Update saga status
     */
    async updateStatus(id, status, error) {
        const client = await this.pgPool.connect();
        try {
            const completedAt = ['completed', 'compensated', 'failed'].includes(status)
                ? new Date().toISOString()
                : null;
            await client.query(`
        UPDATE ${this.config.tableName}
        SET status = $1, updated_at = $2, completed_at = $3, error = $4
        WHERE id = $5
        `, [status, new Date().toISOString(), completedAt, error || null, id]);
            // Invalidate cache
            if (this.config.enableCache && this.redis) {
                await this.invalidateCache(id);
            }
            return (0, data_envelope_js_1.createDataEnvelope)(true, {
                source: 'SagaRepository',
                governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, 'Status updated'),
                classification: data_envelope_js_1.DataClassification.INTERNAL,
            });
        }
        catch (err) {
            logger_js_1.default.error({ error: err, sagaId: id }, 'Failed to update saga status');
            return (0, data_envelope_js_1.createDataEnvelope)(false, {
                source: 'SagaRepository',
                governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.FLAG, 'Status update failed'),
                classification: data_envelope_js_1.DataClassification.INTERNAL,
            });
        }
        finally {
            client.release();
        }
    }
    /**
     * Store compensation data
     */
    async storeCompensationData(id, stepName, data) {
        const client = await this.pgPool.connect();
        try {
            // Get existing compensation data
            const result = await client.query(`SELECT compensation_data FROM ${this.config.tableName} WHERE id = $1`, [id]);
            const existingData = result.rows[0]?.compensation_data || {};
            existingData[stepName] = data;
            await client.query(`
        UPDATE ${this.config.tableName}
        SET compensation_data = $1, updated_at = $2
        WHERE id = $3
        `, [JSON.stringify(existingData), new Date().toISOString(), id]);
            // Invalidate cache
            if (this.config.enableCache && this.redis) {
                await this.invalidateCache(id);
            }
            return (0, data_envelope_js_1.createDataEnvelope)(true, {
                source: 'SagaRepository',
                governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, 'Compensation data stored'),
                classification: data_envelope_js_1.DataClassification.INTERNAL,
            });
        }
        catch (error) {
            logger_js_1.default.error({ error, sagaId: id }, 'Failed to store compensation data');
            return (0, data_envelope_js_1.createDataEnvelope)(false, {
                source: 'SagaRepository',
                governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.FLAG, 'Compensation data storage failed'),
                classification: data_envelope_js_1.DataClassification.INTERNAL,
            });
        }
        finally {
            client.release();
        }
    }
    /**
     * Find incomplete sagas for recovery
     */
    async findIncomplete(tenantId) {
        return this.find({
            tenantId,
            status: 'running',
        });
    }
    /**
     * Delete old completed sagas
     */
    async cleanupOld(olderThanDays) {
        const client = await this.pgPool.connect();
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
            const result = await client.query(`
        DELETE FROM ${this.config.tableName}
        WHERE status IN ('completed', 'compensated')
        AND completed_at < $1
        `, [cutoffDate.toISOString()]);
            const deletedCount = result.rowCount || 0;
            logger_js_1.default.info({ deletedCount, olderThanDays }, 'Cleaned up old saga instances');
            return (0, data_envelope_js_1.createDataEnvelope)(deletedCount, {
                source: 'SagaRepository',
                governanceVerdict: createVerdict(data_envelope_js_1.GovernanceResult.ALLOW, `Deleted ${deletedCount} old sagas`),
                classification: data_envelope_js_1.DataClassification.INTERNAL,
            });
        }
        finally {
            client.release();
        }
    }
    // --------------------------------------------------------------------------
    // Private Helpers
    // --------------------------------------------------------------------------
    rowToInstance(row) {
        return {
            id: row.id,
            sagaType: row.saga_type,
            currentStep: row.current_step,
            status: row.status,
            payload: typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload,
            compensationData: row.compensation_data
                ? typeof row.compensation_data === 'string'
                    ? JSON.parse(row.compensation_data)
                    : row.compensation_data
                : undefined,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            completedAt: row.completed_at,
            error: row.error,
            tenantId: row.tenant_id,
        };
    }
    async cacheInstance(instance) {
        if (!this.redis)
            return;
        try {
            await this.redis.setex(`saga:${instance.id}`, this.config.cacheTTLSeconds, JSON.stringify(instance));
        }
        catch (error) {
            logger_js_1.default.warn({ error, sagaId: instance.id }, 'Failed to cache saga instance');
        }
    }
    async getCached(id) {
        if (!this.redis)
            return null;
        try {
            const cached = await this.redis.get(`saga:${id}`);
            return cached ? JSON.parse(cached) : null;
        }
        catch (error) {
            logger_js_1.default.warn({ error, sagaId: id }, 'Failed to get cached saga instance');
            return null;
        }
    }
    async invalidateCache(id) {
        if (!this.redis)
            return;
        try {
            await this.redis.del(`saga:${id}`);
        }
        catch (error) {
            logger_js_1.default.warn({ error, sagaId: id }, 'Failed to invalidate saga cache');
        }
    }
}
exports.SagaRepository = SagaRepository;
// ============================================================================
// Database Migration SQL
// ============================================================================
exports.SAGA_TABLE_MIGRATION = `
-- Saga Instances Table
-- Stores the state of distributed transaction sagas

CREATE TABLE IF NOT EXISTS saga_instances (
  id UUID PRIMARY KEY,
  saga_type VARCHAR(100) NOT NULL,
  current_step INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'completed', 'compensating', 'compensated', 'failed')),
  payload JSONB NOT NULL,
  compensation_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  error TEXT,
  tenant_id UUID NOT NULL,

  CONSTRAINT fk_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_saga_instances_tenant_id ON saga_instances(tenant_id);
CREATE INDEX IF NOT EXISTS idx_saga_instances_saga_type ON saga_instances(saga_type);
CREATE INDEX IF NOT EXISTS idx_saga_instances_status ON saga_instances(status);
CREATE INDEX IF NOT EXISTS idx_saga_instances_created_at ON saga_instances(created_at);

-- Partial index for incomplete sagas (for recovery)
CREATE INDEX IF NOT EXISTS idx_saga_instances_incomplete
  ON saga_instances(tenant_id, saga_type)
  WHERE status IN ('running', 'compensating');
`;
exports.default = SagaRepository;
