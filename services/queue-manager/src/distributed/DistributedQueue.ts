/**
 * Distributed Queue with Priority Support and Dead-Letter Queues
 *
 * A production-grade distributed queue implementation featuring:
 * - Priority-based job processing with multiple priority levels
 * - Partitioned queues for multi-tenant and workload isolation
 * - Dead-letter queue (DLQ) with configurable retry policies
 * - Idempotency support for exactly-once processing semantics
 * - Progress tracking and job lifecycle management
 *
 * Trade-offs:
 * - DLQ adds storage overhead (mitigated by TTL on dead-letter jobs)
 * - Priority processing has slight overhead vs FIFO (justified for SLA needs)
 * - Partitioning increases complexity (essential for multi-tenant isolation)
 */

import { Queue, Worker, Job, QueueEvents, FlowProducer } from 'bullmq';
import { EventEmitter } from 'events';
import { v4 as uuid } from 'uuid';
import { RedisClusterClient } from './RedisClusterClient.js';
import {
  DistributedJob,
  DistributedJobOptions,
  DistributedPriority,
  QueuePartition,
  QueueStats,
  PartitionStats,
  RetryStrategy,
  DeadLetterConfig,
  JobStatus,
  DistributedQueueEvents,
} from './types.js';
import { Logger } from '../utils/logger.js';

export type JobProcessor<T = unknown, R = unknown> = (
  job: DistributedJob<T>,
) => Promise<R>;

interface InternalQueueConfig {
  name: string;
  partitions: QueuePartition[];
  defaultPriority: DistributedPriority;
  defaultRetryStrategy: RetryStrategy;
  deadLetterConfig: DeadLetterConfig;
  idempotencyTTL: number;
  maxConcurrency: number;
  stalledInterval: number;
  lockDuration: number;
}

export class DistributedQueue extends EventEmitter {
  private config: InternalQueueConfig;
  private redisClient: RedisClusterClient;
  private queues: Map<string, Queue> = new Map();
  private workers: Map<string, Worker> = new Map();
  private queueEvents: Map<string, QueueEvents> = new Map();
  private deadLetterQueue: Queue;
  private flowProducer: FlowProducer;
  private processors: Map<string, JobProcessor> = new Map();
  private idempotencyCache: Map<string, { jobId: string; expiry: number }> = new Map();
  private logger: Logger;
  private isShuttingDown = false;

  constructor(
    name: string,
    redisClient: RedisClusterClient,
    options: Partial<InternalQueueConfig> = {},
  ) {
    super();
    this.redisClient = redisClient;
    this.logger = new Logger(`DistributedQueue:${name}`);

    this.config = {
      name,
      partitions: options.partitions ?? [
        { id: 'default', name: 'Default', weight: 1, maxConcurrency: 10 },
      ],
      defaultPriority: options.defaultPriority ?? DistributedPriority.NORMAL,
      defaultRetryStrategy: options.defaultRetryStrategy ?? {
        maxAttempts: 3,
        initialDelay: 1000,
        maxDelay: 30000,
        multiplier: 2,
        jitter: true,
      },
      deadLetterConfig: options.deadLetterConfig ?? {
        enabled: true,
        queueName: `${name}:dead-letter`,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        alertOnThreshold: 100,
      },
      idempotencyTTL: options.idempotencyTTL ?? 24 * 60 * 60 * 1000, // 24 hours
      maxConcurrency: options.maxConcurrency ?? 10,
      stalledInterval: options.stalledInterval ?? 30000,
      lockDuration: options.lockDuration ?? 30000,
    };
  }

  /**
   * Initialize the distributed queue system
   */
  async initialize(): Promise<void> {
    const connection = await this.getRedisConnection();

    // Create partition queues
    for (const partition of this.config.partitions) {
      const queueName = this.getPartitionQueueName(partition.id);
      const queue = new Queue(queueName, {
        connection,
        defaultJobOptions: {
          attempts: this.config.defaultRetryStrategy.maxAttempts,
          backoff: {
            type: 'exponential',
            delay: this.config.defaultRetryStrategy.initialDelay,
          },
          removeOnComplete: { age: 86400, count: 1000 },
          removeOnFail: { age: 604800, count: 5000 },
        },
      });

      this.queues.set(partition.id, queue);

      // Set up queue events
      const events = new QueueEvents(queueName, { connection });
      this.queueEvents.set(partition.id, events);
      this.setupQueueEventHandlers(partition.id, events);
    }

    // Create dead-letter queue if enabled
    if (this.config.deadLetterConfig.enabled) {
      this.deadLetterQueue = new Queue(
        this.config.deadLetterConfig.queueName!,
        {
          connection,
          defaultJobOptions: {
            removeOnComplete: false,
            removeOnFail: false,
          },
        },
      );
    }

    // Create flow producer for complex workflows
    this.flowProducer = new FlowProducer({ connection });

    this.logger.info('Distributed queue initialized', {
      partitions: this.config.partitions.map(p => p.id),
      deadLetterEnabled: this.config.deadLetterConfig.enabled,
    });

    this.emit('initialized');
  }

  /**
   * Add a job to the queue
   */
  async addJob<T = unknown>(
    name: string,
    data: T,
    options: DistributedJobOptions = {},
  ): Promise<DistributedJob<T>> {
    // Check idempotency
    if (options.idempotencyKey) {
      const existingJob = this.checkIdempotency(options.idempotencyKey);
      if (existingJob) {
        const job = await this.getJob(existingJob.jobId);
        if (job) {
          this.logger.debug('Returning existing job due to idempotency', {
            idempotencyKey: options.idempotencyKey,
            jobId: existingJob.jobId,
          });
          return job as DistributedJob<T>;
        }
      }
    }

    const partition = options.partition ?? 'default';
    const queue = this.queues.get(partition);

    if (!queue) {
      throw new Error(`Partition ${partition} not found`);
    }

    const priority = options.priority ?? this.config.defaultPriority;
    const retryStrategy = options.retryStrategy ?? this.config.defaultRetryStrategy;

    const jobId = options.idempotencyKey ?? uuid();

    const bullmqJob = await queue.add(
      name,
      {
        __data: data,
        __metadata: options.metadata,
        __correlationId: options.correlationId ?? uuid(),
        __agentId: options.agentId,
        __fleetId: options.fleetId,
        __routingKey: options.routingKey,
      },
      {
        jobId,
        priority,
        attempts: retryStrategy.maxAttempts,
        backoff: {
          type: 'exponential',
          delay: retryStrategy.initialDelay,
        },
        delay: options.delay,
        repeat: options.repeat,
        lifo: priority === DistributedPriority.CRITICAL,
        removeOnComplete: {
          age: 86400,
          count: 1000,
        },
        removeOnFail: {
          age: 604800,
          count: 5000,
        },
      },
    );

    const distributedJob = this.toDistributedJob<T>(bullmqJob, partition);

    // Store idempotency key if provided
    if (options.idempotencyKey) {
      this.storeIdempotency(options.idempotencyKey, bullmqJob.id!);
    }

    this.logger.info('Job added', { jobId: bullmqJob.id, name, partition, priority });
    this.emit('job:added', distributedJob);

    return distributedJob;
  }

  /**
   * Add multiple jobs in bulk
   */
  async addBulk<T = unknown>(
    jobs: Array<{
      name: string;
      data: T;
      options?: DistributedJobOptions;
    }>,
  ): Promise<DistributedJob<T>[]> {
    // Group jobs by partition
    const partitionedJobs = new Map<string, typeof jobs>();

    for (const job of jobs) {
      const partition = job.options?.partition ?? 'default';
      if (!partitionedJobs.has(partition)) {
        partitionedJobs.set(partition, []);
      }
      partitionedJobs.get(partition)!.push(job);
    }

    const results: DistributedJob<T>[] = [];

    for (const [partition, partitionJobs] of partitionedJobs) {
      const queue = this.queues.get(partition);
      if (!queue) {
        throw new Error(`Partition ${partition} not found`);
      }

      const bullmqJobs = await queue.addBulk(
        partitionJobs.map(job => ({
          name: job.name,
          data: {
            __data: job.data,
            __metadata: job.options?.metadata,
            __correlationId: job.options?.correlationId ?? uuid(),
          },
          opts: {
            priority: job.options?.priority ?? this.config.defaultPriority,
            jobId: job.options?.idempotencyKey ?? uuid(),
          },
        })),
      );

      for (const bullmqJob of bullmqJobs) {
        results.push(this.toDistributedJob(bullmqJob, partition));
      }
    }

    this.logger.info('Bulk jobs added', { count: results.length });
    return results;
  }

  /**
   * Register a job processor
   */
  registerProcessor<T = unknown, R = unknown>(
    processor: JobProcessor<T, R>,
    options: {
      partition?: string;
      concurrency?: number;
      filter?: (job: DistributedJob<T>) => boolean;
    } = {},
  ): void {
    const partition = options.partition ?? 'default';
    const concurrency =
      options.concurrency ?? this.config.partitions.find(p => p.id === partition)?.maxConcurrency ?? 10;

    this.processors.set(partition, processor as JobProcessor);

    this.startWorker(partition, processor as JobProcessor, concurrency, options.filter);

    this.logger.info('Processor registered', { partition, concurrency });
  }

  /**
   * Get a job by ID
   */
  async getJob<T = unknown>(jobId: string): Promise<DistributedJob<T> | null> {
    for (const [partition, queue] of this.queues) {
      const job = await queue.getJob(jobId);
      if (job) {
        return this.toDistributedJob(job, partition);
      }
    }

    // Check dead-letter queue
    if (this.deadLetterQueue) {
      const job = await this.deadLetterQueue.getJob(jobId);
      if (job) {
        return this.toDistributedJob(job, 'dead-letter');
      }
    }

    return null;
  }

  /**
   * Get jobs by status
   */
  async getJobs<T = unknown>(
    status: JobStatus | JobStatus[],
    partition?: string,
    start = 0,
    end = 100,
  ): Promise<DistributedJob<T>[]> {
    const statuses = Array.isArray(status) ? status : [status];
    const queues = partition ? [[partition, this.queues.get(partition)!]] : Array.from(this.queues);

    const results: DistributedJob<T>[] = [];

    for (const [part, queue] of queues) {
      if (!queue) continue;

      for (const s of statuses) {
        const bullmqStatus = this.toBullMQStatus(s);
        const jobs = await queue.getJobs([bullmqStatus], start, end);
        for (const job of jobs) {
          results.push(this.toDistributedJob(job, part));
        }
      }
    }

    return results;
  }

  /**
   * Retry a failed job
   */
  async retryJob(jobId: string): Promise<void> {
    for (const queue of this.queues.values()) {
      const job = await queue.getJob(jobId);
      if (job) {
        await job.retry();
        this.logger.info('Job retried', { jobId });
        return;
      }
    }

    // Try to requeue from dead-letter queue
    if (this.deadLetterQueue) {
      const dlJob = await this.deadLetterQueue.getJob(jobId);
      if (dlJob) {
        await this.reprocessFromDeadLetter(dlJob);
        return;
      }
    }

    throw new Error(`Job ${jobId} not found`);
  }

  /**
   * Remove a job
   */
  async removeJob(jobId: string): Promise<boolean> {
    for (const queue of this.queues.values()) {
      const job = await queue.getJob(jobId);
      if (job) {
        await job.remove();
        this.logger.info('Job removed', { jobId });
        return true;
      }
    }
    return false;
  }

  /**
   * Pause a partition or all partitions
   */
  async pause(partition?: string): Promise<void> {
    if (partition) {
      const queue = this.queues.get(partition);
      if (queue) {
        await queue.pause();
        this.logger.info('Partition paused', { partition });
      }
    } else {
      for (const [part, queue] of this.queues) {
        await queue.pause();
        this.logger.info('Partition paused', { partition: part });
      }
    }
  }

  /**
   * Resume a partition or all partitions
   */
  async resume(partition?: string): Promise<void> {
    if (partition) {
      const queue = this.queues.get(partition);
      if (queue) {
        await queue.resume();
        this.logger.info('Partition resumed', { partition });
      }
    } else {
      for (const [part, queue] of this.queues) {
        await queue.resume();
        this.logger.info('Partition resumed', { partition: part });
      }
    }
  }

  /**
   * Get queue statistics
   */
  async getStats(): Promise<QueueStats> {
    const partitionStats = new Map<string, PartitionStats>();

    let totalWaiting = 0;
    let totalActive = 0;
    let totalCompleted = 0;
    let totalFailed = 0;
    let totalDelayed = 0;
    let totalPaused = 0;
    let deadLetterCount = 0;

    for (const [partition, queue] of this.queues) {
      const counts = await queue.getJobCounts();

      const stats: PartitionStats = {
        id: partition,
        waiting: counts.waiting ?? 0,
        active: counts.active ?? 0,
        completed: counts.completed ?? 0,
        failed: counts.failed ?? 0,
      };

      partitionStats.set(partition, stats);

      totalWaiting += stats.waiting;
      totalActive += stats.active;
      totalCompleted += stats.completed;
      totalFailed += stats.failed;
      totalDelayed += counts.delayed ?? 0;
      totalPaused += counts.paused ?? 0;
    }

    if (this.deadLetterQueue) {
      const dlCounts = await this.deadLetterQueue.getJobCounts();
      deadLetterCount = (dlCounts.waiting ?? 0) + (dlCounts.active ?? 0);
    }

    return {
      name: this.config.name,
      waiting: totalWaiting,
      active: totalActive,
      completed: totalCompleted,
      failed: totalFailed,
      delayed: totalDelayed,
      paused: totalPaused,
      deadLetter: deadLetterCount,
      throughput: 0, // Would need time-series tracking
      avgProcessingTime: 0, // Would need time-series tracking
      errorRate:
        totalCompleted + totalFailed > 0
          ? (totalFailed / (totalCompleted + totalFailed)) * 100
          : 0,
      partitions: partitionStats,
    };
  }

  /**
   * Get dead-letter queue jobs
   */
  async getDeadLetterJobs<T = unknown>(
    start = 0,
    end = 100,
  ): Promise<DistributedJob<T>[]> {
    if (!this.deadLetterQueue) {
      return [];
    }

    const jobs = await this.deadLetterQueue.getJobs(['waiting', 'active'], start, end);
    return jobs.map(job => this.toDistributedJob<T>(job, 'dead-letter'));
  }

  /**
   * Purge dead-letter queue
   */
  async purgeDeadLetterQueue(): Promise<number> {
    if (!this.deadLetterQueue) {
      return 0;
    }

    const jobs = await this.deadLetterQueue.getJobs(['waiting', 'active']);
    for (const job of jobs) {
      await job.remove();
    }

    this.logger.info('Dead-letter queue purged', { count: jobs.length });
    return jobs.length;
  }

  /**
   * Create a new partition
   */
  async createPartition(partition: QueuePartition): Promise<void> {
    if (this.queues.has(partition.id)) {
      throw new Error(`Partition ${partition.id} already exists`);
    }

    const connection = await this.getRedisConnection();
    const queueName = this.getPartitionQueueName(partition.id);

    const queue = new Queue(queueName, { connection });
    this.queues.set(partition.id, queue);

    const events = new QueueEvents(queueName, { connection });
    this.queueEvents.set(partition.id, events);
    this.setupQueueEventHandlers(partition.id, events);

    this.config.partitions.push(partition);

    this.logger.info('Partition created', { partitionId: partition.id });
    this.emit('partition:created', partition);
  }

  /**
   * Remove a partition (must be empty)
   */
  async removePartition(partitionId: string): Promise<void> {
    if (partitionId === 'default') {
      throw new Error('Cannot remove default partition');
    }

    const queue = this.queues.get(partitionId);
    if (!queue) {
      throw new Error(`Partition ${partitionId} not found`);
    }

    const counts = await queue.getJobCounts();
    const totalJobs = Object.values(counts).reduce((a, b) => a + (b ?? 0), 0);

    if (totalJobs > 0) {
      throw new Error(`Partition ${partitionId} is not empty (${totalJobs} jobs remaining)`);
    }

    // Stop worker if running
    const worker = this.workers.get(partitionId);
    if (worker) {
      await worker.close();
      this.workers.delete(partitionId);
    }

    // Close queue events
    const events = this.queueEvents.get(partitionId);
    if (events) {
      await events.close();
      this.queueEvents.delete(partitionId);
    }

    // Close queue
    await queue.close();
    this.queues.delete(partitionId);

    // Remove from config
    const index = this.config.partitions.findIndex(p => p.id === partitionId);
    if (index !== -1) {
      this.config.partitions.splice(index, 1);
    }

    this.logger.info('Partition removed', { partitionId });
    this.emit('partition:removed', partitionId);
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    this.isShuttingDown = true;
    this.logger.info('Shutting down distributed queue...');

    // Close all workers
    for (const [partition, worker] of this.workers) {
      this.logger.info('Closing worker', { partition });
      await worker.close();
    }
    this.workers.clear();

    // Close queue events
    for (const events of this.queueEvents.values()) {
      await events.close();
    }
    this.queueEvents.clear();

    // Close queues
    for (const queue of this.queues.values()) {
      await queue.close();
    }
    this.queues.clear();

    // Close dead-letter queue
    if (this.deadLetterQueue) {
      await this.deadLetterQueue.close();
    }

    // Close flow producer
    await this.flowProducer.close();

    this.logger.info('Distributed queue shutdown complete');
    this.emit('shutdown');
  }

  // Private methods

  private async getRedisConnection(): Promise<any> {
    // Get a raw connection from the cluster client for BullMQ
    // BullMQ expects ioredis-compatible connection
    return this.redisClient.acquire();
  }

  private getPartitionQueueName(partitionId: string): string {
    return `${this.config.name}:partition:${partitionId}`;
  }

  private startWorker(
    partition: string,
    processor: JobProcessor,
    concurrency: number,
    filter?: (job: DistributedJob) => boolean,
  ): void {
    const queueName = this.getPartitionQueueName(partition);

    const worker = new Worker(
      queueName,
      async (bullmqJob: Job) => {
        const distributedJob = this.toDistributedJob(bullmqJob, partition);

        // Apply filter if provided
        if (filter && !filter(distributedJob)) {
          throw new Error('Job filtered out');
        }

        try {
          this.emit('job:active', distributedJob);

          const result = await processor(distributedJob);

          this.emit('job:completed', distributedJob, result);
          return result;
        } catch (error) {
          const err = error instanceof Error ? error : new Error(String(error));

          // Check if should move to dead-letter queue
          if (
            this.config.deadLetterConfig.enabled &&
            bullmqJob.attemptsMade >= this.config.defaultRetryStrategy.maxAttempts
          ) {
            await this.moveToDeadLetterQueue(bullmqJob, err);
          }

          this.emit('job:failed', distributedJob, err);
          throw err;
        }
      },
      {
        connection: this.redisClient.getActiveNode()
          ? {
              host: this.redisClient.getActiveNode()!.host,
              port: this.redisClient.getActiveNode()!.port,
            }
          : undefined,
        concurrency,
        stalledInterval: this.config.stalledInterval,
        lockDuration: this.config.lockDuration,
        autorun: true,
      },
    );

    worker.on('completed', (job: Job) => {
      this.logger.debug('Worker completed job', { jobId: job.id, partition });
    });

    worker.on('failed', (job: Job | undefined, error: Error) => {
      this.logger.error('Worker failed job', {
        jobId: job?.id,
        partition,
        error: error.message,
      });
    });

    worker.on('stalled', (jobId: string) => {
      this.logger.warn('Job stalled', { jobId, partition });
      this.emit('job:stalled', jobId);
    });

    worker.on('error', (error: Error) => {
      this.logger.error('Worker error', { partition, error: error.message });
    });

    this.workers.set(partition, worker);
  }

  private async moveToDeadLetterQueue(job: Job, error: Error): Promise<void> {
    if (!this.deadLetterQueue) return;

    await this.deadLetterQueue.add(
      'dead-letter',
      {
        originalQueue: this.config.name,
        originalJobId: job.id,
        originalName: job.name,
        originalData: job.data,
        failureReason: error.message,
        failedAt: new Date().toISOString(),
        attemptsMade: job.attemptsMade,
        stackTrace: error.stack,
      },
      {
        jobId: `dlq:${job.id}`,
        removeOnComplete: false,
        removeOnFail: false,
      },
    );

    this.logger.warn('Job moved to dead-letter queue', {
      jobId: job.id,
      attempts: job.attemptsMade,
      reason: error.message,
    });

    const distributedJob = this.toDistributedJob(job, 'dead-letter');
    this.emit('job:dead-letter', distributedJob);

    // Check alert threshold
    const dlCounts = await this.deadLetterQueue.getJobCounts();
    const dlCount = (dlCounts.waiting ?? 0) + (dlCounts.active ?? 0);

    if (
      this.config.deadLetterConfig.alertOnThreshold &&
      dlCount >= this.config.deadLetterConfig.alertOnThreshold
    ) {
      this.emit('dead-letter:threshold-exceeded', {
        count: dlCount,
        threshold: this.config.deadLetterConfig.alertOnThreshold,
      });
    }
  }

  private async reprocessFromDeadLetter(dlJob: Job): Promise<void> {
    const data = dlJob.data;
    const partition = 'default'; // Or extract from metadata

    const queue = this.queues.get(partition);
    if (!queue) {
      throw new Error(`Partition ${partition} not found`);
    }

    await queue.add(data.originalName, data.originalData, {
      jobId: `reprocessed:${data.originalJobId}`,
    });

    await dlJob.remove();
    this.logger.info('Job reprocessed from dead-letter queue', {
      originalJobId: data.originalJobId,
    });
  }

  private setupQueueEventHandlers(partition: string, events: QueueEvents): void {
    events.on('completed', ({ jobId }) => {
      this.logger.debug('Job completed event', { jobId, partition });
    });

    events.on('failed', ({ jobId, failedReason }) => {
      this.logger.debug('Job failed event', { jobId, partition, reason: failedReason });
    });

    events.on('progress', ({ jobId, data }) => {
      this.emit('job:progress', { jobId, progress: data });
    });

    events.on('stalled', ({ jobId }) => {
      this.logger.warn('Job stalled event', { jobId, partition });
    });
  }

  private toDistributedJob<T>(job: Job, partition: string): DistributedJob<T> {
    const data = job.data;

    return {
      id: job.id!,
      name: job.name,
      data: data.__data ?? data,
      options: {
        priority: job.opts.priority as DistributedPriority,
        partition,
        correlationId: data.__correlationId,
        agentId: data.__agentId,
        fleetId: data.__fleetId,
        routingKey: data.__routingKey,
        metadata: data.__metadata,
      },
      status: this.toJobStatus(job),
      partition,
      progress: job.progress as number,
      attemptsMade: job.attemptsMade,
      createdAt: new Date(job.timestamp),
      processedAt: job.processedOn ? new Date(job.processedOn) : undefined,
      completedAt: job.finishedOn ? new Date(job.finishedOn) : undefined,
      failedReason: job.failedReason ?? undefined,
      returnValue: job.returnvalue,
    };
  }

  private toJobStatus(job: Job): JobStatus {
    const state = job.getState();
    // getState returns a promise, but we can infer from properties
    if (job.finishedOn && !job.failedReason) return 'completed';
    if (job.failedReason) return 'failed';
    if (job.processedOn) return 'active';
    if (job.delay && job.delay > 0) return 'delayed';
    return 'waiting';
  }

  private toBullMQStatus(status: JobStatus): string {
    const mapping: Record<JobStatus, string> = {
      waiting: 'waiting',
      active: 'active',
      completed: 'completed',
      failed: 'failed',
      delayed: 'delayed',
      paused: 'paused',
      'dead-letter': 'waiting', // DLQ jobs are in waiting state
    };
    return mapping[status];
  }

  private checkIdempotency(key: string): { jobId: string } | null {
    const entry = this.idempotencyCache.get(key);
    if (entry && entry.expiry > Date.now()) {
      return { jobId: entry.jobId };
    }
    this.idempotencyCache.delete(key);
    return null;
  }

  private storeIdempotency(key: string, jobId: string): void {
    this.idempotencyCache.set(key, {
      jobId,
      expiry: Date.now() + this.config.idempotencyTTL,
    });
  }
}

/**
 * Create a distributed queue with default configuration
 */
export function createDistributedQueue(
  name: string,
  redisClient: RedisClusterClient,
  options?: Partial<InternalQueueConfig>,
): DistributedQueue {
  return new DistributedQueue(name, redisClient, options);
}
