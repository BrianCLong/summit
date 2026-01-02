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

import { v4 as uuidv4 } from 'uuid';
import { Pool as PgPool } from 'pg';
import { Redis } from 'ioredis';
import {
  DataEnvelope,
  GovernanceVerdict,
  GovernanceResult,
  DataClassification,
  createDataEnvelope,
} from '../types/data-envelope.js';
import logger from '../utils/logger.js';

// ============================================================================
// Types
// ============================================================================

export interface SagaInstance {
  id: string;
  sagaType: string;
  currentStep: number;
  status: string;
  payload: Record<string, unknown>;
  compensationData?: Record<string, unknown>;
  createdAt: string;
  updatedAt?: string;
  completedAt?: string;
  error?: string;
  tenantId: string;
}

export interface SagaQuery {
  tenantId?: string;
  sagaType?: string;
  status?: string;
  createdAfter?: Date;
  createdBefore?: Date;
  limit?: number;
  offset?: number;
}

export interface SagaRepositoryConfig {
  /** Table name for saga instances */
  tableName: string;
  /** Redis cache TTL in seconds */
  cacheTTLSeconds: number;
  /** Enable Redis caching */
  enableCache: boolean;
}

// ============================================================================
// Helper Functions
// ============================================================================

function createVerdict(result: GovernanceResult, reason?: string): GovernanceVerdict {
  return {
    verdictId: `verdict-${uuidv4()}`,
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

export class SagaRepository {
  private pgPool: PgPool;
  private redis: Redis | null;
  private config: SagaRepositoryConfig;

  constructor(
    pgPool: PgPool,
    redis?: Redis,
    config?: Partial<SagaRepositoryConfig>
  ) {
    this.pgPool = pgPool;
    this.redis = redis || null;
    this.config = {
      tableName: config?.tableName || 'saga_instances',
      cacheTTLSeconds: config?.cacheTTLSeconds || 300,
      enableCache: config?.enableCache ?? true,
    };

    logger.info({ config: this.config }, 'SagaRepository initialized');
  }

  /**
   * Create a new saga instance
   */
  async create(instance: SagaInstance): Promise<DataEnvelope<SagaInstance>> {
    const client = await this.pgPool.connect();

    try {
      const result = await client.query(
        `
        INSERT INTO ${this.config.tableName} (
          id, saga_type, current_step, status, payload,
          created_at, tenant_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
        `,
        [
          instance.id,
          instance.sagaType,
          instance.currentStep,
          instance.status,
          JSON.stringify(instance.payload),
          instance.createdAt,
          instance.tenantId,
        ]
      );

      const created = this.rowToInstance(result.rows[0]);

      // Cache if enabled
      if (this.config.enableCache && this.redis) {
        await this.cacheInstance(created);
      }

      logger.debug(
        { sagaId: created.id, sagaType: created.sagaType },
        'Saga instance created'
      );

      return createDataEnvelope(created, {
        source: 'SagaRepository',
        governanceVerdict: createVerdict(GovernanceResult.ALLOW, 'Saga created'),
        classification: DataClassification.INTERNAL,
      });
    } catch (error: any) {
      logger.error({ error, sagaId: instance.id }, 'Failed to create saga instance');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Find saga by ID
   */
  async findById(id: string): Promise<DataEnvelope<SagaInstance | null>> {
    // Try cache first
    if (this.config.enableCache && this.redis) {
      const cached = await this.getCached(id);
      if (cached) {
        return createDataEnvelope(cached, {
          source: 'SagaRepository:cache',
          governanceVerdict: createVerdict(GovernanceResult.ALLOW, 'Saga found in cache'),
          classification: DataClassification.INTERNAL,
        });
      }
    }

    const client = await this.pgPool.connect();

    try {
      const result = await client.query(
        `SELECT * FROM ${this.config.tableName} WHERE id = $1`,
        [id]
      );

      if (result.rows.length === 0) {
        return createDataEnvelope(null, {
          source: 'SagaRepository',
          governanceVerdict: createVerdict(GovernanceResult.ALLOW, 'Saga not found'),
          classification: DataClassification.INTERNAL,
        });
      }

      const instance = this.rowToInstance(result.rows[0]);

      // Cache for next time
      if (this.config.enableCache && this.redis) {
        await this.cacheInstance(instance);
      }

      return createDataEnvelope(instance, {
        source: 'SagaRepository',
        governanceVerdict: createVerdict(GovernanceResult.ALLOW, 'Saga found'),
        classification: DataClassification.INTERNAL,
      });
    } finally {
      client.release();
    }
  }

  /**
   * Find sagas by query
   */
  async find(query: SagaQuery): Promise<DataEnvelope<SagaInstance[]>> {
    const client = await this.pgPool.connect();

    try {
      const conditions: string[] = [];
      const params: unknown[] = [];
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

      const result = await client.query(
        `
        SELECT * FROM ${this.config.tableName}
        ${whereClause}
        ORDER BY created_at DESC
        ${limitClause}
        ${offsetClause}
        `,
        params
      );

      const instances = result.rows.map((row: any) => this.rowToInstance(row));

      return createDataEnvelope(instances, {
        source: 'SagaRepository',
        governanceVerdict: createVerdict(GovernanceResult.ALLOW, `Found ${instances.length} sagas`),
        classification: DataClassification.INTERNAL,
      });
    } finally {
      client.release();
    }
  }

  /**
   * Update saga step
   */
  async updateStep(id: string, step: number): Promise<DataEnvelope<boolean>> {
    const client = await this.pgPool.connect();

    try {
      await client.query(
        `
        UPDATE ${this.config.tableName}
        SET current_step = $1, updated_at = $2
        WHERE id = $3
        `,
        [step, new Date().toISOString(), id]
      );

      // Invalidate cache
      if (this.config.enableCache && this.redis) {
        await this.invalidateCache(id);
      }

      return createDataEnvelope(true, {
        source: 'SagaRepository',
        governanceVerdict: createVerdict(GovernanceResult.ALLOW, 'Step updated'),
        classification: DataClassification.INTERNAL,
      });
    } catch (error: any) {
      logger.error({ error, sagaId: id }, 'Failed to update saga step');
      return createDataEnvelope(false, {
        source: 'SagaRepository',
        governanceVerdict: createVerdict(GovernanceResult.FLAG, 'Step update failed'),
        classification: DataClassification.INTERNAL,
      });
    } finally {
      client.release();
    }
  }

  /**
   * Update saga status
   */
  async updateStatus(id: string, status: string, error?: string): Promise<DataEnvelope<boolean>> {
    const client = await this.pgPool.connect();

    try {
      const completedAt = ['completed', 'compensated', 'failed'].includes(status)
        ? new Date().toISOString()
        : null;

      await client.query(
        `
        UPDATE ${this.config.tableName}
        SET status = $1, updated_at = $2, completed_at = $3, error = $4
        WHERE id = $5
        `,
        [status, new Date().toISOString(), completedAt, error || null, id]
      );

      // Invalidate cache
      if (this.config.enableCache && this.redis) {
        await this.invalidateCache(id);
      }

      return createDataEnvelope(true, {
        source: 'SagaRepository',
        governanceVerdict: createVerdict(GovernanceResult.ALLOW, 'Status updated'),
        classification: DataClassification.INTERNAL,
      });
    } catch (err: any) {
      logger.error({ error: err, sagaId: id }, 'Failed to update saga status');
      return createDataEnvelope(false, {
        source: 'SagaRepository',
        governanceVerdict: createVerdict(GovernanceResult.FLAG, 'Status update failed'),
        classification: DataClassification.INTERNAL,
      });
    } finally {
      client.release();
    }
  }

  /**
   * Store compensation data
   */
  async storeCompensationData(
    id: string,
    stepName: string,
    data: unknown
  ): Promise<DataEnvelope<boolean>> {
    const client = await this.pgPool.connect();

    try {
      // Get existing compensation data
      const result = await client.query(
        `SELECT compensation_data FROM ${this.config.tableName} WHERE id = $1`,
        [id]
      );

      const existingData = result.rows[0]?.compensation_data || {};
      existingData[stepName] = data;

      await client.query(
        `
        UPDATE ${this.config.tableName}
        SET compensation_data = $1, updated_at = $2
        WHERE id = $3
        `,
        [JSON.stringify(existingData), new Date().toISOString(), id]
      );

      // Invalidate cache
      if (this.config.enableCache && this.redis) {
        await this.invalidateCache(id);
      }

      return createDataEnvelope(true, {
        source: 'SagaRepository',
        governanceVerdict: createVerdict(GovernanceResult.ALLOW, 'Compensation data stored'),
        classification: DataClassification.INTERNAL,
      });
    } catch (error: any) {
      logger.error({ error, sagaId: id }, 'Failed to store compensation data');
      return createDataEnvelope(false, {
        source: 'SagaRepository',
        governanceVerdict: createVerdict(GovernanceResult.FLAG, 'Compensation data storage failed'),
        classification: DataClassification.INTERNAL,
      });
    } finally {
      client.release();
    }
  }

  /**
   * Find incomplete sagas for recovery
   */
  async findIncomplete(tenantId?: string): Promise<DataEnvelope<SagaInstance[]>> {
    return this.find({
      tenantId,
      status: 'running',
    });
  }

  /**
   * Delete old completed sagas
   */
  async cleanupOld(olderThanDays: number): Promise<DataEnvelope<number>> {
    const client = await this.pgPool.connect();

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      const result = await client.query(
        `
        DELETE FROM ${this.config.tableName}
        WHERE status IN ('completed', 'compensated')
        AND completed_at < $1
        `,
        [cutoffDate.toISOString()]
      );

      const deletedCount = result.rowCount || 0;

      logger.info({ deletedCount, olderThanDays }, 'Cleaned up old saga instances');

      return createDataEnvelope(deletedCount, {
        source: 'SagaRepository',
        governanceVerdict: createVerdict(GovernanceResult.ALLOW, `Deleted ${deletedCount} old sagas`),
        classification: DataClassification.INTERNAL,
      });
    } finally {
      client.release();
    }
  }

  // --------------------------------------------------------------------------
  // Private Helpers
  // --------------------------------------------------------------------------

  private rowToInstance(row: any): SagaInstance {
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

  private async cacheInstance(instance: SagaInstance): Promise<void> {
    if (!this.redis) return;

    try {
      await this.redis.setex(
        `saga:${instance.id}`,
        this.config.cacheTTLSeconds,
        JSON.stringify(instance)
      );
    } catch (error: any) {
      logger.warn({ error, sagaId: instance.id }, 'Failed to cache saga instance');
    }
  }

  private async getCached(id: string): Promise<SagaInstance | null> {
    if (!this.redis) return null;

    try {
      const cached = await this.redis.get(`saga:${id}`);
      return cached ? JSON.parse(cached) : null;
    } catch (error: any) {
      logger.warn({ error, sagaId: id }, 'Failed to get cached saga instance');
      return null;
    }
  }

  private async invalidateCache(id: string): Promise<void> {
    if (!this.redis) return;

    try {
      await this.redis.del(`saga:${id}`);
    } catch (error: any) {
      logger.warn({ error, sagaId: id }, 'Failed to invalidate saga cache');
    }
  }
}

// ============================================================================
// Database Migration SQL
// ============================================================================

export const SAGA_TABLE_MIGRATION = `
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

export default SagaRepository;
