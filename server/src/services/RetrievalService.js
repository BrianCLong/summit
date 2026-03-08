"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RetrievalService = void 0;
const pg_1 = require("pg");
class RetrievalService {
    pgPool;
    constructor() {
        this.pgPool = new pg_1.Pool({ connectionString: process.env.DATABASE_URL });
    }
    /**
     * Hybrid retrieval combining vector search and keyword search
     */
    async retrieve(query, tenantId, options = {}) {
        const limit = options.limit || 5;
        const client = await this.pgPool.connect();
        try {
            let chunks = [];
            // Vector Search
            if (options.embedding) {
                // Using pgvector L2 distance (<->) or cosine (<=>)
                // Here assuming <=> for cosine distance (1 - cosine_similarity)
                const vectorRes = await client.query(`SELECT id, document_id, text, metadata, embedding <=> $1 as distance
           FROM chunks
           WHERE tenant_id = $2
           ORDER BY distance ASC
           LIMIT $3`, [`[${options.embedding.join(',')}]`, tenantId, limit]);
                chunks = vectorRes.rows;
            }
            else {
                // Fallback to keyword search if no embedding
                const keywordRes = await client.query(`SELECT id, document_id, text, metadata
           FROM chunks
           WHERE tenant_id = $1 AND text ILIKE $2
           LIMIT $3`, [tenantId, `%${query}%`, limit]);
                chunks = keywordRes.rows;
            }
            // Map to Chunk type
            const mappedChunks = chunks.map((r) => ({
                id: r.id,
                tenantId,
                documentId: r.document_id,
                text: r.text,
                offset: 0, // Not retrieved from DB query above for brevity
                metadata: r.metadata
            }));
            // Graph Retrieval (Find related entities)
            // For now, just finding entities mentioned in retrieved documents
            const docIds = [...new Set(mappedChunks.map(c => c.documentId))];
            let entities = [];
            if (docIds.length > 0) {
                const entityRes = await client.query(`SELECT unnest(entity_ids) as entity_id FROM documents WHERE id = ANY($1) AND tenant_id = $2`, [docIds, tenantId]);
                const entityIds = entityRes.rows.map((r) => r.entity_id);
                if (entityIds.length > 0) {
                    const entitiesDetails = await client.query(`SELECT * FROM entities WHERE id = ANY($1) AND tenant_id = $2`, [entityIds, tenantId]);
                    entities = entitiesDetails.rows.map((r) => ({
                        id: r.id,
                        tenantId: r.tenant_id,
                        kind: r.kind,
                        externalRefs: r.external_refs,
                        labels: r.labels,
                        properties: r.properties,
                        createdAt: r.created_at,
                        updatedAt: r.updated_at,
                        sourceIds: r.source_ids
                    }));
                }
            }
            return { chunks: mappedChunks, entities };
        }
        finally {
            client.release();
        }
    }
}
exports.RetrievalService = RetrievalService;
