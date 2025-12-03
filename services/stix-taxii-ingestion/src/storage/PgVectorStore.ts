/**
 * pgvector Storage Layer for IOCs
 * Stores STIX objects with vector embeddings for semantic search
 */

import { Pool, PoolClient, QueryResult } from 'pg';
import pino from 'pino';
import type {
  StixObject,
  StixId,
  Indicator,
  Malware,
  ThreatActor,
  Vulnerability,
  EnrichedStixObject,
  IngestionMetadata,
} from '../types/stix-2.1.js';

const logger = pino({ name: 'pgvector-store' });

export interface PgVectorStoreConfig {
  connectionString?: string;
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  password?: string;
  ssl?: boolean;
  poolSize?: number;
  embeddingDimension?: number;
}

export interface IOCRecord {
  id: string;
  stix_id: StixId;
  stix_type: string;
  value: string;
  pattern?: string;
  pattern_type?: string;
  name?: string;
  description?: string;
  confidence?: number;
  severity?: string;
  valid_from?: string;
  valid_until?: string;
  labels?: string[];
  external_references?: object[];
  raw_object: object;
  embedding?: number[];
  feed_id: string;
  feed_name: string;
  ingested_at: string;
  created_at: string;
  modified_at: string;
}

export interface SearchOptions {
  query?: string;
  embedding?: number[];
  types?: string[];
  minConfidence?: number;
  labels?: string[];
  feedIds?: string[];
  validFrom?: string;
  validUntil?: string;
  limit?: number;
  offset?: number;
  similarityThreshold?: number;
}

export interface SearchResult {
  record: IOCRecord;
  score?: number;
  similarity?: number;
}

export class PgVectorStore {
  private readonly pool: Pool;
  private readonly embeddingDimension: number;
  private initialized = false;

  constructor(config: PgVectorStoreConfig = {}) {
    this.embeddingDimension = config.embeddingDimension || 1536; // OpenAI default

    const connectionConfig = config.connectionString
      ? { connectionString: config.connectionString }
      : {
          host: config.host || process.env.POSTGRES_HOST || 'localhost',
          port: config.port || parseInt(process.env.POSTGRES_PORT || '5432', 10),
          database: config.database || process.env.POSTGRES_DB || 'intelgraph_dev',
          user: config.user || process.env.POSTGRES_USER || 'intelgraph',
          password: config.password || process.env.POSTGRES_PASSWORD || 'devpassword',
          ssl: config.ssl ?? process.env.NODE_ENV === 'production',
        };

    this.pool = new Pool({
      ...connectionConfig,
      max: config.poolSize || 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    this.pool.on('error', (err) => {
      logger.error({ error: err.message }, 'Unexpected pool error');
    });
  }

  /**
   * Initialize database schema
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    const client = await this.pool.connect();
    try {
      // Enable pgvector extension
      await client.query('CREATE EXTENSION IF NOT EXISTS vector');

      // Create IOC table with vector column
      await client.query(`
        CREATE TABLE IF NOT EXISTS stix_iocs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          stix_id TEXT NOT NULL UNIQUE,
          stix_type TEXT NOT NULL,
          value TEXT,
          pattern TEXT,
          pattern_type TEXT,
          name TEXT,
          description TEXT,
          confidence INTEGER,
          severity TEXT,
          valid_from TIMESTAMPTZ,
          valid_until TIMESTAMPTZ,
          labels TEXT[],
          external_references JSONB,
          raw_object JSONB NOT NULL,
          embedding vector(${this.embeddingDimension}),
          feed_id TEXT NOT NULL,
          feed_name TEXT NOT NULL,
          ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          created_at TIMESTAMPTZ NOT NULL,
          modified_at TIMESTAMPTZ NOT NULL,

          -- Search optimization
          search_vector tsvector GENERATED ALWAYS AS (
            setweight(to_tsvector('english', COALESCE(name, '')), 'A') ||
            setweight(to_tsvector('english', COALESCE(description, '')), 'B') ||
            setweight(to_tsvector('english', COALESCE(value, '')), 'A') ||
            setweight(to_tsvector('english', COALESCE(pattern, '')), 'C')
          ) STORED
        )
      `);

      // Create indexes
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_stix_iocs_stix_type ON stix_iocs(stix_type);
        CREATE INDEX IF NOT EXISTS idx_stix_iocs_feed_id ON stix_iocs(feed_id);
        CREATE INDEX IF NOT EXISTS idx_stix_iocs_ingested_at ON stix_iocs(ingested_at);
        CREATE INDEX IF NOT EXISTS idx_stix_iocs_valid_from ON stix_iocs(valid_from);
        CREATE INDEX IF NOT EXISTS idx_stix_iocs_confidence ON stix_iocs(confidence);
        CREATE INDEX IF NOT EXISTS idx_stix_iocs_labels ON stix_iocs USING GIN(labels);
        CREATE INDEX IF NOT EXISTS idx_stix_iocs_search ON stix_iocs USING GIN(search_vector);
      `);

      // Create vector index for similarity search (IVFFlat for large datasets)
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_stix_iocs_embedding
        ON stix_iocs USING ivfflat (embedding vector_cosine_ops)
        WITH (lists = 100)
      `);

      // Create feed sync state table
      await client.query(`
        CREATE TABLE IF NOT EXISTS stix_feed_sync_state (
          feed_id TEXT PRIMARY KEY,
          collection_id TEXT NOT NULL,
          last_sync_timestamp TIMESTAMPTZ,
          last_object_version TEXT,
          next_cursor TEXT,
          total_objects_synced BIGINT DEFAULT 0,
          last_batch_size INTEGER DEFAULT 0,
          sync_status TEXT DEFAULT 'idle',
          error_message TEXT,
          retry_count INTEGER DEFAULT 0,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        )
      `);

      this.initialized = true;
      logger.info('PgVectorStore initialized successfully');
    } finally {
      client.release();
    }
  }

  /**
   * Store a STIX object with optional embedding
   */
  async store(
    object: StixObject,
    metadata: IngestionMetadata,
    embedding?: number[]
  ): Promise<string> {
    await this.ensureInitialized();

    const record = this.objectToRecord(object, metadata, embedding);

    const result = await this.pool.query<{ id: string }>(
      `
      INSERT INTO stix_iocs (
        stix_id, stix_type, value, pattern, pattern_type, name, description,
        confidence, severity, valid_from, valid_until, labels, external_references,
        raw_object, embedding, feed_id, feed_name, ingested_at, created_at, modified_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20
      )
      ON CONFLICT (stix_id) DO UPDATE SET
        raw_object = EXCLUDED.raw_object,
        embedding = COALESCE(EXCLUDED.embedding, stix_iocs.embedding),
        modified_at = EXCLUDED.modified_at,
        ingested_at = EXCLUDED.ingested_at
      RETURNING id
      `,
      [
        record.stix_id,
        record.stix_type,
        record.value,
        record.pattern,
        record.pattern_type,
        record.name,
        record.description,
        record.confidence,
        record.severity,
        record.valid_from,
        record.valid_until,
        record.labels,
        JSON.stringify(record.external_references),
        JSON.stringify(record.raw_object),
        embedding ? `[${embedding.join(',')}]` : null,
        record.feed_id,
        record.feed_name,
        record.ingested_at,
        record.created_at,
        record.modified_at,
      ]
    );

    return result.rows[0].id;
  }

  /**
   * Store multiple STIX objects in a batch
   */
  async storeBatch(
    objects: Array<{
      object: StixObject;
      metadata: IngestionMetadata;
      embedding?: number[];
    }>
  ): Promise<{ stored: number; errors: Array<{ id: string; error: string }> }> {
    await this.ensureInitialized();

    const result = { stored: 0, errors: [] as Array<{ id: string; error: string }> };
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      for (const { object, metadata, embedding } of objects) {
        try {
          const record = this.objectToRecord(object, metadata, embedding);

          await client.query(
            `
            INSERT INTO stix_iocs (
              stix_id, stix_type, value, pattern, pattern_type, name, description,
              confidence, severity, valid_from, valid_until, labels, external_references,
              raw_object, embedding, feed_id, feed_name, ingested_at, created_at, modified_at
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20
            )
            ON CONFLICT (stix_id) DO UPDATE SET
              raw_object = EXCLUDED.raw_object,
              embedding = COALESCE(EXCLUDED.embedding, stix_iocs.embedding),
              modified_at = EXCLUDED.modified_at,
              ingested_at = EXCLUDED.ingested_at
            `,
            [
              record.stix_id,
              record.stix_type,
              record.value,
              record.pattern,
              record.pattern_type,
              record.name,
              record.description,
              record.confidence,
              record.severity,
              record.valid_from,
              record.valid_until,
              record.labels,
              JSON.stringify(record.external_references),
              JSON.stringify(record.raw_object),
              embedding ? `[${embedding.join(',')}]` : null,
              record.feed_id,
              record.feed_name,
              record.ingested_at,
              record.created_at,
              record.modified_at,
            ]
          );

          result.stored++;
        } catch (error) {
          result.errors.push({
            id: object.id,
            error: (error as Error).message,
          });
        }
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    logger.info(
      { stored: result.stored, errors: result.errors.length },
      'Batch store completed'
    );

    return result;
  }

  /**
   * Get a STIX object by ID
   */
  async get(stixId: StixId): Promise<IOCRecord | null> {
    await this.ensureInitialized();

    const result = await this.pool.query<IOCRecord>(
      'SELECT * FROM stix_iocs WHERE stix_id = $1',
      [stixId]
    );

    return result.rows[0] || null;
  }

  /**
   * Search IOCs with full-text and vector similarity
   */
  async search(options: SearchOptions): Promise<SearchResult[]> {
    await this.ensureInitialized();

    const conditions: string[] = ['1=1'];
    const params: unknown[] = [];
    let paramIndex = 1;

    // Type filter
    if (options.types && options.types.length > 0) {
      conditions.push(`stix_type = ANY($${paramIndex})`);
      params.push(options.types);
      paramIndex++;
    }

    // Confidence filter
    if (options.minConfidence !== undefined) {
      conditions.push(`confidence >= $${paramIndex}`);
      params.push(options.minConfidence);
      paramIndex++;
    }

    // Labels filter
    if (options.labels && options.labels.length > 0) {
      conditions.push(`labels && $${paramIndex}`);
      params.push(options.labels);
      paramIndex++;
    }

    // Feed filter
    if (options.feedIds && options.feedIds.length > 0) {
      conditions.push(`feed_id = ANY($${paramIndex})`);
      params.push(options.feedIds);
      paramIndex++;
    }

    // Date range filters
    if (options.validFrom) {
      conditions.push(`valid_from >= $${paramIndex}`);
      params.push(options.validFrom);
      paramIndex++;
    }

    if (options.validUntil) {
      conditions.push(`valid_until <= $${paramIndex}`);
      params.push(options.validUntil);
      paramIndex++;
    }

    const limit = options.limit || 50;
    const offset = options.offset || 0;

    let query: string;
    let orderBy: string;

    // Vector similarity search
    if (options.embedding && options.embedding.length === this.embeddingDimension) {
      const embeddingStr = `[${options.embedding.join(',')}]`;
      const threshold = options.similarityThreshold || 0.7;

      query = `
        SELECT *,
          1 - (embedding <=> $${paramIndex}::vector) as similarity
        FROM stix_iocs
        WHERE ${conditions.join(' AND ')}
          AND embedding IS NOT NULL
          AND 1 - (embedding <=> $${paramIndex}::vector) >= $${paramIndex + 1}
      `;
      params.push(embeddingStr, threshold);
      paramIndex += 2;
      orderBy = 'similarity DESC';
    }
    // Full-text search
    else if (options.query) {
      const tsQuery = options.query
        .split(/\s+/)
        .map((term) => term + ':*')
        .join(' & ');

      query = `
        SELECT *,
          ts_rank(search_vector, to_tsquery('english', $${paramIndex})) as score
        FROM stix_iocs
        WHERE ${conditions.join(' AND ')}
          AND search_vector @@ to_tsquery('english', $${paramIndex})
      `;
      params.push(tsQuery);
      paramIndex++;
      orderBy = 'score DESC';
    }
    // Basic filter search
    else {
      query = `
        SELECT *
        FROM stix_iocs
        WHERE ${conditions.join(' AND ')}
      `;
      orderBy = 'ingested_at DESC';
    }

    query += ` ORDER BY ${orderBy} LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await this.pool.query<IOCRecord & { score?: number; similarity?: number }>(
      query,
      params
    );

    return result.rows.map((row) => ({
      record: row,
      score: row.score,
      similarity: row.similarity,
    }));
  }

  /**
   * Find similar IOCs by embedding
   */
  async findSimilar(
    embedding: number[],
    limit = 10,
    threshold = 0.7
  ): Promise<SearchResult[]> {
    await this.ensureInitialized();

    const embeddingStr = `[${embedding.join(',')}]`;

    const result = await this.pool.query<IOCRecord & { similarity: number }>(
      `
      SELECT *,
        1 - (embedding <=> $1::vector) as similarity
      FROM stix_iocs
      WHERE embedding IS NOT NULL
        AND 1 - (embedding <=> $1::vector) >= $2
      ORDER BY similarity DESC
      LIMIT $3
      `,
      [embeddingStr, threshold, limit]
    );

    return result.rows.map((row) => ({
      record: row,
      similarity: row.similarity,
    }));
  }

  /**
   * Update embedding for an existing record
   */
  async updateEmbedding(stixId: StixId, embedding: number[]): Promise<boolean> {
    await this.ensureInitialized();

    const embeddingStr = `[${embedding.join(',')}]`;

    const result = await this.pool.query(
      'UPDATE stix_iocs SET embedding = $1::vector WHERE stix_id = $2',
      [embeddingStr, stixId]
    );

    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Delete IOCs by feed
   */
  async deleteByFeed(feedId: string): Promise<number> {
    await this.ensureInitialized();

    const result = await this.pool.query(
      'DELETE FROM stix_iocs WHERE feed_id = $1',
      [feedId]
    );

    return result.rowCount ?? 0;
  }

  /**
   * Get feed sync state
   */
  async getFeedSyncState(
    feedId: string
  ): Promise<{ lastSync: string | null; cursor: string | null; totalSynced: number }> {
    await this.ensureInitialized();

    const result = await this.pool.query(
      'SELECT last_sync_timestamp, next_cursor, total_objects_synced FROM stix_feed_sync_state WHERE feed_id = $1',
      [feedId]
    );

    if (result.rows.length === 0) {
      return { lastSync: null, cursor: null, totalSynced: 0 };
    }

    return {
      lastSync: result.rows[0].last_sync_timestamp,
      cursor: result.rows[0].next_cursor,
      totalSynced: result.rows[0].total_objects_synced,
    };
  }

  /**
   * Update feed sync state
   */
  async updateFeedSyncState(
    feedId: string,
    collectionId: string,
    state: {
      lastSync?: string;
      cursor?: string;
      objectsSynced?: number;
      status?: string;
      error?: string;
    }
  ): Promise<void> {
    await this.ensureInitialized();

    await this.pool.query(
      `
      INSERT INTO stix_feed_sync_state (
        feed_id, collection_id, last_sync_timestamp, next_cursor,
        total_objects_synced, sync_status, error_message, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      ON CONFLICT (feed_id) DO UPDATE SET
        last_sync_timestamp = COALESCE($3, stix_feed_sync_state.last_sync_timestamp),
        next_cursor = $4,
        total_objects_synced = stix_feed_sync_state.total_objects_synced + COALESCE($5, 0),
        sync_status = COALESCE($6, stix_feed_sync_state.sync_status),
        error_message = $7,
        updated_at = NOW()
      `,
      [
        feedId,
        collectionId,
        state.lastSync || null,
        state.cursor || null,
        state.objectsSynced || 0,
        state.status || 'idle',
        state.error || null,
      ]
    );
  }

  /**
   * Get statistics
   */
  async getStats(): Promise<{
    totalRecords: number;
    byType: Record<string, number>;
    byFeed: Record<string, number>;
    withEmbeddings: number;
    dateRange: { earliest: string | null; latest: string | null };
  }> {
    await this.ensureInitialized();

    const [totalResult, typeResult, feedResult, embeddingResult, dateResult] =
      await Promise.all([
        this.pool.query<{ count: string }>('SELECT COUNT(*) as count FROM stix_iocs'),
        this.pool.query<{ stix_type: string; count: string }>(
          'SELECT stix_type, COUNT(*) as count FROM stix_iocs GROUP BY stix_type'
        ),
        this.pool.query<{ feed_id: string; count: string }>(
          'SELECT feed_id, COUNT(*) as count FROM stix_iocs GROUP BY feed_id'
        ),
        this.pool.query<{ count: string }>(
          'SELECT COUNT(*) as count FROM stix_iocs WHERE embedding IS NOT NULL'
        ),
        this.pool.query<{ earliest: string; latest: string }>(
          'SELECT MIN(created_at) as earliest, MAX(created_at) as latest FROM stix_iocs'
        ),
      ]);

    return {
      totalRecords: parseInt(totalResult.rows[0].count, 10),
      byType: Object.fromEntries(
        typeResult.rows.map((r) => [r.stix_type, parseInt(r.count, 10)])
      ),
      byFeed: Object.fromEntries(
        feedResult.rows.map((r) => [r.feed_id, parseInt(r.count, 10)])
      ),
      withEmbeddings: parseInt(embeddingResult.rows[0].count, 10),
      dateRange: {
        earliest: dateResult.rows[0]?.earliest || null,
        latest: dateResult.rows[0]?.latest || null,
      },
    };
  }

  /**
   * Close the connection pool
   */
  async close(): Promise<void> {
    await this.pool.end();
    logger.info('PgVectorStore connection closed');
  }

  // =========================================================================
  // Private Helpers
  // =========================================================================

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  private objectToRecord(
    object: StixObject,
    metadata: IngestionMetadata,
    embedding?: number[]
  ): Omit<IOCRecord, 'id'> {
    const common = object as {
      id: StixId;
      type: string;
      created: string;
      modified: string;
      confidence?: number;
      labels?: string[];
      external_references?: object[];
      name?: string;
      description?: string;
    };

    let value: string | undefined;
    let pattern: string | undefined;
    let patternType: string | undefined;
    let validFrom: string | undefined;
    let validUntil: string | undefined;
    let severity: string | undefined;

    // Extract type-specific fields
    if (object.type === 'indicator') {
      const indicator = object as Indicator;
      pattern = indicator.pattern;
      patternType = indicator.pattern_type;
      validFrom = indicator.valid_from;
      validUntil = indicator.valid_until;
      value = this.extractValueFromPattern(pattern);
    } else if (object.type === 'malware') {
      const malware = object as Malware;
      value = malware.name;
    } else if (object.type === 'threat-actor') {
      const actor = object as ThreatActor;
      value = actor.name;
      severity = actor.sophistication;
    } else if (object.type === 'vulnerability') {
      const vuln = object as Vulnerability;
      value = vuln.name;
    }

    return {
      stix_id: object.id,
      stix_type: object.type,
      value: value || common.name || '',
      pattern,
      pattern_type: patternType,
      name: common.name,
      description: common.description,
      confidence: common.confidence,
      severity,
      valid_from: validFrom,
      valid_until: validUntil,
      labels: common.labels,
      external_references: common.external_references,
      raw_object: object as unknown as object,
      embedding,
      feed_id: metadata.feedId,
      feed_name: metadata.feedName,
      ingested_at: metadata.ingestedAt,
      created_at: common.created,
      modified_at: common.modified,
    };
  }

  private extractValueFromPattern(pattern: string): string | undefined {
    // Extract value from STIX pattern like [ipv4-addr:value = '1.2.3.4']
    const match = pattern.match(/=\s*'([^']+)'/);
    return match ? match[1] : undefined;
  }
}

/**
 * Factory function to create PgVectorStore
 */
export function createPgVectorStore(config?: PgVectorStoreConfig): PgVectorStore {
  return new PgVectorStore(config);
}
