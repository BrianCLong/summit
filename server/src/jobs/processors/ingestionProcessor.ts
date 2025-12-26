import { Job } from 'bullmq';
import { Neo4jGraphService } from '../../services/GraphService.js';
import { provenanceLedger } from '../../provenance/ledger.js';
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

   // 3. Write to Neo4j via GraphService (Boundary Enforced)
   const graphService = Neo4jGraphService.getInstance();
   try {
      for (const entity of entities) {
          await graphService.upsertEntity(tenantId, entity);
      }
   } catch (error) {
      logger.error('Graph write failed', error);
      throw error;
   }

   // 4. Write to Provenance via Ledger (Boundary Enforced)
   try {
       await provenanceLedger.appendEntry({
           tenantId,
           actionType: 'INGEST_FILE',
           resourceType: 'file',
           resourceId: path, // Or use a hash ID
           actorId: 'system-ingestion',
           actorType: 'system',
           payload: {
               mutationType: 'CREATE',
               entityId: path,
               entityType: 'File',
               path,
               entityCount: entities.length,
               flags,
               hash
           },
           metadata: {
               jobId: job.id
           }
       });
   } catch (err) {
       logger.error('Failed to write provenance record', err);
       // Non-blocking for now, but logged
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
            label: 'Extraction',
            attributes: { name: 'OCR Result', source: path, extraction: 'text' },
            metadata: {},
            tenantId
        });
    }

    if (flags?.whisper) {
        entities.push({
            id: `${baseId}-voice`,
            type: 'Entity',
            label: 'Extraction',
            attributes: { name: 'Voice Transcript', source: path, extraction: 'audio' },
            metadata: {},
            tenantId
        });
    }

    if (flags?.yolo) {
        entities.push({
            id: `${baseId}-vision`,
            type: 'Entity',
            label: 'Extraction',
            attributes: { name: 'Object Detection', source: path, extraction: 'vision' },
            metadata: {},
            tenantId
        });
    }

    // Default if no specific flags or fallback
    if (entities.length === 0) {
         entities.push({
             id: `${baseId}-default`,
             type: 'Entity',
             label: 'File',
             attributes: { name: 'Ingested File', source: path },
             metadata: {},
             tenantId
         });
    }
    return entities;
}
