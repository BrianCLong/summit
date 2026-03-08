"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RetrievalService = void 0;
const pg_js_1 = require("../../../db/pg.js");
const EmbeddingService_js_1 = __importDefault(require("../../../services/EmbeddingService.js"));
class RetrievalService {
    embeddingService;
    constructor() {
        this.embeddingService = new EmbeddingService_js_1.default();
    }
    async retrieve(query) {
        const { tenantId, query: text, topK, collectionIds, filter, sensitivityMax } = query;
        // 1. Generate embedding for query
        const queryEmbedding = await this.embeddingService.generateEmbedding({ text });
        const embeddingStr = JSON.stringify(queryEmbedding);
        // 2. Build SQL Query
        let whereClause = `tenant_id = $1`;
        const params = [tenantId, embeddingStr, topK];
        let paramIdx = 4;
        // Filter by Collection IDs
        if (collectionIds && collectionIds.length > 0) {
            whereClause += ` AND collection_id = ANY($${paramIdx})`;
            params.push(collectionIds);
            paramIdx++;
        }
        // Filter by Sensitivity (Policy Enforcement)
        if (sensitivityMax) {
            // Simple hierarchy: public < internal < confidential < restricted
            const levels = ['public', 'internal', 'confidential', 'restricted'];
            const maxLevelIndex = levels.indexOf(sensitivityMax);
            if (maxLevelIndex !== -1) {
                const allowedLevels = levels.slice(0, maxLevelIndex + 1);
                whereClause += ` AND sensitivity = ANY($${paramIdx})`;
                params.push(allowedLevels);
                paramIdx++;
            }
        }
        else {
            // Default to safe 'internal' if not specified, or maybe allow all if system is permissive?
            // Better safe: default to 'internal'
            whereClause += ` AND sensitivity IN ('public', 'internal')`;
        }
        // Handle Metadata Filters (JSONB containment)
        if (filter && Object.keys(filter).length > 0) {
            whereClause += ` AND metadata @> $${paramIdx}`;
            params.push(JSON.stringify(filter));
            paramIdx++;
        }
        const sql = `
      SELECT
        id, document_id, collection_id, text, metadata, sensitivity,
        1 - (embedding <=> $2) as score
      FROM doc_chunks
      WHERE ${whereClause}
      ORDER BY embedding <=> $2
      LIMIT $3
    `;
        const rows = await pg_js_1.pg.many(sql, params, { tenantId });
        const chunks = rows.map((r) => ({
            chunkId: r.id,
            documentId: r.document_id,
            collectionId: r.collection_id,
            text: r.text,
            score: r.score,
            metadata: r.metadata || {}
        }));
        return {
            query,
            chunks,
            diagnostics: {
                rawScores: chunks.map(c => c.score),
                appliedFilters: filter
            }
        };
    }
}
exports.RetrievalService = RetrievalService;
