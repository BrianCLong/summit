/**
 * Enhanced Worker Template for IntelGraph Platform
 * Replaces corrupted workers with BullMQ + Zod schemas + OTEL spans
 */

import { Worker, Job, Queue } from 'bullmq';
import { z } from 'zod';
import { trace, SpanStatusCode } from '@opentelemetry/api';
import logger from '../utils/logger';

// Zod schema for type-safe payloads
export const WorkerPayloadSchema = z.object({
  id: z.string().uuid(),
  operation: z.enum(['upsert', 'delete', 'batch_process']),
  data: z.record(z.unknown()),
  metadata: z.object({
    tenant_id: z.string(),
    user_id: z.string().optional(),
    priority: z.number().min(1).max(10).default(5),
    retry_count: z.number().default(0),
    max_retries: z.number().default(3),
  }),
  timestamp: z.string().datetime(),
});

export type WorkerPayload = z.infer<typeof WorkerPayloadSchema>;

// Enhanced worker configuration
export interface EnhancedWorkerConfig {
  queueName: string;
  concurrency: number;
  connection: {
    host: string;
    port: number;
    password?: string;
  };
  defaultJobOptions: {
    removeOnComplete: number;
    removeOnFail: number;
    attempts: number;
    backoff: {
      type: string;
      delay: number;
    };
  };
}

/**
 * A generic worker implementation enhanced with Zod validation, OpenTelemetry tracing,
 * and structured logging. It processes jobs from a BullMQ queue.
 */
export class EnhancedWorker {
  private worker: Worker;
  private queue: Queue;
  private tracer = trace.getTracer('intelgraph-worker', '1.0.0');
  private logger = logger.child({ component: 'enhanced-worker' });

  /**
   * Initializes the EnhancedWorker.
   *
   * @param config - Configuration for the worker and queue.
   * @param processor - The async function that processes each job payload.
   */
  constructor(
    private config: EnhancedWorkerConfig,
    private processor: (payload: WorkerPayload) => Promise<any>,
  ) {
    this.queue = new Queue(config.queueName, {
      connection: config.connection,
      defaultJobOptions: config.defaultJobOptions,
    });

    this.worker = new Worker(config.queueName, this.processJob.bind(this), {
      connection: config.connection,
      concurrency: config.concurrency,
      removeOnComplete: config.defaultJobOptions.removeOnComplete,
      removeOnFail: config.defaultJobOptions.removeOnFail,
    });

    this.setupEventHandlers();
  }

  /**
   * Internal method to process a job.
   * Wraps the processor execution in an OpenTelemetry span and handles validation/logging.
   *
   * @param job - The BullMQ job to process.
   * @returns The result of the processor function.
   */
  private async processJob(job: Job): Promise<any> {
    const span = this.tracer.startSpan(
      `worker.${this.config.queueName}.process`,
    );

    try {
      // Validate payload with Zod
      const payload = WorkerPayloadSchema.parse(job.data);

      span.setAttributes({
        'worker.job.id': job.id || 'unknown',
        'worker.job.name': job.name,
        'worker.queue.name': this.config.queueName,
        'worker.payload.operation': payload.operation,
        'worker.payload.tenant_id': payload.metadata.tenant_id,
        'worker.payload.priority': payload.metadata.priority,
        'worker.retry.count': payload.metadata.retry_count,
        'worker.retry.max': payload.metadata.max_retries,
      });

      this.logger.info('Processing worker job', {
        jobId: job.id,
        operation: payload.operation,
        tenantId: payload.metadata.tenant_id,
      });

      // Update progress
      await job.updateProgress(10);

      // Execute the actual work
      const result = await this.processor(payload);

      // Update progress to completion
      await job.updateProgress(100);

      span.setStatus({ code: SpanStatusCode.OK });
      span.setAttributes({
        'worker.result.success': true,
        'worker.result.type': typeof result,
      });

      this.logger.info('Worker job completed successfully', {
        jobId: job.id,
        operation: payload.operation,
        result: typeof result,
      });

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      span.recordException(error as Error);
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: errorMessage,
      });

      this.logger.error('Worker job failed', {
        jobId: job.id,
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
      });

      throw error;
    } finally {
      span.end();
    }
  }

  /**
   * Sets up event listeners for job lifecycle events (completed, failed, stalled).
   */
  private setupEventHandlers(): void {
    this.worker.on('completed', (job) => {
      this.logger.info('Job completed', { jobId: job.id });
    });

    this.worker.on('failed', (job, err) => {
      this.logger.error('Job failed', {
        jobId: job?.id,
        error: err.message,
      });
    });

    this.worker.on('error', (err) => {
      this.logger.error('Worker error', { error: err.message });
    });

    this.worker.on('stalled', (jobId) => {
      this.logger.warn('Job stalled', { jobId });
    });
  }

  /**
   * Adds a job to the queue after validating the payload.
   *
   * @param name - The name of the job.
   * @param payload - The job payload conforming to WorkerPayloadSchema.
   * @param options - Optional BullMQ job options.
   * @returns The created Job instance.
   */
  async addJob(
    name: string,
    payload: WorkerPayload,
    options?: any,
  ): Promise<Job<WorkerPayload>> {
    // Validate before queueing
    const validatedPayload = WorkerPayloadSchema.parse(payload);

    return this.queue.add(name, validatedPayload, options);
  }

  /**
   * Performs a health check on the worker queue.
   *
   * @returns An object indicating health status and queue statistics.
   */
  async healthCheck(): Promise<{ healthy: boolean; stats: any }> {
    try {
      const waiting = await this.queue.getWaiting();
      const active = await this.queue.getActive();
      const completed = await this.queue.getCompleted();
      const failed = await this.queue.getFailed();

      return {
        healthy: true,
        stats: {
          waiting: waiting.length,
          active: active.length,
          completed: completed.length,
          failed: failed.length,
        },
      };
    } catch (error) {
      return {
        healthy: false,
        stats: {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  /**
   * Gracefully shuts down the worker and closes the queue connection.
   */
  async shutdown(): Promise<void> {
    this.logger.info('Shutting down enhanced worker...');
    await this.worker.close();
    await this.queue.close();
    this.logger.info('Enhanced worker shutdown complete');
  }
}

/**
 * Factory function to create a specialized worker for embedding upserts.
 *
 * @returns An instance of EnhancedWorker configured for embedding upserts.
 */
export function createEmbeddingUpsertWorker(): EnhancedWorker {
  const config: EnhancedWorkerConfig = {
    queueName: 'embedding-upsert',
    concurrency: 4,
    connection: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
    },
    defaultJobOptions: {
      removeOnComplete: 100,
      removeOnFail: 50,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    },
  };

  const processor = async (payload: WorkerPayload) => {
    // Embedding upsert implementation
    logger.info('Processing embedding upsert', {
      operation: payload.operation,
    });

    // Simulate async work
    await new Promise((resolve) => setTimeout(resolve, 100));

    return {
      processed: true,
      operation: payload.operation,
      recordCount: Array.isArray(payload.data.records)
        ? payload.data.records.length
        : 1,
    };
  };

  return new EnhancedWorker(config, processor);
}
