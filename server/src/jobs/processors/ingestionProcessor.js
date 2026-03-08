"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ingestionProcessor = void 0;
const fs_1 = require("fs");
const pg_1 = __importDefault(require("pgvector/pg"));
const neo4j_js_1 = require("../../db/neo4j.js");
const postgres_js_1 = require("../../db/postgres.js");
const subscriptionEngine_js_1 = require("../../graphql/subscriptionEngine.js");
const logger_js_1 = __importDefault(require("../../utils/logger.js"));
const metrics_js_1 = require("../../observability/metrics.js");
const EmbeddingService_js_1 = __importDefault(require("../../services/EmbeddingService.js"));
const embeddingService = new EmbeddingService_js_1.default();
// Simple text splitter function
function splitTextIntoChunks(text, chunkSize = 1000, overlap = 200) {
    const chunks = [];
    for (let i = 0; i < text.length; i += chunkSize - overlap) {
        chunks.push(text.substring(i, i + chunkSize));
    }
    return chunks;
}
const ingestionProcessor = async (job) => {
    const { path, tenantId, flags } = job.data;
    logger_js_1.default.info({ jobId: job.id, path, tenantId, flags }, 'Processing ingestion job');
    // 1. Compute Hash (Mocked)
    const hash = `hash-${Date.now()}`;
    // 2. Extract Entities (Mocked with flags)
    const entities = await runExtractors(path, flags, tenantId);
    // 3. Write to Neo4j
    const driver = (0, neo4j_js_1.getNeo4jDriver)();
    const session = driver.session();
    try {
        await session.run(`
         UNWIND $entities AS e
         MERGE (n:Entity {id: e.id, tenantId: $tenantId})
         SET n += e.props
         SET n:Entity
         WITH n, e
         CALL apoc.create.addLabels(n, [e.type]) YIELD node
         RETURN count(node)
      `, { entities, tenantId });
    }
    catch (error) {
        logger_js_1.default.error('Neo4j write failed', error);
        throw error;
    }
    finally {
        await session.close();
    }
    // RAG Ingestion Flow
    let ragChunkCount = 0;
    if (flags?.rag) {
        try {
            logger_js_1.default.info({ jobId: job.id }, 'Starting RAG ingestion flow');
            const fileContent = await fs_1.promises.readFile(path, 'utf-8');
            const chunks = splitTextIntoChunks(fileContent);
            const embeddings = await embeddingService.generateEmbeddings(chunks);
            const pgPool = (0, postgres_js_1.getPostgresPool)();
            const client = await pgPool.connect();
            try {
                await client.query("SELECT set_config('app.tenant_id', $1, false)", [tenantId]);
                for (let i = 0; i < chunks.length; i++) {
                    await client.query('INSERT INTO rag_documents (tenant_id, source_document_id, content, embedding, metadata) VALUES ($1, $2, $3, $4, $5)', [tenantId, path, chunks[i], pg_1.default.toSql(embeddings[i]), { original_document_hash: hash }]);
                }
                ragChunkCount = chunks.length;
                logger_js_1.default.info({ jobId: job.id, chunkCount: ragChunkCount }, 'RAG ingestion successful');
            }
            finally {
                client.release();
            }
        }
        catch (err) {
            logger_js_1.default.error({ jobId: job.id, error: err }, 'RAG ingestion flow failed');
            // Non-blocking for now
        }
    }
    // 4. Write to Postgres (Provenance)
    const pgPool = (0, postgres_js_1.getPostgresPool)();
    const client = await pgPool.connect();
    try {
        await client.query("SELECT set_config('app.tenant_id', $1, false)", [tenantId]);
        const metadata = { flags, ragChunkCount };
        await client.query(`
          INSERT INTO provenance_records (id, tenant_id, source_type, source_id, user_id, entity_count, metadata)
          VALUES ($1, $2, 'file', $3, 'system', $4, $5)
       `, [`prov-${Date.now()}`, tenantId, path, entities.length, JSON.stringify(metadata)]);
    }
    catch (err) {
        logger_js_1.default.error('Failed to write provenance record', err);
        // Non-blocking for now
    }
    finally {
        client.release();
    }
    // 5. Publish Subscription
    try {
        subscriptionEngine_js_1.subscriptionEngine.publish('EVIDENCE_INGESTED', {
            evidenceIngested: {
                tenantId,
                ids: entities.map(e => e.id),
                status: 'COMPLETED'
            }
        });
    }
    catch (e) {
        logger_js_1.default.warn('Failed to publish subscription', e);
    }
    // Metrics
    metrics_js_1.metrics.jobsProcessed?.inc({ job_type: 'ingestion', status: 'success' });
};
exports.ingestionProcessor = ingestionProcessor;
async function runExtractors(path, flags, tenantId) {
    const entities = [];
    const baseId = `e-${Date.now()}`;
    if (flags?.ocr) {
        entities.push({
            id: `${baseId}-ocr`,
            type: 'Entity',
            props: { name: 'OCR Result', source: path, extraction: 'text', tenantId },
            tenantId
        });
    }
    if (flags?.whisper) {
        entities.push({
            id: `${baseId}-voice`,
            type: 'Entity',
            props: { name: 'Voice Transcript', source: path, extraction: 'audio', tenantId },
            tenantId
        });
    }
    if (flags?.yolo) {
        entities.push({
            id: `${baseId}-vision`,
            type: 'Entity',
            props: { name: 'Object Detection', source: path, extraction: 'vision', tenantId },
            tenantId
        });
    }
    // Default if no specific flags or fallback
    if (entities.length === 0) {
        entities.push({
            id: `${baseId}-default`,
            type: 'Entity',
            props: { name: 'Ingested File', source: path, tenantId },
            tenantId
        });
    }
    return entities;
}
