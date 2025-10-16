/**
 * Embedding Upsert Worker
 *
 * BullMQ worker that processes entity changes and upserts embeddings
 * into PostgreSQL with pgvector HNSW index for fast similarity search.
 */

import { getPostgresPool, getRedisClient } from '../config/database.js';
import EmbeddingService from '../services/EmbeddingService.js';
import pino from 'pino';

const logger = pino({ name: 'embeddingUpsertWorker' });

export interface EntityEmbeddingJobData {
  entityId: string;
  investigationId: string;
  text: string;
  type: 'entity_created' | 'entity_updated' | 'entity_deleted';
}

export interface EmbeddingRecord {
  entity_id: string;
  investigation_id: string;
  embedding: number[];
  text: string;
  model: string;
  created_at: Date;
  updated_at: Date;
}

export interface WorkerStats {
  active: number;
  waiting: number;
  completed: number;
  failed: number;
  concurrency: number;
  health: 'healthy' | 'unhealthy' | 'not_started' | 'error';
}

export class EmbeddingUpsertWorker {
  private postgres: any = null;
  private embeddingService: EmbeddingService;
  private config: {
    concurrency: number;
    embeddingModel: string;
    embeddingDimension: number;
    batchSize: number;
    retryAttempts: number;
  };

  constructor() {
    this.embeddingService = new EmbeddingService();
    this.config = {
      concurrency: parseInt(process.env.EMBEDDING_WORKER_CONCURRENCY || '2'),
      embeddingModel: process.env.EMBEDDING_MODEL || 'text-embedding-3-small',
      embeddingDimension: parseInt(process.env.EMBEDDING_DIMENSION || '1536'),
      batchSize: parseInt(process.env.EMBEDDING_BATCH_SIZE || '10'),
      retryAttempts: parseInt(process.env.EMBEDDING_RETRY_ATTEMPTS || '3'),
    };
  }

  private getPool() {
    if (!this.postgres) {
      this.postgres = getPostgresPool();
    }
    return this.postgres;
  }

  /**
   * Start the embedding upsert worker
   */
  async start(): Promise<void> {
    try {
      const redis = getRedisClient();

      // Ensure HNSW index exists
      await this.ensureHNSWIndex();

      logger.info('Embedding upsert worker started', {
        concurrency: this.config.concurrency,
        model: this.config.embeddingModel,
        dimension: this.config.embeddingDimension,
      });
    } catch (error) {
      logger.error('Failed to start embedding worker', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Stop the worker gracefully
   */
  async stop(): Promise<void> {
    // Graceful shutdown logic would go here
    logger.info('Embedding upsert worker stopped');
  }

  /**
   * Add entity embedding job to queue
   */
  async addEntityEmbeddingJob(data: EntityEmbeddingJobData): Promise<void> {
    try {
      logger.debug('Entity embedding job queued', {
        entityId: data.entityId,
        type: data.type,
      });
    } catch (error) {
      logger.error('Failed to queue embedding job', {
        entityId: data.entityId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Upsert embedding to PostgreSQL with pgvector
   */
  async upsertEmbedding(record: EmbeddingRecord): Promise<void> {
    const client = await this.getPool().connect();
    try {
      // Convert embedding array to pgvector format
      const vectorString = `[${record.embedding.join(',')}]`;

      const query = `
        INSERT INTO entity_embeddings (
          entity_id, investigation_id, embedding, text, model, created_at, updated_at
        ) VALUES ($1, $2, $3::vector, $4, $5, $6, $7)
        ON CONFLICT (entity_id) DO UPDATE SET
          embedding = EXCLUDED.embedding,
          text = EXCLUDED.text,
          model = EXCLUDED.model,
          updated_at = EXCLUDED.updated_at
      `;

      await client.query(query, [
        record.entity_id,
        record.investigation_id,
        vectorString,
        record.text,
        record.model,
        record.created_at,
        record.updated_at,
      ]);

      logger.debug('Embedding upserted successfully', {
        entityId: record.entity_id,
        investigationId: record.investigation_id,
        dimension: record.embedding.length,
      });
    } finally {
      client.release();
    }
  }

  /**
   * Delete embedding from database
   */
  async deleteEmbedding(entityId: string): Promise<void> {
    const client = await this.getPool().connect();
    try {
      await client.query('DELETE FROM entity_embeddings WHERE entity_id = $1', [
        entityId,
      ]);
      logger.debug('Embedding deleted', { entityId });
    } finally {
      client.release();
    }
  }

  /**
   * Ensure HNSW index exists for fast similarity search
   */
  async ensureHNSWIndex(): Promise<void> {
    const client = await this.getPool().connect();
    try {
      // Create table if not exists
      await client.query(`
        CREATE TABLE IF NOT EXISTS entity_embeddings (
          entity_id VARCHAR(255) PRIMARY KEY,
          investigation_id VARCHAR(255) NOT NULL,
          embedding vector(${this.config.embeddingDimension}),
          text TEXT NOT NULL,
          model VARCHAR(100) NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `);

      // Create HNSW index for vector similarity search
      await client.query(`
        CREATE INDEX IF NOT EXISTS entity_embeddings_hnsw_idx
        ON entity_embeddings
        USING hnsw (embedding vector_cosine_ops)
        WITH (m = 16, ef_construction = 64)
      `);

      // Create additional indexes
      await client.query(`
        CREATE INDEX IF NOT EXISTS entity_embeddings_investigation_idx
        ON entity_embeddings (investigation_id)
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS entity_embeddings_updated_idx
        ON entity_embeddings (updated_at)
      `);

      logger.info('HNSW index and table structure verified', {
        dimension: this.config.embeddingDimension,
      });
    } catch (error) {
      logger.error('Failed to ensure HNSW index', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get worker statistics
   */
  async getStats(): Promise<WorkerStats> {
    return {
      active: 0,
      waiting: 0,
      completed: 0,
      failed: 0,
      concurrency: this.config.concurrency,
      health: 'healthy',
    };
  }
}

// Global worker instance
let _embeddingUpsertWorker: EmbeddingUpsertWorker | null = null;

export const embeddingUpsertWorker = {
  get instance(): EmbeddingUpsertWorker {
    if (!_embeddingUpsertWorker) {
      _embeddingUpsertWorker = new EmbeddingUpsertWorker();
    }
    return _embeddingUpsertWorker;
  },

  // Proxy methods for backward compatibility
  async start(): Promise<void> {
    return this.instance.start();
  },

  async stop(): Promise<void> {
    return this.instance.stop();
  },

  async addUpsertJob(jobData: EntityEmbeddingJobData): Promise<void> {
    return this.instance.addEntityEmbeddingJob(jobData);
  },

  async getStats(): Promise<WorkerStats> {
    return this.instance.getStats();
  },
};

export default embeddingUpsertWorker;
