// @ts-nocheck
import { Pool } from 'pg';
import EmbeddingService from './EmbeddingService.js';
import { synonymService } from './SynonymService.js';
// @ts-ignore
import { default as pino } from 'pino';

// Manual interface to match what search.ts expects if we return raw rows,
// but we defined SemanticSearchResult.
export interface SemanticSearchFilters {
  status?: string[];
  dateFrom?: string;
  dateTo?: string;
  entityType?: string[];
  evidenceCategory?: string[];
}

export interface SemanticSearchResult {
  id: string;
  title: string;
  score: number;
  similarity: number;
  status: string;
  created_at: Date;
  matchType?: 'vector' | 'keyword' | 'hybrid';
}

export interface SemanticSearchOptions {
  /**
   * Optional pool to reuse. When provided, the service will not attempt to close it.
   */
  pool?: Pool;

  /**
   * Optional factory used to lazily create a pool when one is not provided.
   * Defaults to creating a pool from DATABASE_URL.
   */
  poolFactory?: () => Pool;

  /**
   * Frequency for verifying connection health. Defaults to 30s to avoid per-call overhead.
   */
  healthCheckIntervalMs?: number;

  /**
   * Timeout for the health check query.
   */
  healthCheckTimeoutMs?: number;

  /**
   * Custom embedding service, useful for tests.
   */
  embeddingService?: EmbeddingService;
}

export default class SemanticSearchService {
  private embeddingService: EmbeddingService;
  private logger = pino({ name: 'SemanticSearchService' });
  private pool: Pool | null;
  private readonly ownsPool: boolean;
  private readonly poolFactory: () => Pool;
  private readonly healthCheckIntervalMs: number;
  private readonly healthCheckTimeoutMs: number;
  private lastHealthCheckAt = 0;

  constructor(options: SemanticSearchOptions = {}) {
    this.pool = options.pool ?? null;
    this.ownsPool = !options.pool;
    this.poolFactory =
      options.poolFactory ?? (() => {
        if (!process.env.DATABASE_URL) {
          throw new Error('DATABASE_URL must be set to initialize SemanticSearchService pool');
        }
        return new Pool({ connectionString: process.env.DATABASE_URL });
      });
    this.healthCheckIntervalMs = options.healthCheckIntervalMs ?? 30_000;
    this.healthCheckTimeoutMs = options.healthCheckTimeoutMs ?? 3_000;
    this.embeddingService = options.embeddingService ?? new EmbeddingService();
  }

  // Use a managed pool or create one if needed
  private async getPool(): Promise<Pool> {
    if (!this.pool || this.pool.ended) {
      this.pool = this.poolFactory();
      this.lastHealthCheckAt = 0; // force health check on new pool
    }

    await this.runHealthCheckIfStale(this.pool);
    return this.pool;
  }

  private async runHealthCheckIfStale(pool: Pool) {
    const now = Date.now();
    if (now - this.lastHealthCheckAt < this.healthCheckIntervalMs) {
      return;
    }

    const healthCheck = pool.query('SELECT 1');
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Semantic search health check timed out')), this.healthCheckTimeoutMs)
    );

    await Promise.race([healthCheck, timeout]);
    this.lastHealthCheckAt = now;
  }

  // Ensure we close the pool if we created it
  async close() {
    if (this.pool && this.ownsPool) {
      await this.pool.end();
    }
    this.pool = null;
  }

  // Deprecated indexDocument for backward compatibility
  async indexDocument(doc: any) {
    this.logger.warn("indexDocument is deprecated in SemanticSearchService. Use specific indexing methods.");
    if (doc.id && doc.text) {
      await this.indexCase(doc.id, doc.text);
    }
  }

  // Deprecated search method for backward compatibility
  async search(query: string, filters: any = {}, limit = 10): Promise<any[]> {
    this.logger.warn("search() is deprecated in SemanticSearchService. Use searchCases() or update usage.");
    const results = await this.searchCases(query, {
      status: undefined,
    }, limit);

    return results.map(r => ({
      id: r.id,
      text: r.title,
      score: r.score,
      metadata: { status: r.status, date: r.created_at }
    }));
  }

  async indexCase(caseId: string, text: string) {
    try {
      const vector = await this.embeddingService.generateEmbedding({ text });
      const vectorStr = `[${vector.join(',')}]`;
      const pool = await this.getPool();
      const client = await pool.connect();
      try {
        await client.query(
          `UPDATE cases SET embedding = $1::vector WHERE id = $2`,
          [vectorStr, caseId]
        );
      } finally {
        client.release();
      }
    } catch (err: any) {
      this.logger.error({ err, caseId }, "Failed to index case");
    }
  }

  /**
   * Performs a hybrid search using Reciprocal Rank Fusion (RRF).
   * Combines Vector Similarity Search (Semantic) and Keyword Search (BM25/ts_rank).
   */
  async searchCases(
    query: string,
    filters: SemanticSearchFilters = {},
    limit = 20
  ): Promise<SemanticSearchResult[]> {
    try {
      // 1. Synonym Expansion for Embedding
      const expandedQuery = synonymService.expandQuery(query);

      // 2. Generate Embedding
      const vector = await this.embeddingService.generateEmbedding({ text: expandedQuery });
      const vectorStr = `[${vector.join(',')}]`;

      const pool = await this.getPool();
      const client = await pool.connect();

      try {
        // Build base filters
        const whereConditions: string[] = [];
        const params: any[] = [];
        let pIdx = 1;

        if (filters.status && filters.status.length) {
          whereConditions.push(`status = ANY($${pIdx})`);
          params.push(filters.status);
          pIdx++;
        }
        if (filters.dateFrom) {
          whereConditions.push(`created_at >= $${pIdx}`);
          params.push(filters.dateFrom);
          pIdx++;
        }
        if (filters.dateTo) {
          whereConditions.push(`created_at <= $${pIdx}`);
          params.push(filters.dateTo);
          pIdx++;
        }

        // Entity & Category filters (assuming these JSONB keys exist in metadata)
        if (filters.entityType && filters.entityType.length) {
             // Use JSONB containment operator ?| (exists any) or similar logic
             // Assuming metadata is { entityTypes: ["TypeA", "TypeB"] }
             whereConditions.push(`metadata->'entityTypes' ?| $${pIdx}`);
             params.push(filters.entityType);
             pIdx++;
        }

        if (filters.evidenceCategory && filters.evidenceCategory.length) {
             whereConditions.push(`metadata->'evidenceCategory' ?| $${pIdx}`);
             params.push(filters.evidenceCategory);
             pIdx++;
        }

        const filterSql = whereConditions.length ? 'AND ' + whereConditions.join(' AND ') : '';

        // Push vector and query to params
        const vectorParamIdx = pIdx;
        params.push(vectorStr);
        pIdx++;

        const queryParamIdx = pIdx;
        params.push(query);
        pIdx++;

        // Add limits as parameters for security (SQL Injection prevention)
        const limitParamIdx = pIdx;
        params.push(limit);
        pIdx++;

        const searchLimitParamIdx = pIdx;
        const searchLimit = limit * 2;
        params.push(searchLimit);
        pIdx++;

        // RRF Constant
        const k = 60;

        // Perform Parallel Search via CTEs
        // We fetch top L results from both methods to fuse.
        // We compute rank inside CTE to ensure correctness.

        // NOTE: Ideally 'cases' table should have a GIN index on to_tsvector('english', title || ' ' || coalesce(description,''))
        // for performance on large datasets.
        const sql = `
          WITH vector_search AS (
            SELECT
              id,
              1 - (embedding <=> $${vectorParamIdx}::vector) as vector_score,
              ROW_NUMBER() OVER (ORDER BY embedding <=> $${vectorParamIdx}::vector) as rank_vec
            FROM cases
            WHERE embedding IS NOT NULL ${filterSql}
            ORDER BY embedding <=> $${vectorParamIdx}::vector
            LIMIT $${searchLimitParamIdx}
          ),
          text_search AS (
            SELECT
              id,
              ts_rank(to_tsvector('english', title || ' ' || coalesce(description,'')), plainto_tsquery('english', $${queryParamIdx})) as text_score,
              ROW_NUMBER() OVER (ORDER BY ts_rank(to_tsvector('english', title || ' ' || coalesce(description,'')), plainto_tsquery('english', $${queryParamIdx})) DESC) as rank_text
            FROM cases
            WHERE
              to_tsvector('english', title || ' ' || coalesce(description,'')) @@ plainto_tsquery('english', $${queryParamIdx})
              ${filterSql}
            ORDER BY text_score DESC
            LIMIT $${searchLimitParamIdx}
          ),
          combined_scores AS (
            SELECT
              COALESCE(v.id, t.id) as id,
              v.vector_score,
              t.text_score,
              COALESCE(1.0 / (${k} + v.rank_vec), 0.0) +
              COALESCE(1.0 / (${k} + t.rank_text), 0.0) as rrf_score
            FROM vector_search v
            FULL OUTER JOIN text_search t ON v.id = t.id
          )
          SELECT
            c.id,
            c.title,
            c.status,
            c.created_at,
            cs.rrf_score as score,
            COALESCE(cs.vector_score, 0) as similarity
          FROM combined_scores cs
          JOIN cases c ON cs.id = c.id
          ORDER BY cs.rrf_score DESC
          LIMIT $${limitParamIdx};
        `;

        const res = await client.query(sql, params);

        return res.rows.map(r => ({
          id: r.id,
          title: r.title,
          status: r.status,
          created_at: r.created_at,
          score: parseFloat(r.score),
          similarity: parseFloat(r.similarity),
          matchType: 'hybrid'
        }));

      } finally {
        client.release();
      }
    } catch (err) {
      this.logger.error({ err }, "Semantic search failed");
      return [];
    }
  }

  /**
   * Provides autocomplete suggestions based on case titles and tags.
   */
  async getAutocomplete(prefix: string, limit = 5): Promise<string[]> {
    try {
      const pool = await this.getPool();
      const client = await pool.connect();
      try {
        const sql = `
          SELECT title
          FROM cases
          WHERE title ILIKE $1 || '%'
          LIMIT $2
        `;
        const res = await client.query(sql, [prefix, limit]);
        return res.rows.map(r => r.title);
      } finally {
        client.release();
      }
    } catch (err) {
      this.logger.error({ err }, "Autocomplete failed");
      return [];
    }
  }
}
