import { Worker, Job, WorkerOptions } from 'bullmq';
import { cfg } from '../config.js';
import { QueueName } from './types.js';
import pino from 'pino';

const logger = pino({ name: 'worker-manager' });

const connection = {
  host: cfg.REDIS_HOST,
  port: cfg.REDIS_PORT,
  password: cfg.REDIS_PASSWORD || undefined,
  username: cfg.REDIS_USERNAME,
  tls: cfg.REDIS_TLS ? {} : undefined,
};

export type Processor<T = any, R = any> = (job: Job<T>) => Promise<R>;

export class WorkerManager {
  private static instance: WorkerManager;
  private workers: Map<QueueName, Worker> = new Map();

  private constructor() {}

  public static getInstance(): WorkerManager {
    if (!WorkerManager.instance) {
      WorkerManager.instance = new WorkerManager();
    }
    return WorkerManager.instance;
  }

  public registerWorker(
    queueName: QueueName,
    processor: Processor,
    options: Partial<WorkerOptions> = {}
  ) {
    if (this.workers.has(queueName)) {
      logger.warn(`Worker for queue ${queueName} already registered`);
      return;
    }

    const worker = new Worker(queueName, processor, {
      connection,
      concurrency: options.concurrency || 1,
      ...options,
    });

    worker.on('completed', (job) => {
      logger.info(`Worker ${queueName} completed job ${job.id}`);
    });

    worker.on('failed', (job, err) => {
      logger.error(`Worker ${queueName} failed job ${job?.id}: ${err.message}`);
    });

    this.workers.set(queueName, worker);
  }

  public async close() {
      for (const worker of this.workers.values()) {
          await worker.close();
      }
  }
}

export const workerManager = WorkerManager.getInstance();
