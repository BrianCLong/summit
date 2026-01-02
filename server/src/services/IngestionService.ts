import { Queue, Worker, QueueEvents } from 'bullmq';
import { getRedisClient } from '../config/database.js';
import logger from '../utils/logger.js';
import { ingestionProcessor } from '../jobs/processors/ingestionProcessor.js';

export class IngestionService {
   private queue: Queue | null = null;
   private worker: Worker | null = null;
   private queueEvents: QueueEvents | null = null;

   constructor() {
      this.initialize();
   }

   private initialize() {
      const connection = getRedisClient();
      if (!connection) {
         logger.warn('Redis not available, IngestionService disabled');
         return;
      }

      this.queue = new Queue('evidence-ingestion', { connection });
      this.queueEvents = new QueueEvents('evidence-ingestion', { connection });

      this.worker = new Worker('evidence-ingestion', ingestionProcessor, {
         connection,
         concurrency: 5
      });

      this.worker.on('completed', (job: any) => {
         logger.info({ jobId: job.id }, 'Ingestion job completed');
      });

      this.worker.on('failed', (job: any, err: any) => {
         logger.error({ jobId: job?.id, error: err }, 'Ingestion job failed');
      });

      logger.info('IngestionService initialized');
   }

   async addJob(file: { path: string; tenantId: string; flags?: Record<string, boolean> }) {
      if (!this.queue) {
         // Try to re-init if redis wasn't ready
         this.initialize();
         if (!this.queue) throw new Error('Ingestion queue not initialized');
      }
      await this.queue.add('ingest-file', file, {
         attempts: 3,
         backoff: {
            type: 'exponential',
            delay: 1000,
         }
      });
   }
}

export const ingestionService = new IngestionService();
