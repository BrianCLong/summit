/**
 * Centralized Bull Queue Configuration
 * Issue: #11812 - Job Queue with Bull and Redis
 *
 * Provides configuration and utilities for BullMQ job queues
 * MIT License - Copyright (c) 2025 IntelGraph
 */

import { Queue, Worker, QueueOptions, WorkerOptions } from 'bullmq';
import IORedis from 'ioredis';
import logger from '../utils/logger.js';

// Redis connection configuration
const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379', 10);
const REDIS_PASSWORD = process.env.REDIS_PASSWORD;
const REDIS_DB = parseInt(process.env.REDIS_QUEUE_DB || '1', 10);

/**
 * Create Redis connection for BullMQ
 */
export function createRedisConnection(): IORedis {
  const connection = new IORedis({
    host: REDIS_HOST,
    port: REDIS_PORT,
    password: REDIS_PASSWORD,
    db: REDIS_DB,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    retryStrategy: (times: number) => {
      const delay = Math.min(times * 50, 2000);
      logger.warn(`Redis connection retry attempt ${times}, waiting ${delay}ms`);
      return delay;
    },
  });

  connection.on('error', (err) => {
    logger.error('Redis connection error', { error: err.message });
  });

  connection.on('connect', () => {
    logger.info('Redis connection established for queues');
  });

  return connection;
}

/**
 * Default queue options
 */
export const defaultQueueOptions: QueueOptions = {
  connection: createRedisConnection(),
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: {
      age: 24 * 3600, // Keep completed jobs for 24 hours
      count: 1000, // Keep max 1000 completed jobs
    },
    removeOnFail: {
      age: 7 * 24 * 3600, // Keep failed jobs for 7 days
    },
  },
};

/**
 * Default worker options
 */
export const defaultWorkerOptions: Partial<WorkerOptions> = {
  connection: createRedisConnection(),
  concurrency: parseInt(process.env.QUEUE_WORKER_CONCURRENCY || '5', 10),
  limiter: {
    max: 10,
    duration: 1000,
  },
  autorun: true,
};

/**
 * Queue names enum for type safety
 */
export enum QueueName {
  EMAIL = 'email',
  NOTIFICATIONS = 'notifications',
  DATA_PROCESSING = 'data-processing',
  ANALYTICS = 'analytics',
  WEBHOOKS = 'webhooks',
  TRUST_SCORE = 'trust-score',
  EMBEDDING = 'embedding',
  RETENTION = 'retention',
}

/**
 * Job priority levels
 */
export enum JobPriority {
  CRITICAL = 1,
  HIGH = 2,
  NORMAL = 3,
  LOW = 4,
  BACKGROUND = 5,
}

/**
 * Queue registry to manage all queues
 */
class QueueRegistry {
  private queues: Map<string, Queue> = new Map();
  private workers: Map<string, Worker> = new Map();

  /**
   * Get or create a queue
   */
  getQueue(name: string, options?: QueueOptions): Queue {
    if (!this.queues.has(name)) {
      const queue = new Queue(name, {
        ...defaultQueueOptions,
        ...options,
      });

      this.queues.set(name, queue);
      logger.info(`Queue created: ${name}`);
    }

    return this.queues.get(name)!;
  }

  /**
   * Register a worker for a queue
   */
  registerWorker(
    name: string,
    processor: WorkerOptions['processor'],
    options?: Partial<WorkerOptions>,
  ): Worker {
    if (this.workers.has(name)) {
      logger.warn(`Worker already exists for queue: ${name}`);
      return this.workers.get(name)!;
    }

    const worker = new Worker(name, processor as any, {
      ...defaultWorkerOptions,
      ...options,
    });

    // Worker event handlers
    worker.on('completed', (job) => {
      logger.info(`Job completed: ${job.id} in queue ${name}`, {
        queue: name,
        jobId: job.id,
        jobName: job.name,
        duration: Date.now() - job.timestamp,
      });
    });

    worker.on('failed', (job, err) => {
      logger.error(`Job failed: ${job?.id} in queue ${name}`, {
        queue: name,
        jobId: job?.id,
        jobName: job?.name,
        error: err.message,
        stack: err.stack,
        attempts: job?.attemptsMade,
      });
    });

    worker.on('error', (err) => {
      logger.error(`Worker error in queue ${name}`, {
        queue: name,
        error: err.message,
        stack: err.stack,
      });
    });

    this.workers.set(name, worker);
    logger.info(`Worker registered for queue: ${name}`);

    return worker;
  }

  /**
   * Get all queues
   */
  getAllQueues(): Queue[] {
    return Array.from(this.queues.values());
  }

  /**
   * Get all workers
   */
  getAllWorkers(): Worker[] {
    return Array.from(this.workers.values());
  }

  /**
   * Close all queues and workers
   */
  async close(): Promise<void> {
    logger.info('Closing all queues and workers');

    const closePromises: Promise<void>[] = [];

    // Close all workers
    for (const [name, worker] of this.workers) {
      closePromises.push(
        worker.close().then(() => {
          logger.info(`Worker closed: ${name}`);
        }),
      );
    }

    // Close all queues
    for (const [name, queue] of this.queues) {
      closePromises.push(
        queue.close().then(() => {
          logger.info(`Queue closed: ${name}`);
        }),
      );
    }

    await Promise.all(closePromises);
    this.queues.clear();
    this.workers.clear();

    logger.info('All queues and workers closed');
  }
}

/**
 * Global queue registry instance
 */
export const queueRegistry = new QueueRegistry();

/**
 * Helper to add a job to a queue
 */
export async function addJob<T = any>(
  queueName: string,
  jobName: string,
  data: T,
  options?: {
    priority?: JobPriority;
    delay?: number;
    attempts?: number;
    removeOnComplete?: boolean;
    removeOnFail?: boolean;
  },
): Promise<void> {
  const queue = queueRegistry.getQueue(queueName);

  await queue.add(jobName, data, {
    priority: options?.priority || JobPriority.NORMAL,
    delay: options?.delay,
    attempts: options?.attempts,
    removeOnComplete: options?.removeOnComplete,
    removeOnFail: options?.removeOnFail,
  });

  logger.info(`Job added to queue: ${queueName}/${jobName}`, {
    queue: queueName,
    jobName,
    priority: options?.priority,
  });
}

/**
 * Helper to add a repeatable job (cron-like)
 */
export async function addRepeatableJob<T = any>(
  queueName: string,
  jobName: string,
  data: T,
  cronExpression: string,
): Promise<void> {
  const queue = queueRegistry.getQueue(queueName);

  await queue.add(jobName, data, {
    repeat: {
      pattern: cronExpression,
    },
  });

  logger.info(`Repeatable job added: ${queueName}/${jobName}`, {
    queue: queueName,
    jobName,
    cron: cronExpression,
  });
}

/**
 * Graceful shutdown handler
 */
export async function gracefulShutdown(): Promise<void> {
  logger.info('Graceful shutdown initiated for queues');
  await queueRegistry.close();
}

// Register shutdown handlers
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

export default queueRegistry;
