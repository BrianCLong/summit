/**
 * pgvector Store
 * High-performance vector storage and retrieval using PostgreSQL pgvector extension.
 * Supports HNSW and IVFFlat indexes for fast similarity search.
 */

import { Pool, PoolClient } from 'pg';
import pino from 'pino';

import type {
  VectorStoreConfig,
  VectorSearchResult,
  IVFFlatParams,
  HNSWParams,
  FusedEmbedding,
  ModalityType,
} from './types.js';

const logger = pino({ name: 'pgvector-store' });

export interface PgVectorStoreConfig extends VectorStoreConfig {
  connectionString?: string;
  poolSize: number;
  schemaName: string;
  enableWAL: boolean;
  vacuumThreshold: number;
}

interface StoredVector {
  id: string;
  entity_id: string;
  investigation_id: string;
  modality: ModalityType;
  embedding: number[];
  metadata: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

export class PgVectorStore {
  private pool: Pool | null = null;
  private config: PgVectorStoreConfig;
  private initialized = false;
  private vectorCount = 0;

  constructor(config: Partial<PgVectorStoreConfig> = {}) {
    this.config = {
      tableName: 'multimodal_embeddings',
      dimension: 768,
      indexType: 'hnsw',
      distanceMetric: 'cosine',
      indexParams: {
        m: 16,
        efConstruction: 64,
        efSearch: 40,
      } as HNSWParams,
      connectionString: process.env.DATABASE_URL,
      poolSize: 10,
      schemaName: 'public',
      enableWAL: true,
      vacuumThreshold: 10000,
      ...config,
    };

    logger.info('PgVector Store configured', {
      tableName: this.config.tableName,
      dimension: this.config.dimension,
      indexType: this.config.indexType,
    });
  }

  /**
   * Initialize the vector store
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      this.pool = new Pool({
        connectionString: this.config.connectionString,
        max: this.config.poolSize,
      });

      // Test connection
      const client = await this.pool.connect();

      try {
        // Ensure pgvector extension
        await client.query('CREATE EXTENSION IF NOT EXISTS vector');

        // Create table
        await this.createTable(client);

        // Create indexes
        await this.createIndexes(client);

        // Get current vector count
        const countResult = await client.query(
          `SELECT COUNT(*) FROM ${this.config.schemaName}.${this.config.tableName}`,
        );
        this.vectorCount = parseInt(countResult.rows[0].count);

        this.initialized = true;

        logger.info('PgVector Store initialized', {
          vectorCount: this.vectorCount,
        });
      } finally {
        client.release();
      }
    } catch (error) {
      logger.error('Failed to initialize PgVector Store', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Create the embeddings table
   */
  private async createTable(client: PoolClient): Promise<void> {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS ${this.config.schemaName}.${this.config.tableName} (
        id VARCHAR(64) PRIMARY KEY,
        entity_id VARCHAR(255) NOT NULL,
        investigation_id VARCHAR(255) NOT NULL,
        modality VARCHAR(50) NOT NULL,
        embedding vector(${this.config.dimension}),
        fusion_method VARCHAR(50),
        cross_modal_score FLOAT,
        hallucination_score FLOAT,
        verification_status VARCHAR(50) DEFAULT 'unverified',
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    await client.query(createTableSQL);

    // Create additional indexes for filtering
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_${this.config.tableName}_investigation
      ON ${this.config.schemaName}.${this.config.tableName} (investigation_id)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_${this.config.tableName}_modality
      ON ${this.config.schemaName}.${this.config.tableName} (modality)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_${this.config.tableName}_entity
      ON ${this.config.schemaName}.${this.config.tableName} (entity_id)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_${this.config.tableName}_metadata
      ON ${this.config.schemaName}.${this.config.tableName} USING GIN (metadata)
    `);
  }

  /**
   * Create vector indexes
   */
  private async createIndexes(client: PoolClient): Promise<void> {
    const distanceOp = this.getDistanceOperator();
    const indexName = `idx_${this.config.tableName}_embedding_${this.config.indexType}`;

    if (this.config.indexType === 'hnsw') {
      const params = this.config.indexParams as HNSWParams;
      await client.query(`
        CREATE INDEX IF NOT EXISTS ${indexName}
        ON ${this.config.schemaName}.${this.config.tableName}
        USING hnsw (embedding ${distanceOp})
        WITH (m = ${params.m}, ef_construction = ${params.efConstruction})
      `);
    } else {
      const params = this.config.indexParams as IVFFlatParams;
      await client.query(`
        CREATE INDEX IF NOT EXISTS ${indexName}
        ON ${this.config.schemaName}.${this.config.tableName}
        USING ivfflat (embedding ${distanceOp})
        WITH (lists = ${params.lists})
      `);
    }
  }

  /**
   * Get distance operator for pgvector
   */
  private getDistanceOperator(): string {
    switch (this.config.distanceMetric) {
      case 'cosine':
        return 'vector_cosine_ops';
      case 'euclidean':
        return 'vector_l2_ops';
      case 'inner_product':
        return 'vector_ip_ops';
      default:
        return 'vector_cosine_ops';
    }
  }

  /**
   * Get distance function for queries
   */
  private getDistanceFunction(): string {
    switch (this.config.distanceMetric) {
      case 'cosine':
        return '<=>';
      case 'euclidean':
        return '<->';
      case 'inner_product':
        return '<#>';
      default:
        return '<=>';
    }
  }

  /**
   * Store a fused embedding
   */
  async store(embedding: FusedEmbedding): Promise<void> {
    await this.ensureInitialized();

    const client = await this.pool!.connect();

    try {
      const vectorString = `[${embedding.fusedVector.join(',')}]`;

      await client.query(
        `
        INSERT INTO ${this.config.schemaName}.${this.config.tableName}
        (id, entity_id, investigation_id, modality, embedding, fusion_method,
         cross_modal_score, hallucination_score, verification_status, metadata)
        VALUES ($1, $2, $3, $4, $5::vector, $6, $7, $8, $9, $10)
        ON CONFLICT (id) DO UPDATE SET
          embedding = EXCLUDED.embedding,
          cross_modal_score = EXCLUDED.cross_modal_score,
          hallucination_score = EXCLUDED.hallucination_score,
          verification_status = EXCLUDED.verification_status,
          metadata = EXCLUDED.metadata,
          updated_at = NOW()
        `,
        [
          embedding.id,
          embedding.entityId,
          embedding.investigationId,
          'fused',
          vectorString,
          embedding.fusionMethod,
          embedding.crossModalScore,
          embedding.hallucinationScore,
          embedding.verificationStatus,
          JSON.stringify({
            modalityCount: embedding.modalityVectors.length,
            modalities: embedding.modalityVectors.map((m) => m.modality),
          }),
        ],
      );

      this.vectorCount++;

      logger.debug('Embedding stored', {
        id: embedding.id,
        entityId: embedding.entityId,
      });
    } finally {
      client.release();
    }
  }

  /**
   * Store multiple embeddings in batch
   */
  async storeBatch(embeddings: FusedEmbedding[]): Promise<void> {
    await this.ensureInitialized();

    const client = await this.pool!.connect();

    try {
      await client.query('BEGIN');

      for (const embedding of embeddings) {
        const vectorString = `[${embedding.fusedVector.join(',')}]`;

        await client.query(
          `
          INSERT INTO ${this.config.schemaName}.${this.config.tableName}
          (id, entity_id, investigation_id, modality, embedding, fusion_method,
           cross_modal_score, hallucination_score, verification_status, metadata)
          VALUES ($1, $2, $3, $4, $5::vector, $6, $7, $8, $9, $10)
          ON CONFLICT (id) DO UPDATE SET
            embedding = EXCLUDED.embedding,
            cross_modal_score = EXCLUDED.cross_modal_score,
            hallucination_score = EXCLUDED.hallucination_score,
            verification_status = EXCLUDED.verification_status,
            metadata = EXCLUDED.metadata,
            updated_at = NOW()
          `,
          [
            embedding.id,
            embedding.entityId,
            embedding.investigationId,
            'fused',
            vectorString,
            embedding.fusionMethod,
            embedding.crossModalScore,
            embedding.hallucinationScore,
            embedding.verificationStatus,
            JSON.stringify({
              modalityCount: embedding.modalityVectors.length,
              modalities: embedding.modalityVectors.map((m) => m.modality),
            }),
          ],
        );
      }

      await client.query('COMMIT');
      this.vectorCount += embeddings.length;

      logger.info('Batch embeddings stored', {
        count: embeddings.length,
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Search for similar vectors
   */
  async search(
    queryVector: number[],
    options: {
      topK?: number;
      threshold?: number;
      investigationId?: string;
      modality?: ModalityType;
      filters?: Record<string, unknown>;
    } = {},
  ): Promise<VectorSearchResult[]> {
    await this.ensureInitialized();

    const {
      topK = 10,
      threshold = 0.7,
      investigationId,
      modality,
      filters,
    } = options;

    const client = await this.pool!.connect();

    try {
      const vectorString = `[${queryVector.join(',')}]`;
      const distanceFunc = this.getDistanceFunction();

      // Build query with optional filters
      let query = `
        SELECT
          id,
          entity_id,
          investigation_id,
          modality,
          1 - (embedding ${distanceFunc} $1::vector) as similarity,
          metadata
        FROM ${this.config.schemaName}.${this.config.tableName}
        WHERE 1 = 1
      `;

      const params: any[] = [vectorString];
      let paramIndex = 2;

      if (investigationId) {
        query += ` AND investigation_id = $${paramIndex}`;
        params.push(investigationId);
        paramIndex++;
      }

      if (modality) {
        query += ` AND modality = $${paramIndex}`;
        params.push(modality);
        paramIndex++;
      }

      // Apply threshold
      query += ` AND (1 - (embedding ${distanceFunc} $1::vector)) >= $${paramIndex}`;
      params.push(threshold);
      paramIndex++;

      // Order and limit
      query += `
        ORDER BY embedding ${distanceFunc} $1::vector
        LIMIT $${paramIndex}
      `;
      params.push(topK);

      // Set HNSW search parameter if applicable
      if (this.config.indexType === 'hnsw') {
        const hnswParams = this.config.indexParams as HNSWParams;
        await client.query(`SET hnsw.ef_search = ${hnswParams.efSearch}`);
      } else {
        const ivfParams = this.config.indexParams as IVFFlatParams;
        await client.query(`SET ivfflat.probes = ${ivfParams.probes}`);
      }

      const result = await client.query(query, params);

      return result.rows.map((row) => ({
        id: row.id,
        entityId: row.entity_id,
        distance: 1 - row.similarity,
        similarity: row.similarity,
        metadata: row.metadata,
      }));
    } finally {
      client.release();
    }
  }

  /**
   * Get embedding by ID
   */
  async get(id: string): Promise<StoredVector | null> {
    await this.ensureInitialized();

    const client = await this.pool!.connect();

    try {
      const result = await client.query(
        `SELECT * FROM ${this.config.schemaName}.${this.config.tableName} WHERE id = $1`,
        [id],
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        id: row.id,
        entity_id: row.entity_id,
        investigation_id: row.investigation_id,
        modality: row.modality,
        embedding: this.parseVectorString(row.embedding),
        metadata: row.metadata,
        created_at: row.created_at,
        updated_at: row.updated_at,
      };
    } finally {
      client.release();
    }
  }

  /**
   * Delete embedding by ID
   */
  async delete(id: string): Promise<boolean> {
    await this.ensureInitialized();

    const client = await this.pool!.connect();

    try {
      const result = await client.query(
        `DELETE FROM ${this.config.schemaName}.${this.config.tableName} WHERE id = $1`,
        [id],
      );

      if (result.rowCount && result.rowCount > 0) {
        this.vectorCount--;
        return true;
      }
      return false;
    } finally {
      client.release();
    }
  }

  /**
   * Delete embeddings by investigation ID
   */
  async deleteByInvestigation(investigationId: string): Promise<number> {
    await this.ensureInitialized();

    const client = await this.pool!.connect();

    try {
      const result = await client.query(
        `DELETE FROM ${this.config.schemaName}.${this.config.tableName}
         WHERE investigation_id = $1`,
        [investigationId],
      );

      const deleted = result.rowCount || 0;
      this.vectorCount -= deleted;

      logger.info('Deleted embeddings by investigation', {
        investigationId,
        count: deleted,
      });

      return deleted;
    } finally {
      client.release();
    }
  }

  /**
   * Update verification status
   */
  async updateVerificationStatus(
    id: string,
    status: string,
  ): Promise<void> {
    await this.ensureInitialized();

    const client = await this.pool!.connect();

    try {
      await client.query(
        `UPDATE ${this.config.schemaName}.${this.config.tableName}
         SET verification_status = $1, updated_at = NOW()
         WHERE id = $2`,
        [status, id],
      );
    } finally {
      client.release();
    }
  }

  /**
   * Get statistics
   */
  async getStats(): Promise<{
    totalVectors: number;
    investigationCount: number;
    modalityDistribution: Record<string, number>;
    avgHallucinationScore: number;
    verificationDistribution: Record<string, number>;
    indexStats: any;
  }> {
    await this.ensureInitialized();

    const client = await this.pool!.connect();

    try {
      // Get total count
      const countResult = await client.query(
        `SELECT COUNT(*) FROM ${this.config.schemaName}.${this.config.tableName}`,
      );

      // Get investigation count
      const investigationResult = await client.query(
        `SELECT COUNT(DISTINCT investigation_id)
         FROM ${this.config.schemaName}.${this.config.tableName}`,
      );

      // Get modality distribution
      const modalityResult = await client.query(
        `SELECT modality, COUNT(*) as count
         FROM ${this.config.schemaName}.${this.config.tableName}
         GROUP BY modality`,
      );

      // Get average hallucination score
      const hallucinationResult = await client.query(
        `SELECT AVG(hallucination_score) as avg
         FROM ${this.config.schemaName}.${this.config.tableName}
         WHERE hallucination_score IS NOT NULL`,
      );

      // Get verification distribution
      const verificationResult = await client.query(
        `SELECT verification_status, COUNT(*) as count
         FROM ${this.config.schemaName}.${this.config.tableName}
         GROUP BY verification_status`,
      );

      // Get index stats
      const indexResult = await client.query(`
        SELECT
          schemaname,
          tablename,
          indexname,
          pg_size_pretty(pg_relation_size(indexrelid)) as index_size
        FROM pg_indexes
        JOIN pg_stat_user_indexes USING (indexrelid)
        WHERE tablename = $1
      `, [this.config.tableName]);

      return {
        totalVectors: parseInt(countResult.rows[0].count),
        investigationCount: parseInt(investigationResult.rows[0].count),
        modalityDistribution: Object.fromEntries(
          modalityResult.rows.map((r) => [r.modality, parseInt(r.count)]),
        ),
        avgHallucinationScore: parseFloat(hallucinationResult.rows[0].avg) || 0,
        verificationDistribution: Object.fromEntries(
          verificationResult.rows.map((r) => [r.verification_status, parseInt(r.count)]),
        ),
        indexStats: indexResult.rows,
      };
    } finally {
      client.release();
    }
  }

  /**
   * Vacuum and analyze table
   */
  async vacuum(): Promise<void> {
    await this.ensureInitialized();

    const client = await this.pool!.connect();

    try {
      logger.info('Running VACUUM ANALYZE...');
      await client.query(
        `VACUUM ANALYZE ${this.config.schemaName}.${this.config.tableName}`,
      );
      logger.info('VACUUM ANALYZE completed');
    } finally {
      client.release();
    }
  }

  /**
   * Parse pgvector string to array
   */
  private parseVectorString(vectorString: string): number[] {
    const cleaned = vectorString.replace(/^\[|\]$/g, '');
    return cleaned.split(',').map((v) => parseFloat(v.trim()));
  }

  /**
   * Ensure store is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  /**
   * Close connection pool
   */
  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      this.initialized = false;
      logger.info('PgVector Store connection closed');
    }
  }
}

export default PgVectorStore;
