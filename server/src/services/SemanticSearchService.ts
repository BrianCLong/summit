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

export default class SemanticSearchService {
  private embeddingService: EmbeddingService;
  private logger = pino({ name: 'SemanticSearchService' });
  private pool: Pool | null = null;

  constructor() {
    this.embeddingService = new EmbeddingService();
  }

  // Use a managed pool or create one if needed
  private getPool(): Pool {
    if (!this.pool) {
      this.pool = new Pool({ connectionString: process.env.DATABASE_URL });
    }
    return this.pool;
  }

  // Ensure we close the pool if we created it
  async close() {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
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
      const client = await this.getPool().connect();
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

      const client = await this.getPool().connect();
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
          LIMIT ${limit}
        `;

        const res = await client.query(sql, params);

        return res.rows.map(r => ({
          id: r.id,
          title: r.title,
          status: r.status,
          created_at: r.created_at,
          similarity: parseFloat(r.similarity),
          score: parseFloat(r.similarity)
        }));
      } finally {
        client.release();
      }
    } catch (err) {
        this.logger.error({ err }, "Semantic search failed");
        return [];
    }
  }
}
