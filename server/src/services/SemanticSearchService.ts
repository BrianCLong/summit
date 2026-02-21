import { Pool } from 'pg';
import EmbeddingService from './EmbeddingService.js';
import { synonymService } from './SynonymService.js';
import pino from 'pino';

// Manual interface to match what search.ts expects if we return raw rows,
// but we defined SemanticSearchResult.
export interface SemanticSearchFilters {
  status?: string[];
  dateFrom?: string;
  dateTo?: string;
}

export interface SemanticSearchResult {
  id: string;
  title: string;
  score: number;
  similarity: number;
  status: string;
  created_at: Date;
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
  private logger = (pino as any)({ name: 'SemanticSearchService' });
  private pool: Pool | null = null;
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
  async indexDocument(doc: { id?: string; text?: string }) {
    this.logger.warn("indexDocument is deprecated in SemanticSearchService. Use specific indexing methods.");
    if (doc.id && doc.text) {
      await this.indexCase(doc.id, doc.text);
    }
  }

  // Deprecated search method for backward compatibility
  async search(query: string, filters: Record<string, unknown> = {}, limit = 10): Promise<Array<{ id: string; text: string; score: number; metadata: { status: string; date: Date } }>> {
    this.logger.warn("search() is deprecated in SemanticSearchService. Use searchCases() or update usage.");
    const results = await this.searchCases(query, {
      status: undefined,
    }, limit);

    return results.map((r: any) => ({
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

  async searchCases(
    query: string,
    filters: SemanticSearchFilters = {},
    limit = 20
  ): Promise<SemanticSearchResult[]> {
    try {
      // 1. Synonym Expansion for Embedding ONLY
      // We expand the query to get a richer vector representation.
      const expandedQuery = synonymService.expandQuery(query);
      this.logger.debug({ query, expandedQuery }, "Expanded query with synonyms");

      // 2. Generate Embedding
      const vector = await this.embeddingService.generateEmbedding({ text: expandedQuery });
      const vectorStr = `[${vector.join(',')}]`;

      // 3. Build Query with Hybrid Scoring
      // We use the ORIGINAL query for the text rank part to ensure we boost exact matches
      // of what the user actually typed, avoiding the AND-logic pitfall with synonyms.
      // Vector search handles the semantic similarity (synonyms).

      const pool = await this.getPool();
      const client = await pool.connect();
      try {
        const whereClauses = [`embedding IS NOT NULL`];
        const params: any[] = [vectorStr];
        let pIdx = 2;

        if (filters.status && filters.status.length) {
          whereClauses.push(`status = ANY($${pIdx})`);
          params.push(filters.status);
          pIdx++;
        }

        if (filters.dateFrom) {
          whereClauses.push(`created_at >= $${pIdx}`);
          params.push(filters.dateFrom);
          pIdx++;
        }

        if (filters.dateTo) {
          whereClauses.push(`created_at <= $${pIdx}`);
          params.push(filters.dateTo);
          pIdx++;
        }

        // Add ORIGINAL query text for ts_rank
        params.push(query);
        const qIdx = pIdx;

        // Add limit parameter
        params.push(Math.max(1, parseInt(String(limit), 10) || 20));
        const lIdx = qIdx + 1;

        const sql = `
          SELECT
            id,
            title,
            status,
            created_at,
            1 - (embedding <=> $1::vector) as similarity,
            ts_rank(to_tsvector('english', title || ' ' || coalesce(description,'')), plainto_tsquery('english', $${qIdx})) as text_rank
          FROM cases
          WHERE ${whereClauses.join(' AND ')}
          ORDER BY ( (1 - (embedding <=> $1::vector)) * 0.7 + (ts_rank(to_tsvector('english', title || ' ' || coalesce(description,'')), plainto_tsquery('english', $${qIdx})) / 10.0) * 0.3 ) DESC
          LIMIT $${lIdx}
        `;

        const res = await client.query(sql, params);

        return res.rows.map((r: Record<string, unknown>) => ({
          id: r.id as string,
          title: r.title as string,
          status: r.status as string,
          created_at: r.created_at as Date,
          similarity: parseFloat(r.similarity as string),
          score: parseFloat(r.similarity as string)
        }));
      } finally {
        client.release();
      }
    } catch (err: any) {
      this.logger.error({ err }, "Semantic search failed");
      return [];
    }
  }

  async searchDocs(query: string, limit = 10) {
    try {
      const vector = await this.embeddingService.generateEmbedding({ text: query });
      const vectorStr = `[${vector.join(',')}]`;
      const pool = await this.getPool();

      const sql = `
        SELECT
          path,
          title,
          metadata,
          1 - (embedding <=> $1::vector) as similarity
        FROM knowledge_articles
        WHERE embedding IS NOT NULL
        ORDER BY similarity DESC
        LIMIT $2
      `;

      const res = await pool.query(sql, [vectorStr, limit]);
      return res.rows.map((r: any) => ({
        path: r.path,
        title: r.title,
        metadata: r.metadata,
        similarity: parseFloat(r.similarity)
      }));
    } catch (err: any) {
      this.logger.error({ err }, "Doc search failed");
      return [];
    }
  }
}
