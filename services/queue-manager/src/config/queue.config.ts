import { QueueOptions, WorkerOptions, ConnectionOptions } from 'bullmq';

export interface QueueConfig {
  redis: ConnectionOptions;
  defaultJobOptions: QueueOptions['defaultJobOptions'];
  workerConcurrency: number;
  rateLimits: {
    [queueName: string]: {
      max: number;
      duration: number;
    };
  };
}

export const defaultQueueConfig: QueueConfig = {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0', 10),
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    enableOfflineQueue: true,
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: {
      age: 86400, // Keep completed jobs for 24 hours
      count: 1000,
    },
    removeOnFail: {
      age: 604800, // Keep failed jobs for 7 days
      count: 5000,
    },
  },
  workerConcurrency: parseInt(process.env.WORKER_CONCURRENCY || '10', 10),
  rateLimits: {
    'email-notifications': { max: 100, duration: 60000 }, // 100 per minute
    'webhook-delivery': { max: 50, duration: 60000 },
    'data-processing': { max: 500, duration: 60000 },
    'ai-inference': { max: 20, duration: 60000 },
  },
};

export const workerOptions: WorkerOptions = {
  concurrency: defaultQueueConfig.workerConcurrency,
  lockDuration: 30000, // 30 seconds
  maxStalledCount: 1,
  stalledInterval: 30000,
};
