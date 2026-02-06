import { Job } from 'bullmq';
import { promises as fs } from 'fs';
import pgvector from 'pgvector/pg';
import { getNeo4jDriver } from '../../db/neo4j.js';
import { getPostgresPool } from '../../db/postgres.js';
import { subscriptionEngine } from '../../graphql/subscriptionEngine.js';
import logger from '../../utils/logger.js';
import { metrics } from '../../observability/metrics.js';
import EmbeddingService from '../../services/EmbeddingService.js';
import { withOpaPolicy, JobPolicyContext } from './opa-job-wrapper.js';

const embeddingService = new EmbeddingService();

// Simple text splitter function
function splitTextIntoChunks(text: string, chunkSize = 1000, overlap = 200) {
  const chunks = [];
  for (let i = 0; i < text.length; i += chunkSize - overlap) {
    chunks.push(text.substring(i, i + chunkSize));
  }
  return chunks;
}

// Raw processor implementation (internal)
const ingestionProcessorImpl = async (job: Job, _policyContext?: JobPolicyContext) => {
   const { path, tenantId, flags } = job.data;
   logger.info({ jobId: job.id, path, tenantId, flags }, 'Processing ingestion job');

   // 1. Compute Hash (Mocked)
   const hash = `hash-${Date.now()}`;

   // 2. Extract Entities (Mocked with flags)
   const entities = await runExtractors(path, flags, tenantId);

   // 3. Write to Neo4j
   const driver = getNeo4jDriver();
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
   } catch (error: any) {
      logger.error('Neo4j write failed', error);
      throw error;
   } finally {
      await session.close();
   }

   // RAG Ingestion Flow
   let ragChunkCount = 0;
   if (flags?.rag) {
     try {
       logger.info({ jobId: job.id }, 'Starting RAG ingestion flow');
       const fileContent = await fs.readFile(path, 'utf-8');
       const chunks = splitTextIntoChunks(fileContent);
       const embeddings = await embeddingService.generateEmbeddings(chunks);

       const pgPool = getPostgresPool();
       const client = await pgPool.connect();
       try {
         await client.query("SELECT set_config('app.tenant_id', $1, false)", [tenantId]);
         for (let i = 0; i < chunks.length; i++) {
           await client.query(
             'INSERT INTO rag_documents (tenant_id, source_document_id, content, embedding, metadata) VALUES ($1, $2, $3, $4, $5)',
             [tenantId, path, chunks[i], pgvector.toSql(embeddings[i]), { original_document_hash: hash }]
           );
         }
         ragChunkCount = chunks.length;
         logger.info({ jobId: job.id, chunkCount: ragChunkCount }, 'RAG ingestion successful');
       } finally {
         client.release();
       }
     } catch (err: any) {
       logger.error({ jobId: job.id, error: err }, 'RAG ingestion flow failed');
       // Non-blocking for now
     }
   }

   // 4. Write to Postgres (Provenance)
   const pgPool = getPostgresPool();
   const client = await pgPool.connect();
   try {
       await client.query("SELECT set_config('app.tenant_id', $1, false)", [tenantId]);
       const metadata = { flags, ragChunkCount };
       await client.query(`
          INSERT INTO provenance_records (id, tenant_id, source_type, source_id, user_id, entity_count, metadata)
          VALUES ($1, $2, 'file', $3, 'system', $4, $5)
       `, [`prov-${Date.now()}`, tenantId, path, entities.length, JSON.stringify(metadata)]);
   } catch (err: any) {
       logger.error('Failed to write provenance record', err);
       // Non-blocking for now
   } finally {
       client.release();
   }

   // 5. Publish Subscription
   try {
       subscriptionEngine.publish('EVIDENCE_INGESTED', {
           evidenceIngested: {
               tenantId,
               ids: entities.map(e => e.id),
               status: 'COMPLETED'
           }
       });
   } catch (e: any) {
       logger.warn('Failed to publish subscription', e);
   }

   // Metrics
   (metrics as any).jobsProcessed?.inc({ job_type: 'ingestion', status: 'success' });
};

async function runExtractors(path: string, flags: any, tenantId: string) {
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

// Export OPA-wrapped processor for production use
// The wrapper checks OPA policy before executing the job
export const ingestionProcessor = withOpaPolicy('ingestion', ingestionProcessorImpl);
