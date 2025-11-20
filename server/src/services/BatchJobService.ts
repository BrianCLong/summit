import { PgBoss } from 'pg-boss';
import baseLogger from '../config/logger.js';
import { PostgresBatcher } from '../db/batch.js';
import { z } from 'zod';

const logger = baseLogger.child({ name: 'batch-job-service' });

// Schema for normalization job
const NormalizeCaseSchema = z.object({
  caseId: z.string(),
  rawText: z.string(),
});

export class BatchJobService {
  private boss: PgBoss | null = null;
  private isStarted = false;

  constructor() {
    const connectionString = process.env.DATABASE_URL;
    if (connectionString) {
      this.boss = new PgBoss(connectionString);
      this.boss.on('error', (err: Error) => logger.error({ err }, 'PgBoss error'));
    } else {
      logger.warn('No DATABASE_URL for PgBoss, batch jobs disabled');
    }
  }

  async start() {
    if (!this.boss || this.isStarted) return;
    await this.boss.start();
    this.isStarted = true;
    logger.info('PgBoss started');

    // Register workers
    await this.registerWorkers();
  }

  async stop() {
    if (this.boss && this.isStarted) {
      await this.boss.stop();
      this.isStarted = false;
    }
  }

  async publish(queue: string, data: any) {
    if (!this.boss) throw new Error('BatchJobService not initialized');
    return this.boss.send(queue, data);
  }

  private async registerWorkers() {
    if (!this.boss) return;

    // Worker for 'normalize-cases'
    // Note: pg-boss work handler signature is (jobs: Job[]) => Promise<void | ...>
    // or (job: Job) => ... depending on batchSize.
    // Default is single job?
    // According to type definition:
    // work<ReqData>(name: string, handler: WorkHandler<ReqData>): Promise<string>;
    // interface WorkHandler<ReqData> { (job: Job<ReqData>[]): Promise<any>; }
    // Wait, the handler receives an ARRAY of jobs?
    // Let's check index.d.mts again.
    // interface WorkHandler<ReqData> { (job: Job<ReqData>[]): Promise<any>; }
    // Yes, it seems it receives an array!
    // But usually there is an option batchSize?
    // "fetch<T>(name: string, options?: FetchOptions): Promise<Job<T>[]>"

    // Let's assume standard usage. If I don't pass batchSize, maybe it sends one?
    // Or maybe I should iterate.

    await this.boss.work('normalize-cases', async (jobs) => {
       // handle array
       const jobList = Array.isArray(jobs) ? jobs : [jobs];

       for (const job of jobList) {
          const { data } = job;
          try {
            const validated = NormalizeCaseSchema.parse(data);
            const normalized = {
              ...validated,
              normalizedText: validated.rawText.trim().toLowerCase(),
              processedAt: new Date().toISOString(),
            };
            logger.info({ caseId: normalized.caseId }, 'Normalized case data');
          } catch (error) {
            logger.error({ err: error, data }, 'Job failed');
            throw error;
          }
       }
    });
  }
}

export const batchJobService = new BatchJobService();
