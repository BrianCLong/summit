/**
 * Embedding Upsert Worker
 * 
 * BullMQ worker that processes entity changes and upserts embeddings
 * into PostgreSQL with pgvector HNSW index for fast similarity search.
 */

import { Worker, Job, Queue } from 'bullmq';
import { Pool } from 'pg';
import { getPostgresPool, getRedisClient } from '../config/database.js';
import { EmbeddingService } from '../services/EmbeddingService.js';
import { otelService } from '../monitoring/opentelemetry.js';
import pino from 'pino';

const logger = pino({ name: 'embeddingUpsertWorker' });

interface EntityEmbeddingJobData {
  entityId: string;
  investigationId: string;
  text: string;
  type: 'entity_created' | 'entity_updated' | 'entity_deleted';
  metadata?: Record<string, any>;
}

interface EmbeddingRecord {
  entity_id: string;
  investigation_id: string;
  embedding: number[];
  text: string;
  model: string;
  created_at: Date;
  updated_at: Date;
}

export class EmbeddingUpsertWorker {
  private worker: Worker | null = null;
  private queue: Queue | null = null;
  private postgres: Pool;
  private embeddingService: EmbeddingService;
  private config: {
    concurrency: number;
    embeddingModel: string;
    embeddingDimension: number;
    batchSize: number;
    retryAttempts: number;
  };

  constructor() {
    this.postgres = getPostgresPool();
    this.embeddingService = new EmbeddingService();
    
    this.config = {
      concurrency: parseInt(process.env.EMBEDDING_WORKER_CONCURRENCY || '2'),
      embeddingModel: process.env.EMBEDDING_MODEL || 'text-embedding-3-small',
      embeddingDimension: parseInt(process.env.EMBEDDING_DIMENSION || '1536'),
      batchSize: parseInt(process.env.EMBEDDING_BATCH_SIZE || '10'),
      retryAttempts: parseInt(process.env.EMBEDDING_RETRY_ATTEMPTS || '3')
    };
  }

  /**
   * Start the embedding upsert worker
   */
  async start(): Promise<void> {
    try {
      const redis = getRedisClient();
      
      // Initialize queue
      this.queue = new Queue('entity-embeddings', { connection: redis });
      
      // Initialize worker
      this.worker = new Worker(
        'entity-embeddings',
        this.processEmbeddingJob.bind(this),
        {
          connection: redis,
          concurrency: this.config.concurrency,
          removeOnComplete: 100,
          removeOnFail: 50,
          defaultJobOptions: {
            attempts: this.config.retryAttempts,
            backoff: {
              type: 'exponential',
              delay: 2000,
            },
            removeOnComplete: true,
            removeOnFail: false,
          },
        }
      );

      // Set up event handlers
      this.worker.on('completed', (job: Job) => {
        logger.info('Embedding job completed', {
          jobId: job.id,
          entityId: job.data.entityId,
          duration: Date.now() - job.timestamp
        });
      });

      this.worker.on('failed', (job: Job | undefined, error: Error) => {
        logger.error('Embedding job failed', {
          jobId: job?.id,
          entityId: job?.data?.entityId,
          error: error.message,
          attempts: job?.attemptsMade
        });
      });

      this.worker.on('stalled', (jobId: string) => {
        logger.warn('Embedding job stalled', { jobId });
      });

      // Ensure HNSW index exists
      await this.ensureHNSWIndex();

      logger.info('Embedding upsert worker started', {
        concurrency: this.config.concurrency,
        model: this.config.embeddingModel,
        dimension: this.config.embeddingDimension
      });

    } catch (error) {
      logger.error('Failed to start embedding worker', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Stop the worker gracefully
   */
  async stop(): Promise<void> {
    try {
      if (this.worker) {
        await this.worker.close();
        logger.info('Embedding upsert worker stopped');
      }
    } catch (error) {
      logger.error('Error stopping embedding worker', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Add entity embedding job to queue
   */
  async addEntityEmbeddingJob(data: EntityEmbeddingJobData): Promise<void> {
    if (!this.queue) {
      throw new Error('Queue not initialized');
    }

    try {
      await this.queue.add('process-entity-embedding', data, {
        jobId: `embedding-${data.entityId}-${Date.now()}`,
        priority: data.type === 'entity_created' ? 10 : 5, // Higher priority for new entities
      });

      logger.debug('Entity embedding job queued', {
        entityId: data.entityId,
        type: data.type
      });

    } catch (error) {
      logger.error('Failed to queue embedding job', {
        entityId: data.entityId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Process individual embedding job
   */
  private async processEmbeddingJob(job: Job<EntityEmbeddingJobData>): Promise<void> {
    return otelService.wrapBullMQJob('entity-embedding', async () => {
      const { entityId, investigationId, text, type } = job.data;

      logger.debug('Processing embedding job', {
        jobId: job.id,
        entityId,
        type,
        textLength: text.length
      });

      try {
        if (type === 'entity_deleted') {
          await this.deleteEmbedding(entityId);
          return;
        }

        // Generate embedding
        const embedding = await this.embeddingService.generateEmbedding({
          text,
          model: this.config.embeddingModel
        });

        // Validate embedding dimension
        if (embedding.length !== this.config.embeddingDimension) {
          throw new Error(
            `Embedding dimension mismatch: expected ${this.config.embeddingDimension}, got ${embedding.length}`
          );
        }

        // Upsert to database
        await this.upsertEmbedding({
          entity_id: entityId,
          investigation_id: investigationId,
          embedding,
          text,
          model: this.config.embeddingModel,
          created_at: new Date(),
          updated_at: new Date()
        });

        otelService.addSpanAttributes({
          'embedding.entity_id': entityId,
          'embedding.text_length': text.length,
          'embedding.dimension': embedding.length,
          'embedding.model': this.config.embeddingModel
        });

      } catch (error) {
        logger.error('Embedding processing failed', {
          jobId: job.id,
          entityId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        throw error;
      }
    });
  }

  /**
   * Upsert embedding to PostgreSQL with pgvector
   */
  private async upsertEmbedding(record: EmbeddingRecord): Promise<void> {
    const client = await this.postgres.connect();
    
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
        record.updated_at
      ]);

      logger.debug('Embedding upserted successfully', {
        entityId: record.entity_id,
        investigationId: record.investigation_id,
        dimension: record.embedding.length
      });

    } finally {
      client.release();
    }
  }

  /**
   * Delete embedding from database
   */
  private async deleteEmbedding(entityId: string): Promise<void> {
    const client = await this.postgres.connect();
    
    try {
      await client.query('DELETE FROM entity_embeddings WHERE entity_id = $1', [entityId]);
      
      logger.debug('Embedding deleted', { entityId });

    } finally {
      client.release();
    }
  }

  /**
   * Ensure HNSW index exists for fast similarity search
   */
  private async ensureHNSWIndex(): Promise<void> {
    const client = await this.postgres.connect();
    
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
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          INDEX (investigation_id)
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
        dimension: this.config.embeddingDimension
      });

    } catch (error) {
      logger.error('Failed to ensure HNSW index', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;

    } finally {
      client.release();
    }
  }

  /**
   * Get worker statistics
   */
  async getStats(): Promise<{
    active: number;
    waiting: number;
    completed: number;
    failed: number;
    concurrency: number;
    health: string;
  }> {
    try {
      if (!this.queue) {
        return {
          active: 0,
          waiting: 0,
          completed: 0,
          failed: 0,
          concurrency: this.config.concurrency,
          health: 'not_started'
        };
      }

      const [active, waiting, completed, failed] = await Promise.all([
        this.queue.getActive(),
        this.queue.getWaiting(),
        this.queue.getCompleted(),
        this.queue.getFailed()
      ]);

      return {
        active: active.length,
        waiting: waiting.length,
        completed: completed.length,
        failed: failed.length,
        concurrency: this.config.concurrency,
        health: this.worker ? 'healthy' : 'unhealthy'
      };

    } catch (error) {
      logger.error('Failed to get worker stats', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return {
        active: 0,
        waiting: 0,
        completed: 0,
        failed: 0,
        concurrency: this.config.concurrency,
        health: 'error'
      };
    }
  }

  /**
   * Bulk process existing entities (for backfilling)
   */
  async backfillEmbeddings(investigationId?: string): Promise<void> {
    logger.info('Starting embedding backfill', { investigationId });

    try {
      const client = await this.postgres.connect();
      
      let query = `
        SELECT e.id, e.investigation_id, 
               COALESCE(e.description, '') || ' ' || COALESCE(e.label, '') as text
        FROM entities e
        LEFT JOIN entity_embeddings ee ON e.id = ee.entity_id
        WHERE ee.entity_id IS NULL
      `;
      
      const params: any[] = [];
      if (investigationId) {
        query += ' AND e.investigation_id = $1';
        params.push(investigationId);
      }
      
      query += ' ORDER BY e.created_at DESC LIMIT 1000';

      const result = await client.query(query, params);
      client.release();

      for (const row of result.rows) {
        await this.addEntityEmbeddingJob({
          entityId: row.id,
          investigationId: row.investigation_id,
          text: row.text,
          type: 'entity_created'
        });
      }

      logger.info('Embedding backfill queued', {
        investigationId,
        entitiesQueued: result.rows.length
      });

    } catch (error) {
      logger.error('Embedding backfill failed', {
        investigationId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }
}

// Global worker instance
export const embeddingUpsertWorker = new EmbeddingUpsertWorker();