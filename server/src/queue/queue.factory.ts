// @ts-nocheck
import { Queue, Worker, QueueOptions, WorkerOptions, Processor, QueueEvents } from 'bullmq';
import config from '../config/index.js';
import logger from '../utils/logger.js';
import IORedis from 'ioredis';
import { Counter, Histogram } from 'prom-client';

// Prometheus metrics
// const queueSizeGauge = new Counter({
//   name: 'job_queue_added_total',
//   help: 'Total number of jobs added to the queue',
//   labelNames: ['queue_name'],
// });

const jobDurationHistogram = new Histogram({
  name: 'job_processing_duration_seconds',
  help: 'Duration of job processing in seconds',
  labelNames: ['queue_name', 'status'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60, 120, 300],
});

const jobFailuresCounter = new Counter({
  name: 'job_failures_total',
  help: 'Total number of failed jobs',
  labelNames: ['queue_name', 'reason'],
});

export class QueueFactory {
  private static redisConnectionOptions = {
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password,
    db: config.redis.db,
    maxRetriesPerRequest: null, // Required by BullMQ
  };

  private static sharedConnection = new IORedis(QueueFactory.redisConnectionOptions);

  static createQueue(name: string, options: Partial<QueueOptions> = {}): Queue {
    const queue = new Queue(name, {
      connection: QueueFactory.sharedConnection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: {
            age: 24 * 3600, // Keep for 24 hours
            count: 1000
        },
        removeOnFail: {
            age: 7 * 24 * 3600 // Keep failed jobs for 7 days
        },
      },
      ...options,
    });

    // Metric for added jobs
    // BullMQ doesn't have a direct "on added" event on the queue instance easily without QueueEvents,
    // but we can wrap add/addBulk if we really wanted to.
    // For now, we'll assume the producer increments the counter or we use QueueEvents elsewhere.
    // Actually, let's use QueueEvents here to monitor? No, typically QueueEvents are separate connections.

    return queue;
  }

  static createWorker(name: string, processor: Processor, options: Partial<WorkerOptions> = {}): Worker {
    const worker = new Worker(name, async (job: any) => {
      const end = jobDurationHistogram.startTimer({ queue_name: name });
      try {
        logger.info(`Processing job ${job.id} in ${name}`);
        const result = await processor(job);
        end({ status: 'success' });
        return result;
      } catch (error: any) {
        end({ status: 'failed' });
        jobFailuresCounter.inc({ queue_name: name, reason: error.message || 'unknown' });
        logger.error(`Job ${job.id} failed in ${name}:`, error);
        throw error;
      }
    }, {
      connection: QueueFactory.redisConnectionOptions, // Workers need blocking connection, so new connection
      concurrency: options.concurrency || 1,
      ...options,
    });

    worker.on('completed', (job: any) => {
      logger.info(`Job ${job.id} completed in ${name}`);
    });

    worker.on('failed', (job, err) => {
      logger.error(`Job ${job?.id} failed in ${name}: ${err.message}`);
    });

    return worker;
  }
}
