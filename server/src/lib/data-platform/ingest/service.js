"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IngestionService = exports.IngestionWorker = exports.StoreStage = exports.EmbedStage = exports.ChunkStage = exports.NormalizeStage = exports.ParseStage = void 0;
const pipeline_js_1 = require("./pipeline.js");
const EmbeddingService_js_1 = __importDefault(require("../../../services/EmbeddingService.js"));
const pg_js_1 = require("../../../db/pg.js");
const crypto_1 = __importDefault(require("crypto"));
// --- STAGES ---
class ParseStage {
    name = 'parse';
    async execute(context) {
        if (!context.rawContent) {
            if (!context.text)
                throw new Error("No content to parse");
            return context;
        }
        // Fallback: assume UTF-8 text
        context.text = context.rawContent.toString('utf-8');
        return context;
    }
}
exports.ParseStage = ParseStage;
class NormalizeStage {
    name = 'normalize';
    async execute(context) {
        if (!context.text)
            return context;
        context.text = context.text.replace(/\s+/g, ' ').trim();
        return context;
    }
}
exports.NormalizeStage = NormalizeStage;
class ChunkStage {
    name = 'chunk';
    async execute(context) {
        if (!context.text)
            return context;
        // Simple chunking strategy: fixed size with overlap
        const chunkSize = 1000;
        const overlap = 100;
        const chunks = [];
        const text = context.text;
        let position = 0;
        for (let i = 0; i < text.length; i += (chunkSize - overlap)) {
            const chunkText = text.slice(i, i + chunkSize);
            chunks.push({
                text: chunkText,
                position: position++,
                metadata: {}
            });
            if (i + chunkSize >= text.length)
                break;
        }
        context.chunks = chunks;
        return context;
    }
}
exports.ChunkStage = ChunkStage;
class EmbedStage {
    name = 'embed';
    embeddingService;
    constructor() {
        this.embeddingService = new EmbeddingService_js_1.default();
    }
    async execute(context) {
        if (!context.chunks || context.chunks.length === 0)
            return context;
        const texts = context.chunks.map(c => c.text);
        const embeddings = await this.embeddingService.generateEmbeddings(texts);
        context.chunks.forEach((chunk, i) => {
            chunk.embedding = embeddings[i];
        });
        return context;
    }
}
exports.EmbedStage = EmbedStage;
class StoreStage {
    name = 'store';
    async execute(context) {
        if (!context.chunks)
            return context;
        const client = await pg_js_1.pool.connect();
        try {
            await client.query('BEGIN');
            // Update document status
            await client.query(`UPDATE documents SET processing_status = 'completed', updated_at = NOW() WHERE id = $1`, [context.documentId]);
            // Delete existing chunks
            await client.query(`DELETE FROM doc_chunks WHERE document_id = $1`, [context.documentId]);
            const insertQuery = `
        INSERT INTO doc_chunks (
          document_id, tenant_id, collection_id, position, text, embedding, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `;
            for (const chunk of context.chunks) {
                // PGVector formatting
                const embeddingStr = JSON.stringify(chunk.embedding);
                await client.query(insertQuery, [
                    context.documentId,
                    context.tenantId,
                    context.collectionId,
                    chunk.position,
                    chunk.text,
                    embeddingStr,
                    chunk.metadata
                ]);
            }
            await client.query('COMMIT');
        }
        catch (e) {
            await client.query('ROLLBACK');
            throw e;
        }
        finally {
            client.release();
        }
        return context;
    }
}
exports.StoreStage = StoreStage;
// --- WORKER / JOB PROCESSOR (Maestro Placeholder) ---
class IngestionWorker {
    async processJob(jobId, payload) {
        const { tenantId, collectionId, documentId, contentBase64, mimeType } = payload;
        const content = Buffer.from(contentBase64, 'base64');
        console.log(`[MaestroWorker] Processing ingestion job ${jobId} for doc ${documentId}`);
        // 1. Mark document as processing
        await pg_js_1.pg.write(`UPDATE documents SET processing_status = 'processing' WHERE id = $1`, [documentId], { tenantId });
        try {
            // 2. Build Pipeline
            const pipeline = new pipeline_js_1.IngestionPipeline([
                new ParseStage(),
                new NormalizeStage(),
                new ChunkStage(),
                new EmbedStage(),
                new StoreStage()
            ]);
            // 3. Run
            const context = {
                tenantId,
                collectionId,
                documentId,
                rawContent: content,
                metadata: { mimeType },
                startTime: Date.now(),
                config: {}
            };
            await pipeline.run(context);
            console.log(`[MaestroWorker] Job ${jobId} completed successfully`);
        }
        catch (err) {
            console.error(`[MaestroWorker] Job ${jobId} failed`, err);
            // Mark as failed
            await pg_js_1.pg.write(`UPDATE documents SET processing_status = 'failed', processing_error = $2 WHERE id = $1`, [documentId, err.message], { tenantId });
            throw err;
        }
    }
}
exports.IngestionWorker = IngestionWorker;
// --- SERVICE ---
class IngestionService {
    worker;
    constructor() {
        this.worker = new IngestionWorker();
    }
    // Orchestration method: Enqueue job
    async enqueueIngestionJob(tenantId, collectionId, documentId, content, mimeType) {
        // In a real system, this would push to BullMQ / Maestro
        // await maestro.createTask('ingest_document', { ... });
        // For MVP/Simulator, we fire-and-forget (or use a simple in-memory async)
        // We serialize content to base64 to simulate a job payload
        const payload = {
            tenantId,
            collectionId,
            documentId,
            contentBase64: content.toString('base64'),
            mimeType
        };
        const jobId = `job_${Date.now()}_${documentId}`;
        // Simulate Async Execution
        setImmediate(() => {
            this.worker.processJob(jobId, payload).catch(e => console.error("Async Job Error", e));
        });
        return jobId;
    }
    async createDocument(tenantId, collectionId, title, sourceUri, mimeType, content) {
        // Create DB record
        const hash = crypto_1.default.createHash('sha256').update(content).digest('hex');
        const sizeBytes = content.length;
        const result = await pg_js_1.pg.oneOrNone(`INSERT INTO documents (
           tenant_id, collection_id, title, source_uri, mime_type, size_bytes, hash, processing_status
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
         RETURNING id`, [tenantId, collectionId, title, sourceUri, mimeType, sizeBytes, hash, 'pending'], { tenantId, forceWrite: true });
        if (!result)
            throw new Error("Failed to create document record");
        const docId = result.id;
        // Enqueue Job
        await this.enqueueIngestionJob(tenantId, collectionId, docId, content, mimeType);
        return docId;
    }
}
exports.IngestionService = IngestionService;
