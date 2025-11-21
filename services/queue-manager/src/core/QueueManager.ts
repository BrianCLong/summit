import { Queue, Worker, Job, QueueEvents } from 'bullmq';
import IORedis from 'ioredis';
import { defaultQueueConfig, workerOptions } from '../config/queue.config.js';
import {
  QueueJobOptions,
  JobPriority,
  DeadLetterJobData,
  Workflow,
  WorkflowStep,
} from '../types/index.js';
import { Logger } from '../utils/logger.js';
import { MetricsCollector } from '../monitoring/MetricsCollector.js';
import { RateLimiter } from '../utils/RateLimiter.js';

export type JobProcessor<T = any, R = any> = (
  job: Job<T>,
) => Promise<R> | R;

export class QueueManager {
  private queues: Map<string, Queue> = new Map();
  private workers: Map<string, Worker> = new Map();
  private queueEvents: Map<string, QueueEvents> = new Map();
  private processors: Map<string, JobProcessor> = new Map();
  private connection: IORedis;
  private logger: Logger;
  private metrics: MetricsCollector;
  private rateLimiters: Map<string, RateLimiter> = new Map();
  private deadLetterQueue: Queue;

  constructor() {
    this.connection = new IORedis(defaultQueueConfig.redis);
    this.logger = new Logger('QueueManager');
    this.metrics = new MetricsCollector();

    // Initialize dead letter queue
    this.deadLetterQueue = new Queue('dead-letter-queue', {
      connection: this.connection,
    });
  }

  /**
   * Register a new queue with optional rate limiting
   */
  registerQueue(
    name: string,
    options: {
      rateLimit?: { max: number; duration: number };
      defaultJobOptions?: QueueJobOptions;
    } = {},
  ): Queue {
    if (this.queues.has(name)) {
      return this.queues.get(name)!;
    }

    const queue = new Queue(name, {
      connection: this.connection,
      defaultJobOptions: {
        ...defaultQueueConfig.defaultJobOptions,
        ...options.defaultJobOptions,
      },
    });

    this.queues.set(name, queue);

    // Set up rate limiter if configured
    if (options.rateLimit || defaultQueueConfig.rateLimits[name]) {
      const limit = options.rateLimit || defaultQueueConfig.rateLimits[name];
      this.rateLimiters.set(name, new RateLimiter(limit.max, limit.duration));
    }

    // Set up queue events for monitoring
    const queueEvents = new QueueEvents(name, {
      connection: this.connection,
    });
    this.queueEvents.set(name, queueEvents);
    this.setupQueueEventHandlers(name, queueEvents);

    this.logger.info(`Queue registered: ${name}`);
    return queue;
  }

  /**
   * Register a job processor for a queue
   */
  registerProcessor<T = any, R = any>(
    queueName: string,
    processor: JobProcessor<T, R>,
  ): void {
    this.processors.set(queueName, processor);
    this.logger.info(`Processor registered for queue: ${queueName}`);
  }

  /**
   * Start workers for all registered queues
   */
  async startWorkers(): Promise<void> {
    for (const [queueName, processor] of this.processors.entries()) {
      await this.startWorker(queueName, processor);
    }
  }

  /**
   * Start a worker for a specific queue
   */
  async startWorker<T = any, R = any>(
    queueName: string,
    processor: JobProcessor<T, R>,
  ): Promise<Worker> {
    if (this.workers.has(queueName)) {
      return this.workers.get(queueName)!;
    }

    const worker = new Worker<T, R>(
      queueName,
      async (job: Job<T>) => {
        const startTime = Date.now();

        try {
          // Check rate limit
          const rateLimiter = this.rateLimiters.get(queueName);
          if (rateLimiter && !rateLimiter.tryAcquire()) {
            throw new Error('Rate limit exceeded');
          }

          this.logger.info(`Processing job ${job.id} from queue ${queueName}`);
          this.metrics.recordJobStart(queueName);

          const result = await processor(job);

          const processingTime = Date.now() - startTime;
          this.metrics.recordJobComplete(queueName, processingTime);
          this.logger.info(
            `Job ${job.id} completed in ${processingTime}ms`,
          );

          // Handle job chaining
          if (job.opts.chainTo) {
            await this.handleJobChaining(job);
          }

          return result;
        } catch (error) {
          const processingTime = Date.now() - startTime;
          this.metrics.recordJobFailed(queueName, processingTime);
          this.logger.error(
            `Job ${job.id} failed after ${processingTime}ms`,
            error,
          );

          // Move to dead letter queue if max retries exceeded
          if (job.attemptsMade >= (job.opts.attempts || 3)) {
            await this.moveToDeadLetterQueue(job, error);
          }

          throw error;
        }
      },
      {
        ...workerOptions,
        connection: this.connection,
      },
    );

    this.workers.set(queueName, worker);
    this.setupWorkerEventHandlers(queueName, worker);

    this.logger.info(`Worker started for queue: ${queueName}`);
    return worker;
  }

  /**
   * Add a job to a queue with priority and scheduling support
   */
  async addJob<T = any>(
    queueName: string,
    jobName: string,
    data: T,
    options: QueueJobOptions = {},
  ): Promise<Job> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    // Convert priority enum to numeric value
    const priority = options.priority
      ? this.convertPriorityToNumber(options.priority)
      : undefined;

    // Handle scheduled jobs
    const delay = options.scheduledAt
      ? Math.max(0, options.scheduledAt.getTime() - Date.now())
      : undefined;

    const jobOptions = {
      ...options,
      priority,
      delay,
      jobId: options.jobId || `${queueName}:${jobName}:${Date.now()}`,
    };

    const job = await queue.add(jobName, data, jobOptions);

    this.logger.info(`Job ${job.id} added to queue ${queueName}`);
    this.metrics.recordJobAdded(queueName);

    return job;
  }

  /**
   * Add a batch of jobs to a queue
   */
  async addBulk<T = any>(
    queueName: string,
    jobs: Array<{
      name: string;
      data: T;
      options?: QueueJobOptions;
    }>,
  ): Promise<Job[]> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    const bulkJobs = jobs.map((job) => ({
      name: job.name,
      data: job.data,
      opts: {
        ...job.options,
        priority: job.options?.priority
          ? this.convertPriorityToNumber(job.options.priority)
          : undefined,
      },
    }));

    const addedJobs = await queue.addBulk(bulkJobs);

    this.logger.info(`${addedJobs.length} jobs added to queue ${queueName}`);
    this.metrics.recordJobAdded(queueName, addedJobs.length);

    return addedJobs;
  }

  /**
   * Execute a workflow with multiple steps
   */
  async executeWorkflow(workflow: Workflow): Promise<void> {
    this.logger.info(`Starting workflow: ${workflow.name} (${workflow.id})`);

    for (const step of workflow.steps) {
      await this.executeWorkflowStep(step, workflow.id);
    }
  }

  /**
   * Get job by ID
   */
  async getJob(queueName: string, jobId: string): Promise<Job | undefined> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    return await queue.getJob(jobId);
  }

  /**
   * Retry a failed job
   */
  async retryJob(queueName: string, jobId: string): Promise<void> {
    const job = await this.getJob(queueName, jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found in queue ${queueName}`);
    }

    await job.retry();
    this.logger.info(`Job ${jobId} retried in queue ${queueName}`);
  }

  /**
   * Remove a job from queue
   */
  async removeJob(queueName: string, jobId: string): Promise<void> {
    const job = await this.getJob(queueName, jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found in queue ${queueName}`);
    }

    await job.remove();
    this.logger.info(`Job ${jobId} removed from queue ${queueName}`);
  }

  /**
   * Pause a queue
   */
  async pauseQueue(queueName: string): Promise<void> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    await queue.pause();
    this.logger.info(`Queue ${queueName} paused`);
  }

  /**
   * Resume a paused queue
   */
  async resumeQueue(queueName: string): Promise<void> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    await queue.resume();
    this.logger.info(`Queue ${queueName} resumed`);
  }

  /**
   * Get queue metrics
   */
  async getQueueMetrics(queueName: string) {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    const counts = await queue.getJobCounts();
    const metrics = this.metrics.getQueueMetrics(queueName);

    return {
      ...counts,
      ...metrics,
    };
  }

  /**
   * Get all queues metrics
   */
  async getAllMetrics() {
    const metricsPromises = Array.from(this.queues.keys()).map(
      async (queueName) => {
        const metrics = await this.getQueueMetrics(queueName);
        return { queueName, ...metrics };
      },
    );

    return await Promise.all(metricsPromises);
  }

  /**
   * Clean up old jobs
   */
  async cleanQueue(
    queueName: string,
    grace: number = 86400000, // 24 hours
    status: 'completed' | 'failed' = 'completed',
  ): Promise<void> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    await queue.clean(grace, 1000, status);
    this.logger.info(`Queue ${queueName} cleaned (${status} jobs)`);
  }

  /**
   * Obliterate a queue (remove all jobs and data)
   */
  async obliterateQueue(queueName: string): Promise<void> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    await queue.obliterate({ force: true });
    this.logger.info(`Queue ${queueName} obliterated`);
  }

  /**
   * Gracefully shutdown all workers and close connections
   */
  async shutdown(): Promise<void> {
    this.logger.info('Shutting down queue manager...');

    // Close all workers
    const workerClosePromises = Array.from(this.workers.values()).map(
      (worker) => worker.close(),
    );
    await Promise.all(workerClosePromises);

    // Close all queues
    const queueClosePromises = Array.from(this.queues.values()).map(
      (queue) => queue.close(),
    );
    await Promise.all(queueClosePromises);

    // Close queue events
    const eventsClosePromises = Array.from(this.queueEvents.values()).map(
      (events) => events.close(),
    );
    await Promise.all(eventsClosePromises);

    // Close dead letter queue
    await this.deadLetterQueue.close();

    // Close Redis connection
    await this.connection.quit();

    this.logger.info('Queue manager shutdown complete');
  }

  // Private helper methods

  private convertPriorityToNumber(priority: JobPriority): number {
    return priority as number;
  }

  private async handleJobChaining(job: Job): Promise<void> {
    const chainTo = job.opts.chainTo as QueueJobOptions['chainTo'];
    if (!chainTo || chainTo.length === 0) {
      return;
    }

    for (const nextJob of chainTo) {
      await this.addJob(
        nextJob.queueName,
        nextJob.jobName,
        nextJob.data || {},
      );
    }

    this.logger.info(`Job ${job.id} chained to ${chainTo.length} jobs`);
  }

  private async executeWorkflowStep(
    step: WorkflowStep,
    workflowId: string,
  ): Promise<void> {
    try {
      const job = await this.addJob(step.queueName, step.jobName, step.data, {
        ...step.options,
        metadata: {
          ...step.options?.metadata,
          correlationId: workflowId,
        },
      });

      // Wait for job completion
      await job.waitUntilFinished(this.queueEvents.get(step.queueName)!);

      // Execute success steps
      if (step.onSuccess) {
        for (const successStep of step.onSuccess) {
          await this.executeWorkflowStep(successStep, workflowId);
        }
      }
    } catch (error) {
      this.logger.error(`Workflow step failed: ${step.jobName}`, error);

      // Execute failure steps
      if (step.onFailure) {
        for (const failureStep of step.onFailure) {
          await this.executeWorkflowStep(failureStep, workflowId);
        }
      } else {
        throw error;
      }
    }
  }

  private async moveToDeadLetterQueue(
    job: Job,
    error: any,
  ): Promise<void> {
    const deadLetterData: DeadLetterJobData = {
      originalQueue: job.queueName,
      originalJobId: job.id!,
      originalData: job.data,
      failureReason: error.message || String(error),
      failedAt: new Date(),
      attemptsMade: job.attemptsMade,
    };

    await this.deadLetterQueue.add('failed-job', deadLetterData, {
      removeOnComplete: false,
      removeOnFail: false,
    });

    this.logger.warn(
      `Job ${job.id} moved to dead letter queue after ${job.attemptsMade} attempts`,
    );
  }

  private setupQueueEventHandlers(
    queueName: string,
    queueEvents: QueueEvents,
  ): void {
    queueEvents.on('completed', ({ jobId }) => {
      this.logger.debug(`Job ${jobId} completed in queue ${queueName}`);
    });

    queueEvents.on('failed', ({ jobId, failedReason }) => {
      this.logger.error(
        `Job ${jobId} failed in queue ${queueName}: ${failedReason}`,
      );
    });

    queueEvents.on('progress', ({ jobId, data }) => {
      this.logger.debug(`Job ${jobId} progress: ${JSON.stringify(data)}`);
    });
  }

  private setupWorkerEventHandlers(queueName: string, worker: Worker): void {
    worker.on('completed', (job) => {
      this.logger.info(`Worker completed job ${job.id} in queue ${queueName}`);
    });

    worker.on('failed', (job, error) => {
      this.logger.error(
        `Worker failed job ${job?.id} in queue ${queueName}`,
        error,
      );
    });

    worker.on('error', (error) => {
      this.logger.error(`Worker error in queue ${queueName}`, error);
    });

    worker.on('stalled', (jobId) => {
      this.logger.warn(`Job ${jobId} stalled in queue ${queueName}`);
    });
  }
}
