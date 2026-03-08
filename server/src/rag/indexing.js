"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RagIndexer = void 0;
const chunking_js_1 = require("./chunking.js");
const uuid_1 = require("uuid");
const pg_js_1 = require("../db/pg.js");
// Stub for Embedding Service
async function generateEmbedding(text) {
    // In a real implementation, call OpenAI or local model
    return new Array(1536).fill(0).map(() => Math.random());
}
class RagIndexer {
    logger;
    constructor(logger) {
        this.logger = logger;
    }
    async indexDocument(doc) {
        this.logger.info({ docId: doc.id }, 'Indexing document for RAG');
        // 1. Chunk
        const textChunks = (0, chunking_js_1.chunkText)(doc.text);
        // 2. Embed & Create Chunk Objects
        const chunks = [];
        for (let i = 0; i < textChunks.length; i++) {
            const text = textChunks[i];
            const embedding = await generateEmbedding(text);
            chunks.push({
                id: (0, uuid_1.v4)(),
                tenantId: doc.tenantId,
                documentId: doc.id,
                text,
                embedding,
                tokenCount: text.length / 4, // Approx
                offset: i,
                metadata: { source: doc.source },
                entityIds: doc.entityIds
            });
        }
        // 3. Persist
        await this.saveChunks(chunks);
        this.logger.info({ docId: doc.id, chunks: chunks.length }, 'Document indexed');
    }
    async saveChunks(chunks) {
        // Should use COPY or batch insert
        for (const chunk of chunks) {
            // Need to format vector for pgvector
            const vectorStr = `[${chunk.embedding?.join(',')}]`;
            await pg_js_1.pg.none(`INSERT INTO document_chunks (id, tenant_id, document_id, text, token_count, "offset", metadata, entity_ids, embedding)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::vector)`, [
                chunk.id,
                chunk.tenantId,
                chunk.documentId,
                chunk.text,
                chunk.tokenCount,
                chunk.offset,
                JSON.stringify(chunk.metadata),
                chunk.entityIds,
                vectorStr
            ]);
        }
    }
}
exports.RagIndexer = RagIndexer;
