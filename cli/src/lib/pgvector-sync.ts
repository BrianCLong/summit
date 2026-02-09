/**
 * PgVector Sync
 * Synchronization between Neo4j graph and PostgreSQL pgvector for embeddings
 */

import pg from 'pg';
import { z } from 'zod';
import type { PostgresConfig } from './config.js';
import type { GraphClient, NodeResult } from './graph-client.js';

const { Pool } = pg;

export interface SyncOptions {
  batchSize?: number;
  embeddingDimension?: number;
  tableName?: string;
  idColumn?: string;
  embeddingColumn?: string;
  metadataColumns?: string[];
  upsert?: boolean;
  truncate?: boolean;
  dryRun?: boolean;
}

export interface SyncStatus {
  syncId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  startedAt?: Date;
  completedAt?: Date;
  stats: SyncStats;
  error?: string;
}

export interface SyncStats {
  totalNodes: number;
  processedNodes: number;
  insertedRows: number;
  updatedRows: number;
  skippedRows: number;
  errors: number;
  duration: number;
}

export interface EmbeddingResult {
  id: string;
  embedding: number[];
  metadata?: Record<string, unknown>;
  similarity?: number;
}

const SyncOptionsSchema = z.object({
  batchSize: z.number().min(1).max(10000).default(1000),
  embeddingDimension: z.number().min(1).max(4096).default(1536),
  tableName: z.string().default('node_embeddings'),
  idColumn: z.string().default('node_id'),
  embeddingColumn: z.string().default('embedding'),
  metadataColumns: z.array(z.string()).default([]),
  upsert: z.boolean().default(true),
  truncate: z.boolean().default(false),
  dryRun: z.boolean().default(false),
});

export class PgVectorSync {
  private config: PostgresConfig;
  private pool: pg.Pool | null = null;
  private graphClient: GraphClient | null = null;

  constructor(config: PostgresConfig) {
    this.config = config;
  }

  setGraphClient(client: GraphClient): void {
    this.graphClient = client;
  }

  async connect(): Promise<void> {
    if (this.pool) return;

    this.pool = new Pool({
      host: this.config.host,
      port: this.config.port,
      database: this.config.database,
      user: this.config.user,
      password: this.config.password,
      ssl: this.config.ssl ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    // Verify connection and pgvector extension
    const client = await this.pool.connect();
    try {
      await client.query('SELECT 1');

      // Check if pgvector extension exists
      const extResult = await client.query(
        "SELECT 1 FROM pg_extension WHERE extname = 'vector'"
      );

      if (extResult.rows.length === 0) {
        // Try to create extension
        try {
          await client.query('CREATE EXTENSION IF NOT EXISTS vector');
        } catch {
          throw new Error(
            'pgvector extension not available. Please install pgvector.'
          );
        }
      }
    } finally {
      client.release();
    }
  }

  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }

  async ensureTable(options: SyncOptions = {}): Promise<void> {
    const opts = SyncOptionsSchema.parse(options);

    if (!this.pool) {
      await this.connect();
    }

    const metadataColumnsDef = opts.metadataColumns
      .map((col) => `${col} TEXT`)
      .join(', ');

    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS ${opts.tableName} (
        ${opts.idColumn} TEXT PRIMARY KEY,
        ${opts.embeddingColumn} vector(${opts.embeddingDimension}),
        labels TEXT[],
        properties JSONB,
        ${metadataColumnsDef ? metadataColumnsDef + ',' : ''}
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    await this.pool!.query(createTableSQL);

    // Create index for similarity search
    const indexSQL = `
      CREATE INDEX IF NOT EXISTS ${opts.tableName}_embedding_idx
      ON ${opts.tableName}
      USING ivfflat (${opts.embeddingColumn} vector_cosine_ops)
      WITH (lists = 100)
    `;

    try {
      await this.pool!.query(indexSQL);
    } catch {
      // Index might fail if not enough data, create HNSW index instead
      const hnswIndexSQL = `
        CREATE INDEX IF NOT EXISTS ${opts.tableName}_embedding_hnsw_idx
        ON ${opts.tableName}
        USING hnsw (${opts.embeddingColumn} vector_cosine_ops)
      `;
      await this.pool!.query(hnswIndexSQL);
    }
  }

  async syncFromGraph(
    options: SyncOptions = {},
    onProgress?: (status: SyncStatus) => void
  ): Promise<SyncStatus> {
    const opts = SyncOptionsSchema.parse(options);
    const startTime = Date.now();

    const status: SyncStatus = {
      syncId: crypto.randomUUID(),
      status: 'pending',
      progress: 0,
      stats: {
        totalNodes: 0,
        processedNodes: 0,
        insertedRows: 0,
        updatedRows: 0,
        skippedRows: 0,
        errors: 0,
        duration: 0,
      },
    };

    try {
      if (!this.graphClient) {
        throw new Error('Graph client not set. Call setGraphClient() first.');
      }

      if (!this.pool) {
        await this.connect();
      }

      status.status = 'running';
      status.startedAt = new Date();
      onProgress?.(status);

      // Ensure table exists
      await this.ensureTable(opts);

      // Truncate if requested
      if (opts.truncate && !opts.dryRun) {
        await this.pool!.query(`TRUNCATE TABLE ${opts.tableName}`);
      }

      // Get total node count
      const graphStats = await this.graphClient.getStats();
      status.stats.totalNodes = graphStats.nodeCount;
      onProgress?.(status);

      // Process in batches
      let offset = 0;
      const batchSize = opts.batchSize;

      while (offset < status.stats.totalNodes) {
        const nodes = await this.graphClient.queryNodes(undefined, undefined, {
          limit: batchSize,
        });

        if (nodes.length === 0) break;

        // Process batch
        const batchResult = await this.processBatch(nodes, opts);

        status.stats.processedNodes += nodes.length;
        status.stats.insertedRows += batchResult.inserted;
        status.stats.updatedRows += batchResult.updated;
        status.stats.skippedRows += batchResult.skipped;
        status.stats.errors += batchResult.errors;

        status.progress = Math.min(
          100,
          Math.round((status.stats.processedNodes / status.stats.totalNodes) * 100)
        );

        onProgress?.(status);

        offset += batchSize;

        // Break if we got fewer results than batch size
        if (nodes.length < batchSize) break;
      }

      status.status = 'completed';
      status.completedAt = new Date();
      status.progress = 100;
    } catch (error) {
      status.status = 'failed';
      status.completedAt = new Date();
      status.error = error instanceof Error ? error.message : String(error);
    }

    status.stats.duration = Date.now() - startTime;
    onProgress?.(status);

    return status;
  }

  async syncNode(
    node: NodeResult,
    embedding: number[],
    options: SyncOptions = {}
  ): Promise<boolean> {
    const opts = SyncOptionsSchema.parse(options);

    if (!this.pool) {
      await this.connect();
    }

    if (opts.dryRun) {
      return true;
    }

    const sql = opts.upsert
      ? `
        INSERT INTO ${opts.tableName} (${opts.idColumn}, ${opts.embeddingColumn}, labels, properties, updated_at)
        VALUES ($1, $2, $3, $4, NOW())
        ON CONFLICT (${opts.idColumn})
        DO UPDATE SET
          ${opts.embeddingColumn} = EXCLUDED.${opts.embeddingColumn},
          labels = EXCLUDED.labels,
          properties = EXCLUDED.properties,
          updated_at = NOW()
      `
      : `
        INSERT INTO ${opts.tableName} (${opts.idColumn}, ${opts.embeddingColumn}, labels, properties)
        VALUES ($1, $2, $3, $4)
      `;

    try {
      await this.pool!.query(sql, [
        node.id,
        `[${embedding.join(',')}]`,
        node.labels,
        JSON.stringify(node.properties),
      ]);
      return true;
    } catch {
      return false;
    }
  }

  async search(
    queryEmbedding: number[],
    options: {
      limit?: number;
      labels?: string[];
      threshold?: number;
      tableName?: string;
    } = {}
  ): Promise<EmbeddingResult[]> {
    const {
      limit = 10,
      labels,
      threshold,
      tableName = 'node_embeddings',
    } = options;

    if (!this.pool) {
      await this.connect();
    }

    let sql = `
      SELECT
        node_id as id,
        embedding,
        labels,
        properties,
        1 - (embedding <=> $1) as similarity
      FROM ${tableName}
    `;

    const params: unknown[] = [`[${queryEmbedding.join(',')}]`];
    const conditions: string[] = [];

    if (labels?.length) {
      conditions.push(`labels && $${params.length + 1}`);
      params.push(labels);
    }

    if (threshold !== undefined) {
      conditions.push(`1 - (embedding <=> $1) >= $${params.length + 1}`);
      params.push(threshold);
    }

    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }

    sql += ` ORDER BY embedding <=> $1 LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await this.pool!.query(sql, params);

    return result.rows.map((row) => ({
      id: row.id,
      embedding: this.parseVector(row.embedding),
      metadata: {
        labels: row.labels,
        properties: row.properties,
      },
      similarity: row.similarity,
    }));
  }

  async getEmbedding(
    nodeId: string,
    tableName = 'node_embeddings'
  ): Promise<EmbeddingResult | null> {
    if (!this.pool) {
      await this.connect();
    }

    const result = await this.pool!.query(
      `
      SELECT node_id as id, embedding, labels, properties
      FROM ${tableName}
      WHERE node_id = $1
    `,
      [nodeId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      embedding: this.parseVector(row.embedding),
      metadata: {
        labels: row.labels,
        properties: row.properties,
      },
    };
  }

  async deleteEmbedding(
    nodeId: string,
    tableName = 'node_embeddings'
  ): Promise<boolean> {
    if (!this.pool) {
      await this.connect();
    }

    const result = await this.pool!.query(
      `DELETE FROM ${tableName} WHERE node_id = $1`,
      [nodeId]
    );

    return (result.rowCount ?? 0) > 0;
  }

  async getStats(
    tableName = 'node_embeddings'
  ): Promise<{
    totalEmbeddings: number;
    dimension: number;
    labels: string[];
    lastUpdated?: Date;
  }> {
    if (!this.pool) {
      await this.connect();
    }

    const countResult = await this.pool!.query(
      `SELECT COUNT(*) as count FROM ${tableName}`
    );

    const labelsResult = await this.pool!.query(
      `SELECT DISTINCT UNNEST(labels) as label FROM ${tableName} LIMIT 100`
    );

    const lastUpdatedResult = await this.pool!.query(
      `SELECT MAX(updated_at) as last_updated FROM ${tableName}`
    );

    // Get dimension from first row
    const dimResult = await this.pool!.query(
      `SELECT vector_dims(embedding) as dim FROM ${tableName} LIMIT 1`
    );

    return {
      totalEmbeddings: parseInt(countResult.rows[0].count),
      dimension: dimResult.rows[0]?.dim || 0,
      labels: labelsResult.rows.map((r) => r.label),
      lastUpdated: lastUpdatedResult.rows[0]?.last_updated,
    };
  }

  async healthCheck(): Promise<{
    connected: boolean;
    latencyMs: number;
    pgvectorVersion?: string;
  }> {
    const start = Date.now();

    try {
      if (!this.pool) {
        await this.connect();
      }

      await this.pool!.query('SELECT 1');

      const versionResult = await this.pool!.query(
        "SELECT extversion FROM pg_extension WHERE extname = 'vector'"
      );

      return {
        connected: true,
        latencyMs: Date.now() - start,
        pgvectorVersion: versionResult.rows[0]?.extversion,
      };
    } catch {
      return {
        connected: false,
        latencyMs: Date.now() - start,
      };
    }
  }

  private async processBatch(
    nodes: NodeResult[],
    opts: z.infer<typeof SyncOptionsSchema>
  ): Promise<{
    inserted: number;
    updated: number;
    skipped: number;
    errors: number;
  }> {
    const result = {
      inserted: 0,
      updated: 0,
      skipped: 0,
      errors: 0,
    };

    if (opts.dryRun) {
      result.skipped = nodes.length;
      return result;
    }

    for (const node of nodes) {
      try {
        // Generate placeholder embedding (in real implementation, call embedding service)
        const embedding = this.generatePlaceholderEmbedding(
          node,
          opts.embeddingDimension
        );

        // Check if exists
        const existing = await this.getEmbedding(node.id, opts.tableName);

        const success = await this.syncNode(node, embedding, opts);

        if (success) {
          if (existing) {
            result.updated++;
          } else {
            result.inserted++;
          }
        } else {
          result.skipped++;
        }
      } catch {
        result.errors++;
      }
    }

    return result;
  }

  private generatePlaceholderEmbedding(
    node: NodeResult,
    dimension: number
  ): number[] {
    // Generate deterministic placeholder embedding based on node properties
    // In production, this would call an embedding service
    const seed = this.hashString(JSON.stringify(node));
    const embedding: number[] = [];

    for (let i = 0; i < dimension; i++) {
      const value = Math.sin(seed + i) * 0.5 + 0.5;
      embedding.push(value);
    }

    // Normalize to unit vector
    const magnitude = Math.sqrt(
      embedding.reduce((sum, val) => sum + val * val, 0)
    );
    return embedding.map((val) => val / magnitude);
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return hash;
  }

  private parseVector(vectorStr: string): number[] {
    // Parse pgvector format: [0.1,0.2,0.3,...]
    const cleaned = vectorStr.replace(/[\[\]]/g, '');
    return cleaned.split(',').map(Number);
  }
}

export function createPgVectorSync(config: PostgresConfig): PgVectorSync {
  return new PgVectorSync(config);
}
