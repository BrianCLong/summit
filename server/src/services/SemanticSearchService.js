"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const pg_1 = require("pg");
const EmbeddingService_js_1 = __importDefault(require("./EmbeddingService.js"));
const SynonymService_js_1 = require("./SynonymService.js");
const pino_1 = __importDefault(require("pino"));
class SemanticSearchService {
    embeddingService;
    logger = pino_1.default({ name: 'SemanticSearchService' });
    pool = null;
    ownsPool;
    poolFactory;
    healthCheckIntervalMs;
    healthCheckTimeoutMs;
    lastHealthCheckAt = 0;
    constructor(options = {}) {
        this.pool = options.pool ?? null;
        this.ownsPool = !options.pool;
        this.poolFactory =
            options.poolFactory ?? (() => {
                if (!process.env.DATABASE_URL) {
                    throw new Error('DATABASE_URL must be set to initialize SemanticSearchService pool');
                }
                return new pg_1.Pool({ connectionString: process.env.DATABASE_URL });
            });
        this.healthCheckIntervalMs = options.healthCheckIntervalMs ?? 30_000;
        this.healthCheckTimeoutMs = options.healthCheckTimeoutMs ?? 3_000;
        this.embeddingService = options.embeddingService ?? new EmbeddingService_js_1.default();
    }
    // Use a managed pool or create one if needed
    async getPool() {
        if (!this.pool || this.pool.ended) {
            this.pool = this.poolFactory();
            this.lastHealthCheckAt = 0; // force health check on new pool
        }
        await this.runHealthCheckIfStale(this.pool);
        return this.pool;
    }
    async runHealthCheckIfStale(pool) {
        const now = Date.now();
        if (now - this.lastHealthCheckAt < this.healthCheckIntervalMs) {
            return;
        }
        const healthCheck = pool.query('SELECT 1');
        const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Semantic search health check timed out')), this.healthCheckTimeoutMs));
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
    async indexDocument(doc) {
        this.logger.warn("indexDocument is deprecated in SemanticSearchService. Use specific indexing methods.");
        if (doc.id && doc.text) {
            await this.indexCase(doc.id, doc.text);
        }
    }
    // Deprecated search method for backward compatibility
    async search(query, filters = {}, limit = 10) {
        this.logger.warn("search() is deprecated in SemanticSearchService. Use searchCases() or update usage.");
        const results = await this.searchCases(query, {
            status: undefined,
        }, limit);
        return results.map((r) => ({
            id: r.id,
            text: r.title,
            score: r.score,
            metadata: { status: r.status, date: r.created_at }
        }));
    }
    async indexCase(caseId, text) {
        try {
            const vector = await this.embeddingService.generateEmbedding({ text });
            const vectorStr = `[${vector.join(',')}]`;
            const pool = await this.getPool();
            const client = await pool.connect();
            try {
                await client.query(`UPDATE cases SET embedding = $1::vector WHERE id = $2`, [vectorStr, caseId]);
            }
            finally {
                client.release();
            }
        }
        catch (err) {
            this.logger.error({ err, caseId }, "Failed to index case");
        }
    }
    async searchCases(query, filters = {}, limit = 20) {
        try {
            // 1. Synonym Expansion for Embedding ONLY
            // We expand the query to get a richer vector representation.
            const expandedQuery = SynonymService_js_1.synonymService.expandQuery(query);
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
                const params = [vectorStr];
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
                return res.rows.map((r) => ({
                    id: r.id,
                    title: r.title,
                    status: r.status,
                    created_at: r.created_at,
                    similarity: parseFloat(r.similarity),
                    score: parseFloat(r.similarity)
                }));
            }
            finally {
                client.release();
            }
        }
        catch (err) {
            this.logger.error({ err }, "Semantic search failed");
            return [];
        }
    }
    async searchDocs(query, limit = 10) {
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
            return res.rows.map((r) => ({
                path: r.path,
                title: r.title,
                metadata: r.metadata,
                similarity: parseFloat(r.similarity)
            }));
        }
        catch (err) {
            this.logger.error({ err }, "Doc search failed");
            return [];
        }
    }
}
exports.default = SemanticSearchService;
