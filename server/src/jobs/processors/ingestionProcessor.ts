import { Job } from 'bullmq';
import { getNeo4jDriver } from '../../db/neo4j.js';
import { getPostgresPool } from '../../db/postgres.js';
import { subscriptionEngine } from '../../graphql/subscriptionEngine.js';
import logger from '../../utils/logger.js';
import { metrics } from '../../observability/metrics.js';

export const ingestionProcessor = async (job: Job) => {
   const { path, tenantId, flags } = job.data;
   logger.info({ jobId: job.id, path, tenantId }, 'Processing ingestion job');

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
      // Note: apoc might not be available, fallback to simple labels if needed or assuming strict types.
      // For simplicity in this prompt, just setting properties and Entity label.
   } catch (error) {
      logger.error('Neo4j write failed', error);
      throw error;
   } finally {
      await session.close();
   }

   // 4. Write to Postgres (Provenance)
   const pgPool = getPostgresPool();
   const client = await pgPool.connect();
   try {
       // Ensure RLS context
       await client.query("SELECT set_config('app.tenant_id', $1, false)", [tenantId]);
       await client.query(`
          INSERT INTO provenance_records (id, tenant_id, source_type, source_id, user_id, entity_count, metadata)
          VALUES ($1, $2, 'file', $3, 'system', $4, $5)
       `, [`prov-${Date.now()}`, tenantId, path, entities.length, JSON.stringify({ flags })]);
   } catch (err) {
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
   } catch (e) {
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
