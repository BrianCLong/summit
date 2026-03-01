import { trace } from '@opentelemetry/api';
import { v4 as uuidv4 } from 'uuid';
import { Job } from 'bullmq';
import { promises as fsPromises } from 'fs';
import pgvector from 'pgvector/pg';
import { getNeo4jDriver } from '../../db/neo4j.js';
import { getPostgresPool } from '../../db/postgres.js';
import { subscriptionEngine } from '../../graphql/subscriptionEngine.js';
import logger from '../../utils/logger.js';
import { metrics } from '../../observability/metrics.js';
import EmbeddingService from '../../services/EmbeddingService.js';

const embeddingService = new EmbeddingService();
const tracer = trace.getTracer('summit-jobs');

// Simple text splitter function
function splitTextIntoChunks(text: string, chunkSize = 1000, overlap = 200) {
  const chunks = [];
  for (let i = 0; i < text.length; i += chunkSize - overlap) {
    chunks.push(text.substring(i, i + chunkSize));
  }
  return chunks;
}

export const ingestionProcessor = async (job: Job) => {
   const runId = job.data.runId || uuidv4();
   return tracer.startActiveSpan('ingestion.job', async (span) => {
     span.setAttribute('openlineage.run_id', runId);
     span.setAttribute('job.name', 'ingestion');
     span.setAttribute('job.type', 'batch');

     // Emit OpenLineage START event here in real implementation

     try {
       const result = await _ingestionProcessorImpl(job, runId);
       span.setStatus({ code: 1 }); // OK

       // Emit OpenLineage COMPLETE event here in real implementation

       return result;
     } catch (err: any) {
       span.recordException(err);
       span.setStatus({ code: 2 });

       // Emit OpenLineage FAIL event here in real implementation

       throw err;
     } finally {
       span.end();
     }
   });
};

const _ingestionProcessorImpl = async (job: Job, runId: string) => {
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
      `, { entities, tenantId });
   } finally {
      await session.close();
   }

   // 4. Update Postgres Status
   const pool = getPostgresPool();
   // ensure we pass run_id to downstream
   await pool.query('UPDATE ingestion_jobs SET status = $1, openlineage_run_id = $3 WHERE id = $2', ['completed', job.id, runId]);

   // 5. Emit GraphQL Subscription
   subscriptionEngine.publish('INGESTION_COMPLETED', {
       ingestionCompleted: {
           jobId: job.id,
           tenantId,
           status: 'completed',
           entitiesProcessed: entities.length
       }
   });

   metrics.increment('ingestion_jobs_completed');

   return { processed: true, count: entities.length };
};

// Mock extractors
async function runExtractors(path: string, flags: any, tenantId: string) {
    // Generate some embeddings for text content if file ends with .txt
    const entities = [
      { id: 'e1', props: { name: 'Entity 1', type: 'Person' } },
      { id: 'e2', props: { name: 'Entity 2', type: 'Organization' } }
    ];
    if (path.endsWith('.txt')) {
         const content = await fsPromises.readFile(path, 'utf8');
         const chunks = splitTextIntoChunks(content);
         for(let i=0; i<chunks.length; i++){
             const vec = await embeddingService.getEmbedding(chunks[i]);
             entities.push({
                 id: `chunk-${i}`,
                 props: { content: chunks[i], embedding: pgvector.toSql(vec) }
             });
         }
    }
    return entities;
}
