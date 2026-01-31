import { Queue, Worker, Job } from 'bullmq';
import { createRequire } from 'module';
import logger from '../utils/logger.js';
import { VeracityScoringService } from './VeracityScoringService.js';

import config from '../config/index.js';
import { ExternalAPIService } from './ExternalAPIService.js';
import { OSINTService } from './OSINTService.js';

interface OSINTJobData {
  type: string; // 'comprehensive_scan', 'wikipedia', 'search'
  targetId: string;
  tenantId?: string;
  params?: any;
}

const connection = {
  host: config.redis?.host || 'localhost',
  port: config.redis?.port || 6379,
  password: config.redis?.password,
  db: config.redis?.db || 0,
};

export const osintQueue = new Queue('osint-ingest', { connection });

export function startOSINTWorkers(): Worker {
  const worker = new Worker(
    'osint-ingest',
    async (job: Job<OSINTJobData>) => {
      const { type, targetId, tenantId, params } = job.data;
      logger.info(`Processing OSINT job ${job.id}: ${type} for ${targetId}`);

      const extApi = new ExternalAPIService(logger as any);
      const osintService = new OSINTService();
      const veracityService = new VeracityScoringService();

      try {
        if (type === 'wikipedia' || type === 'comprehensive_scan') {
          // 1. Enrich from Wikipedia
          let title = targetId;
          if (targetId.includes(':')) {
            title = targetId.split(':')[1];
          }

          try {
            // Basic fetch from Wikipedia if it looks like a wiki entity or we treat the ID as a title
            // If targetId is a UUID, this might fail unless we look up the label first.
            // For this MVP, we assume targetId is usable or we just try.
            await osintService.enrichFromWikipedia({ entityId: targetId, title });
          } catch (e: any) {
            logger.warn(`Wikipedia enrichment failed for ${targetId}`, e);
          }
        }

        // 2. Score Veracity
        await veracityService.scoreEntity(targetId);

        logger.info(`OSINT job ${job.id} completed.`);
      } catch (err: any) {
        logger.error(`OSINT job ${job.id} failed`, err);
        throw err;
      }
    },
    { connection }
  );

  worker.on('failed', (job: any, err: any) => {
    logger.error(`OSINT job ${job?.id} failed with ${err.message}`);
  });

  return worker;
}

export async function enqueueOSINT(
  type: string,
  targetId: string,
  options: { tenantId?: string; params?: any } = {}
): Promise<string> {
  const job = await osintQueue.add(
    'ingest',
    { type, targetId, ...options },
    { attempts: 3, backoff: { type: 'exponential', delay: 2000 } }
  );
  return job.id!;
}
