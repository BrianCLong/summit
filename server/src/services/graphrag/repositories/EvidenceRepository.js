"use strict";
/**
 * Evidence Repository
 * Retrieves evidence snippets linked to a case with relevance scoring
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryEvidenceRepository = exports.PostgresEvidenceRepository = void 0;
exports.createEvidenceRepository = createEvidenceRepository;
const timescale_js_1 = require("../../../db/timescale.js");
const logger_js_1 = __importDefault(require("../../../utils/logger.js"));
const DEFAULT_MAX_SNIPPETS = 20;
class PostgresEvidenceRepository {
    /**
     * Search for evidence snippets relevant to a query within a case
     */
    async searchEvidenceSnippets(params) {
        const { caseId, query, maxSnippets = DEFAULT_MAX_SNIPPETS } = params;
        try {
            // Use PostgreSQL full-text search for relevance ranking
            // Falls back to ILIKE if ts_vector not available
            const result = await (0, timescale_js_1.query)(`
        WITH evidence_with_claims AS (
          SELECT
            e.id AS evidence_id,
            e.content AS snippet,
            e.source_system,
            e.classification,
            e.license_id,
            e.metadata,
            c.id AS claim_id,
            c.content_hash AS claim_hash,
            COALESCE(
              ts_rank(to_tsvector('english', e.content), plainto_tsquery('english', $2)),
              CASE WHEN e.content ILIKE '%' || $2 || '%' THEN 0.5 ELSE 0.1 END
            ) AS relevance_score
          FROM case_evidence e
          LEFT JOIN claims_registry c ON e.id = ANY(
            SELECT unnest(string_to_array(c.evidence_hashes::text, ','))
          )
          WHERE e.case_id = $1
            AND (
              e.content ILIKE '%' || $2 || '%'
              OR to_tsvector('english', e.content) @@ plainto_tsquery('english', $2)
            )
        )
        SELECT
          evidence_id,
          claim_id,
          source_system,
          snippet,
          relevance_score AS score,
          classification,
          license_id,
          metadata
        FROM evidence_with_claims
        ORDER BY relevance_score DESC
        LIMIT $3
      `, [caseId, query, maxSnippets]);
            const snippets = result.rows.map((row) => ({
                evidenceId: row.evidence_id,
                claimId: row.claim_id,
                sourceSystem: row.source_system,
                snippet: row.snippet,
                score: parseFloat(row.score) || 0,
                classification: row.classification,
                licenseId: row.license_id,
                metadata: row.metadata,
            }));
            logger_js_1.default.debug({
                message: 'Evidence snippets retrieved',
                caseId,
                query: query.substring(0, 50),
                snippetCount: snippets.length,
            });
            return snippets;
        }
        catch (error) {
            logger_js_1.default.error({
                message: 'Failed to search evidence snippets',
                caseId,
                error: error instanceof Error ? error.message : String(error),
            });
            // Try simpler query as fallback
            return this.searchEvidenceSnippetsFallback(params);
        }
    }
    /**
     * Fallback search using simpler query structure
     */
    async searchEvidenceSnippetsFallback(params) {
        const { caseId, query, maxSnippets = DEFAULT_MAX_SNIPPETS } = params;
        try {
            const result = await (0, timescale_js_1.query)(`
        SELECT
          id AS evidence_id,
          NULL AS claim_id,
          source_system,
          content AS snippet,
          0.5 AS score,
          classification,
          license_id,
          metadata
        FROM case_evidence
        WHERE case_id = $1
          AND content ILIKE '%' || $2 || '%'
        ORDER BY created_at DESC
        LIMIT $3
      `, [caseId, query, maxSnippets]);
            return result.rows.map((row) => ({
                evidenceId: row.evidence_id,
                claimId: row.claim_id,
                sourceSystem: row.source_system,
                snippet: row.snippet,
                score: parseFloat(row.score) || 0,
                classification: row.classification,
                licenseId: row.license_id,
                metadata: row.metadata,
            }));
        }
        catch (error) {
            logger_js_1.default.error({
                message: 'Fallback evidence search also failed',
                caseId,
                error: error instanceof Error ? error.message : String(error),
            });
            return [];
        }
    }
    /**
     * Get a specific evidence item by ID
     */
    async getEvidenceById(evidenceId) {
        try {
            const result = await (0, timescale_js_1.query)(`
        SELECT
          id AS evidence_id,
          source_system,
          content AS snippet,
          classification,
          license_id,
          metadata
        FROM case_evidence
        WHERE id = $1
      `, [evidenceId]);
            if (result.rows.length === 0) {
                return null;
            }
            const row = result.rows[0];
            return {
                evidenceId: row.evidence_id,
                sourceSystem: row.source_system,
                snippet: row.snippet,
                score: 1.0, // Direct lookup = max relevance
                classification: row.classification,
                licenseId: row.license_id,
                metadata: row.metadata,
            };
        }
        catch (error) {
            logger_js_1.default.error({
                message: 'Failed to get evidence by ID',
                evidenceId,
                error: error instanceof Error ? error.message : String(error),
            });
            return null;
        }
    }
}
exports.PostgresEvidenceRepository = PostgresEvidenceRepository;
/**
 * In-memory implementation for testing
 */
class InMemoryEvidenceRepository {
    evidence = new Map();
    evidenceById = new Map();
    addCaseEvidence(caseId, snippets) {
        this.evidence.set(caseId, snippets);
        for (const snippet of snippets) {
            this.evidenceById.set(snippet.evidenceId, snippet);
        }
    }
    async searchEvidenceSnippets(params) {
        const { caseId, query, maxSnippets = DEFAULT_MAX_SNIPPETS } = params;
        const caseEvidence = this.evidence.get(caseId) ?? [];
        const queryLower = query.toLowerCase();
        // Simple keyword matching with scoring
        const matched = caseEvidence
            .map((e) => {
            const snippetLower = e.snippet.toLowerCase();
            const matchCount = queryLower
                .split(/\s+/)
                .filter((word) => snippetLower.includes(word)).length;
            const totalWords = queryLower.split(/\s+/).length;
            const score = totalWords > 0 ? matchCount / totalWords : 0;
            return { ...e, score: Math.max(e.score, score) };
        })
            .filter((e) => e.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, maxSnippets);
        return matched;
    }
    async getEvidenceById(evidenceId) {
        return this.evidenceById.get(evidenceId) ?? null;
    }
    clear() {
        this.evidence.clear();
        this.evidenceById.clear();
    }
}
exports.InMemoryEvidenceRepository = InMemoryEvidenceRepository;
function createEvidenceRepository() {
    if (process.env.NODE_ENV === 'test') {
        return new InMemoryEvidenceRepository();
    }
    return new PostgresEvidenceRepository();
}
