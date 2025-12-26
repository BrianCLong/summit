import { Queue, Worker, QueueEvents } from 'bullmq';
import { getRedisClient } from '../config/database.js';
import logger from '../utils/logger.js';
// Removed direct worker import to decouple process
// import { ingestionProcessor } from '../jobs/processors/ingestionProcessor.js';

export class IngestionService {
  private queue: Queue | null = null;
  // Worker is no longer managed here for the API service
  // private worker: Worker | null = null;
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

    // WORKER REMOVED: The API service should only produce jobs.
    // The worker should be started in a separate process (e.g. via `npm run worker:ingestion`).

    logger.info('IngestionService initialized (Producer Only)');
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
