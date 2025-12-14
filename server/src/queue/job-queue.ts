import { EventEmitter } from 'node:events';
import { JobsOptions, Queue, QueueEvents, QueueScheduler, Worker } from 'bullmq';
import type { QueueBaseOptions, WorkerOptions, Job } from 'bullmq';
import type { Redis } from 'ioredis';
import pino from 'pino';
import { getRedisClient } from '../db/redis.js';

export interface JobQueueConfig {
  name: string;
  deadLetterQueueName?: string;
  connection?: Redis;
  defaultJobOptions?: JobsOptions;
  workerOptions?: Pick<WorkerOptions, 'concurrency' | 'limiter'>;
  queueOptions?: QueueBaseOptions;
}

export interface EnqueueOptions<Data> {
  jobId?: string;
  priority?: number;
  delay?: number;
  attempts?: number;
  backoff?: JobsOptions['backoff'];
  repeat?: JobsOptions['repeat'];
  lifo?: boolean;
  jobName?: string;
  data?: Data;
}

export interface ScheduledJobOptions<Data> {
  at: Date;
  jobId?: string;
  priority?: number;
  jobName?: string;
  data?: Data;
}

export interface JobDetails<Data = unknown, Result = unknown> {
  id: string;
  name: string;
  data: Data;
  state: string;
  progress: number | Record<string, unknown>;
  attemptsMade: number;
  maxAttempts: number;
  failedReason?: string;
  returnValue?: Result;
  createdAt?: Date;
  startedAt?: Date;
  finishedAt?: Date;
  stacktrace?: string[];
}

type ProgressListener = (payload: {
  jobId: string;
  progress: number | Record<string, unknown>;
}) => void;

/**
 * Distributed job queue with BullMQ, DLQ, scheduling, and observability hooks.
 */
export class JobQueue<TData = unknown, TResult = unknown> {
  private readonly queue: Queue<TData, TResult>;
  private readonly queueEvents: QueueEvents;
  private readonly queueScheduler: QueueScheduler;
  private readonly deadLetterQueue?: Queue;
  private worker?: Worker<TData, TResult>;
  private readonly logger = pino({ name: 'JobQueue' });
  private readonly progressEmitter = new EventEmitter();
  private readonly connection: Redis;
  private readonly ownsConnection: boolean;
  private readonly defaultAttempts: number;

  constructor(private readonly config: JobQueueConfig) {
    this.connection = config.connection ?? getRedisClient();
    this.ownsConnection = !config.connection;

    const defaultJobOptions: JobsOptions = {
      attempts: 5,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: { age: 24 * 3600, count: 1000 },
      removeOnFail: { age: 7 * 24 * 3600 },
      priority: 5,
      ...config.defaultJobOptions,
    };

    this.defaultAttempts = defaultJobOptions.attempts ?? 1;

    this.queue = new Queue<TData, TResult>(config.name, {
      connection: this.connection,
      defaultJobOptions,
      ...config.queueOptions,
    });

    if (config.deadLetterQueueName) {
      this.deadLetterQueue = new Queue(config.deadLetterQueueName, {
        connection: this.connection,
        defaultJobOptions: {
          removeOnComplete: true,
          removeOnFail: true,
        },
      });
    }

    this.queueScheduler = new QueueScheduler(config.name, {
      connection: this.connection,
    });

    this.queueEvents = new QueueEvents(config.name, {
      connection: this.connection,
    });

    this.queueEvents.on('progress', ({ jobId, data }) => {
      if (!jobId) return;
      this.progressEmitter.emit('progress', { jobId, progress: data });
    });
  }

  async start(processor: (job: Job<TData, TResult>) => Promise<TResult>): Promise<void> {
    if (this.worker) {
      return;
    }

    await Promise.all([this.queueScheduler.waitUntilReady(), this.queueEvents.waitUntilReady()]);

    this.worker = new Worker<TData, TResult>(this.config.name, processor, {
      connection: this.connection,
      concurrency: this.config.workerOptions?.concurrency ?? 5,
      limiter: this.config.workerOptions?.limiter,
    });

    this.worker.on('error', (err) => {
      this.logger.error({ err }, 'Job worker error');
    });

    this.worker.on('completed', (job) => {
      this.logger.info({ jobId: job.id }, 'Job completed');
    });

    this.worker.on('progress', (job, progress) => {
      if (!job?.id) return;
      this.progressEmitter.emit('progress', { jobId: job.id as string, progress });
    });

    this.worker.on('failed', async (job, err) => {
      this.logger.error({ jobId: job?.id, err }, 'Job failed');
      if (!job || !this.deadLetterQueue) return;

      const maxAttempts = this.getMaxAttempts(job);
      if (job.attemptsMade >= maxAttempts) {
        await this.deadLetterQueue.add(`${this.config.name}:dead-letter`, {
          failedJobId: job.id,
          failedReason: job.failedReason ?? err?.message,
          data: job.data,
          timestamp: new Date().toISOString(),
        });
      }
    });
  }

  async enqueue(
    data: TData,
    options: EnqueueOptions<TData> = {},
  ): Promise<string> {
    const job = await this.queue.add(
      options.jobName ?? this.config.name,
      options.data ?? data,
      {
        jobId: options.jobId,
        priority: options.priority,
        delay: options.delay,
        attempts: options.attempts,
        backoff: options.backoff,
        repeat: options.repeat,
        lifo: options.lifo,
      },
    );

    return job.id as string;
  }

  async schedule(data: TData, options: ScheduledJobOptions<TData>): Promise<string> {
    const delay = Math.max(0, options.at.getTime() - Date.now());
    return this.enqueue(data, {
      delay,
      jobId: options.jobId,
      priority: options.priority,
      jobName: options.jobName,
      data: options.data,
    });
  }

  async getJobDetails(jobId: string): Promise<JobDetails<TData, TResult> | null> {
    const job = await this.queue.getJob(jobId);
    if (!job) return null;

    const [state, progress] = await Promise.all([
      job.getState(),
      Promise.resolve(
        typeof (job as any).progress === 'function'
          ? (job as any).progress()
          : (job as any).progress,
      ),
    ]);

    return {
      id: job.id as string,
      name: job.name,
      data: job.data,
      state,
      progress: progress ?? 0,
      attemptsMade: job.attemptsMade,
      maxAttempts: this.getMaxAttempts(job),
      failedReason: job.failedReason,
      returnValue: (job as any).returnvalue ?? (job as any).returnValue,
      createdAt: job.timestamp ? new Date(job.timestamp) : undefined,
      startedAt: job.processedOn ? new Date(job.processedOn) : undefined,
      finishedAt: job.finishedOn ? new Date(job.finishedOn) : undefined,
      stacktrace: job.stacktrace,
    };
  }

  async metrics(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }> {
    const counts = await this.queue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed');

    return {
      waiting: counts.waiting ?? 0,
      active: counts.active ?? 0,
      completed: counts.completed ?? 0,
      failed: counts.failed ?? 0,
      delayed: counts.delayed ?? 0,
    };
  }

  async pause(): Promise<void> {
    await this.queue.pause();
    if (this.worker) {
      await this.worker.pause();
    }
  }

  async resume(): Promise<void> {
    await this.queue.resume();
    if (this.worker) {
      await this.worker.resume();
    }
  }

  async shutdown(): Promise<void> {
    await this.queueEvents.close();
    await this.queueScheduler.close();
    if (this.worker) {
      await this.worker.close();
    }
    if (this.deadLetterQueue) {
      await this.deadLetterQueue.close();
    }
    await this.queue.close();

    if (this.ownsConnection) {
      await this.connection.quit();
    }
  }

  onProgress(listener: ProgressListener): () => void {
    this.progressEmitter.on('progress', listener);
    return () => this.progressEmitter.off('progress', listener);
  }

  getWorkerState(): {
    isRunning: boolean;
    concurrency: number;
    queueName: string;
  } {
    return {
      isRunning: Boolean(this.worker),
      concurrency: this.config.workerOptions?.concurrency ?? 5,
      queueName: this.config.name,
    };
  }

  private getMaxAttempts(job: Job<TData, TResult>): number {
    return job.opts.attempts ?? this.defaultAttempts;
  }
}
