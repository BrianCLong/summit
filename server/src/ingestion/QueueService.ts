import { Queue, Worker, Job } from 'bullmq';
import { PipelineOrchestrator } from './PipelineOrchestrator.js';
import { PipelineConfig } from '../data-model/types.js';
import pino from 'pino';

const logger = (pino as any)({ name: 'IngestionQueue' });
const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379');

export class QueueService {
  private queue: Queue;
  private worker: Worker;
  private orchestrator: PipelineOrchestrator;

  constructor() {
    this.orchestrator = new PipelineOrchestrator();

    const connection = {
      host: REDIS_HOST,
      port: REDIS_PORT,
    };

    this.queue = new Queue('ingestion-pipeline', { connection });

    this.worker = new Worker('ingestion-pipeline', async (job: Job) => {
      const config = job.data as PipelineConfig;
      logger.info({ jobId: job.id, pipeline: config.key }, 'Processing ingestion job');

      await job.updateProgress(10); // Started

      try {
        await this.orchestrator.runPipeline(config);
        await job.updateProgress(100); // Completed
        return { status: 'completed', pipeline: config.key };
      } catch (e: any) {
        logger.error({ jobId: job.id, error: e }, 'Job failed');
        throw e;
      }
    }, { connection, concurrency: 5 }); // Process 5 jobs concurrently

    this.worker.on('completed', (job: any) => {
      logger.info({ jobId: job.id }, 'Job completed');
    });

    this.worker.on('failed', (job: Job | undefined, err: Error) => {
      logger.error({ jobId: job?.id, error: err }, 'Job failed');
    });
  }

  async enqueueIngestion(config: PipelineConfig): Promise<string> {
    const job = await this.queue.add('ingest', config, {
      removeOnComplete: true,
      removeOnFail: false // Keep failed jobs for inspection
    });
    return job.id!;
  }

  async getJobStatus(jobId: string) {
    const job = await this.queue.getJob(jobId);
    if (!job) return null;

    return {
      id: job.id,
      state: await job.getState(),
      progress: job.progress,
      result: job.returnvalue,
      failedReason: job.failedReason,
      timestamp: job.timestamp
    };
  }

  async close() {
    await this.queue.close();
    await this.worker.close();
  }
}
