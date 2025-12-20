/**
 * BullMQ Reconciliation Worker: Post-hoc token usage reconciliation
 * Processes actual vs estimated token usage for budget accuracy
 */

// import { Queue, Worker, Job, QueueEvents } from 'bullmq';
import { Pool } from 'pg';
import Redis from 'ioredis';
import logger from '../utils/logger';
import { getBudgetLedgerManager } from '../db/budgetLedger';
import { estimateTokensAndCost } from '../lib/tokcount-enhanced';
import { SafeMutationMetrics } from '../monitoring/safeMutationsMetrics';

interface ReconcileJobData {
  ledgerId: string;
  tenantId: string;
  correlationId: string;
  provider: string;
  model: string;
  estimated: {
    promptTokens: number;
    completionTokens: number;
    totalUsd: number;
  };
  actual?: {
    promptTokens: number;
    completionTokens: number;
    totalUsd: number;
  };
  originalPayload?: any;
  retryCount?: number;
}

interface ReconcileResult {
  success: boolean;
  actualTokens?: {
    promptTokens: number;
    completionTokens: number;
    totalUsd: number;
  };
  accuracyRatio?: number;
  error?: string;
}

interface ReconcileWorkerOptions {
  redisUrl?: string;
  concurrency?: number;
  maxRetries?: number;
  retryDelay?: number;
  enableMetrics?: boolean;
}

/**
 * Manages the reconciliation of estimated vs. actual token usage.
 * Uses a queue (currently mocked) to process reconciliation jobs asynchronously.
 */
export class ReconcileManager {
  // private queue: Queue<ReconcileJobData>;
  // private worker: Worker<ReconcileJobData>;
  // private events: QueueEvents;
  private redis: Redis;
  private budgetLedger = getBudgetLedgerManager();

  private stats = {
    processed: 0,
    succeeded: 0,
    failed: 0,
    retried: 0,
    lastProcessed: new Date(),
  };

  /**
   * Initializes the ReconcileManager.
   * @param options - Configuration options for the worker.
   */
  constructor(private options: ReconcileWorkerOptions = {}) {
    const redisConnection = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
    };

    // Initialize queue
    // this.queue = new Queue<ReconcileJobData>('reconcile', {
    //   connection: redisConnection,
    //   defaultJobOptions: {
    //     attempts: options.maxRetries || 5,
    //     backoff: {
    //       type: 'exponential',
    //       delay: options.retryDelay || 2000
    //     },
    //     removeOnComplete: 100, // Keep last 100 completed jobs
    //     removeOnFail: 50 // Keep last 50 failed jobs
    //   }
    // });

    // Initialize worker
    // this.worker = new Worker<ReconcileJobData>('reconcile',
    //   this.processReconciliation.bind(this),
    //   {
    //     connection: redisConnection,
    //     concurrency: options.concurrency || 5,
    //     maxStalledCount: 3,
    //     stalledInterval: 30000
    //   }
    // );

    // Initialize events
    // this.events = new QueueEvents('reconcile', {
    //   connection: redisConnection
    // });

    // this.setupEventListeners();
  }

  /**
   * Setup event listeners for monitoring
   */
  // private setupEventListeners(): void {
  //   this.worker.on('completed', (job) => {
  //     this.stats.processed++;
  //     this.stats.succeeded++;
  //     this.stats.lastProcessed = new Date();

  //     logger.debug('Reconciliation job completed', {
  //       jobId: job.id,
  //       ledgerId: job.data.ledgerId,
  //       duration: Date.now() - job.processedOn!
  //     });
  //   });

  //   this.worker.on('failed', (job, err) => {
  //     this.stats.processed++;
  //     this.stats.failed++;
  //     this.stats.lastProcessed = new Date();

  //     logger.error('Reconciliation job failed', {
  //       jobId: job?.id,
  //       ledgerId: job?.data?.ledgerId,
  //       error: err.message,
  //       retryCount: job?.attemptsMade
  //     });

  //     if (this.options.enableMetrics) {
  //       SafeMutationMetrics.recordRollback(
  //         'compensation_failure',
  //         'automatic',
  //         job?.data?.tenantId || 'unknown',
  //         'reconciliation'
  //       );
  //     }
  //   });

  //   this.worker.on('stalled', (jobId) => {
  //     logger.warn('Reconciliation job stalled', { jobId });
  //   });

  //   this.events.on('waiting', ({ jobId }) => {
  //     logger.debug('Reconciliation job waiting', { jobId });
  //   });
  // }

  /**
   * Enqueue reconciliation job
   */
  // async enqueueReconcile(data: ReconcileJobData): Promise<string> {
  //   try {
  //     // const job = await this.queue.add('reconcile', data, {
  //     //   priority: this.calculatePriority(data),
  //     //   delay: this.calculateDelay(data)
  //     // });

  //     logger.debug('Reconciliation job enqueued', {
  //       // jobId: job.id,
  //       ledgerId: data.ledgerId,
  //       tenantId: data.tenantId
  //     });

  //     return ""; // job.id!;
  //   } catch (error) {
  //     logger.error('Failed to enqueue reconciliation', { error, data });
  //     throw error;
  //   }
  // }

  /**
   * Calculates job priority based on cost and recency.
   *
   * @param data - The reconciliation job data.
   * @returns The calculated priority score.
   */
  private calculatePriority(data: ReconcileJobData): number {
    let priority = 0;

    // High-cost operations get priority
    if (data.estimated.totalUsd > 1.0) priority += 10;
    if (data.estimated.totalUsd > 5.0) priority += 20;

    // Recently created entries get priority
    const now = Date.now();
    const hourAgo = now - 60 * 60 * 1000;
    priority += 5; // Base priority for recent jobs

    return priority;
  }

  /**
   * Calculates a processing delay for the job.
   *
   * @param data - The reconciliation job data.
   * @returns The delay in milliseconds.
   */
  private calculateDelay(data: ReconcileJobData): number {
    // Immediate processing for high-value operations
    if (data.estimated.totalUsd > 1.0) {
      return 0;
    }

    // Small delay for regular operations to batch similar work
    return Math.random() * 5000; // 0-5 seconds
  }

  /**
   * Main reconciliation processor
   */
  // private async processReconciliation(job: any): Promise<ReconcileResult> { // Changed Job to any
  //   const { ledgerId, tenantId, correlationId, provider, model, estimated, actual, originalPayload } = job.data;

  //   logger.debug('Processing reconciliation job', {
  //     jobId: job.id,
  //     ledgerId,
  //     tenantId,
  //     provider,
  //     model
  //   });

  //   try {
  //     let actualTokens = actual;

  //     // If we don't have actual usage, try to fetch it from provider
  //     if (!actualTokens) {
  //       actualTokens = await this.fetchActualUsage(provider, model, correlationId, originalPayload);
  //     }

  //     // If still no actual usage, use estimation method for reconciliation
  //     if (!actualTokens && originalPayload) {
  //       const enhanced = await this.enhanceEstimation(provider, model, originalPayload);
  //       actualTokens = enhanced;
  //     }

  //     if (!actualTokens) {
  //       throw new Error('Unable to determine actual token usage');
  //     }

  //     // Update budget ledger with actual usage
  //     const reconciled = await this.budgetLedger.reconcileSpending(ledgerId, actualTokens);

  //     if (!reconciled) {
  //       throw new Error('Failed to update budget ledger');
  //     }

  //     // Calculate accuracy ratio for metrics
  //     const accuracyRatio = actualTokens.totalUsd / Math.max(estimated.totalUsd, 0.000001);

  //     // Record accuracy metrics
  //     if (this.options.enableMetrics) {
  //       SafeMutationMetrics.recordTokenEstimationAccuracy(
  //         provider,
  //         model,
  //         'reconciled',
  //         actualTokens.promptTokens + actualTokens.completionTokens,
  //         estimated.promptTokens + estimated.completionTokens
  //       );
  //     }

  //     logger.info('Reconciliation completed successfully', {
  //       ledgerId,
  //       tenantId,
  //       estimated: estimated.totalUsd,
  //       actual: actualTokens.totalUsd,
  //       accuracyRatio: accuracyRatio.toFixed(3)
  //     });

  //     return {
  //       success: true,
  //       actualTokens,
  //       accuracyRatio
  //     };

  //   } catch (error) {
  //     const errorMessage = error instanceof Error ? error.message : String(error);

  //     // Mark as failed in budget ledger
  //     await this.budgetLedger.markSpendingFailed(ledgerId, errorMessage, 'failed');

  //     logger.error('Reconciliation failed', {
  //       jobId: job.id,
  //       ledgerId,
  //       error: errorMessage,
  //       attemptsMade: job.attemptsMade
  //     });

  //     return {
  //       success: false,
  //       error: errorMessage
  //     };
  //   }
  // }

  /**
   * Fetches the actual usage data for a given provider and model.
   * Currently simulates this behavior using enhanced estimation as a fallback.
   *
   * @param provider - The AI provider name.
   * @param model - The model name.
   * @param correlationId - The correlation ID for the request.
   * @param originalPayload - The original request payload.
   * @returns The actual usage metrics or null if fetch failed.
   */
  private async fetchActualUsage(
    provider: string,
    model: string,
    correlationId: string,
    originalPayload?: any,
  ): Promise<{
    promptTokens: number;
    completionTokens: number;
    totalUsd: number;
  } | null> {
    try {
      // This would integrate with provider APIs to fetch actual usage
      // For now, we'll simulate this with enhanced estimation

      switch (provider) {
        case 'openai':
          return await this.fetchOpenAIUsage(correlationId, originalPayload);

        case 'anthropic':
          return await this.fetchAnthropicUsage(correlationId, originalPayload);

        case 'gemini':
          return await this.fetchGeminiUsage(correlationId, originalPayload);

        default:
          logger.warn('Unknown provider for usage reconciliation', {
            provider,
          });
          return null;
      }
    } catch (error) {
      logger.error('Failed to fetch actual usage from provider', {
        provider,
        model,
        correlationId,
        error,
      });
      return null;
    }
  }

  /**
   * Fetches OpenAI usage stats (mocked via estimation).
   *
   * @param correlationId - The correlation ID.
   * @param originalPayload - The original payload.
   * @returns Usage metrics.
   */
  private async fetchOpenAIUsage(
    correlationId: string,
    originalPayload?: any,
  ): Promise<{
    promptTokens: number;
    completionTokens: number;
    totalUsd: number;
  } | null> {
    // In production, this would query OpenAI's usage API
    // For now, use enhanced estimation as fallback

    if (!originalPayload) return null;

    try {
      const result = await estimateTokensAndCost({
        payload: originalPayload,
        provider: 'openai',
      });

      return {
        promptTokens: result.promptTokens,
        completionTokens: result.completionTokens,
        totalUsd: result.totalUSD,
      };
    } catch (error) {
      logger.error('OpenAI usage fallback failed', { error, correlationId });
      return null;
    }
  }

  /**
   * Fetches Anthropic usage stats (mocked via estimation).
   *
   * @param correlationId - The correlation ID.
   * @param originalPayload - The original payload.
   * @returns Usage metrics.
   */
  private async fetchAnthropicUsage(
    correlationId: string,
    originalPayload?: any,
  ): Promise<{
    promptTokens: number;
    completionTokens: number;
    totalUsd: number;
  } | null> {
    // Similar to OpenAI but for Anthropic API

    if (!originalPayload) return null;

    try {
      const result = await estimateTokensAndCost({
        payload: originalPayload,
        provider: 'anthropic',
      });

      return {
        promptTokens: result.promptTokens,
        completionTokens: result.completionTokens,
        totalUsd: result.totalUSD,
      };
    } catch (error) {
      logger.error('Anthropic usage fallback failed', { error, correlationId });
      return null;
    }
  }

  /**
   * Fetches Gemini usage stats (mocked via estimation).
   *
   * @param correlationId - The correlation ID.
   * @param originalPayload - The original payload.
   * @returns Usage metrics.
   */
  private async fetchGeminiUsage(
    correlationId: string,
    originalPayload?: any,
  ): Promise<{
    promptTokens: number;
    completionTokens: number;
    totalUsd: number;
  } | null> {
    // Similar to OpenAI but for Gemini API

    if (!originalPayload) return null;

    try {
      const result = await estimateTokensAndCost({
        payload: originalPayload,
        provider: 'gemini',
      });

      return {
        promptTokens: result.promptTokens,
        completionTokens: result.completionTokens,
        totalUsd: result.totalUSD,
      };
    } catch (error) {
      logger.error('Gemini usage fallback failed', { error, correlationId });
      return null;
    }
  }

  /**
   * Enhances the estimation using more detailed logic if actual usage is unavailable.
   *
   * @param provider - The provider name.
   * @param model - The model name.
   * @param payload - The request payload.
   * @returns Enhanced usage estimates.
   */
  private async enhanceEstimation(
    provider: string,
    model: string,
    payload: any,
  ): Promise<{
    promptTokens: number;
    completionTokens: number;
    totalUsd: number;
  }> {
    const result = await estimateTokensAndCost({
      payload,
      provider: provider as any,
    });

    return {
      promptTokens: result.promptTokens,
      completionTokens: result.completionTokens,
      totalUsd: result.totalUSD,
    };
  }

  /**
   * Get queue statistics
   */
  // async getQueueStats(): Promise<{
  //   waiting: number;
  //   active: number;
  //   completed: number;
  //   failed: number;
  //   delayed: number;
  //   processingStats: typeof this.stats;
  // }> {
  //   const [waiting, active, completed, failed, delayed] = await Promise.all([
  //     // this.queue.getWaiting(),
  //     // this.queue.getActive(),
  //     // this.queue.getCompleted(),
  //     // this.queue.getFailed(),
  //     // this.queue.getDelayed()
  //   ]);

  //   return {
  //     waiting: waiting.length,
  //     active: active.length,
  //     completed: completed.length,
  //     failed: failed.length,
  //     delayed: delayed.length,
  //     processingStats: { ...this.stats }
  //   };
  // }

  /**
   * Clean old jobs
   */
  // async cleanOldJobs(): Promise<void> {
  //   try {
  //     // await this.queue.clean(24 * 60 * 60 * 1000, 100, 'completed'); // 24h old completed jobs
  //     // await this.queue.clean(7 * 24 * 60 * 60 * 1000, 50, 'failed'); // 7d old failed jobs

  //     logger.info('Reconciliation queue cleanup completed');
  //   } catch (error) {
  //     logger.error('Failed to clean reconciliation queue', { error });
  //   }
  // }

  /**
   * Graceful shutdown
   */
  // async shutdown(): Promise<void> {
  //   logger.info('Shutting down reconciliation worker...');

  //   // await this.worker.close();
  //   // await this.events.close();
  //   // await this.queue.close();

  //   logger.info('Reconciliation worker shutdown complete');
  // }
}

// Global manager instance
let globalReconcileManager: ReconcileManager | null = null;

/**
 * Gets or creates the global ReconcileManager instance.
 *
 * @param options - Optional configuration.
 * @returns The ReconcileManager instance.
 */
export function getReconcileManager(
  options?: ReconcileWorkerOptions,
): ReconcileManager {
  if (!globalReconcileManager) {
    globalReconcileManager = new ReconcileManager({
      concurrency: parseInt(process.env.RECONCILE_CONCURRENCY || '5'),
      maxRetries: parseInt(process.env.RECONCILE_MAX_RETRIES || '5'),
      retryDelay: parseInt(process.env.RECONCILE_RETRY_DELAY || '2000'),
      enableMetrics: process.env.RECONCILE_ENABLE_METRICS === 'true',
      ...options,
    });
  }
  return globalReconcileManager;
}

/**
 * Convenient function to enqueue reconciliation
 */
// export async function enqueueReconciliation(data: ReconcileJobData): Promise<string> {
//   const manager = getReconcileManager();
//   return manager.enqueueReconcile(data);
// }

/**
 * Starts the reconciliation worker.
 * Sets up periodic cleanup and logging.
 *
 * @param options - Optional configuration.
 * @returns The started ReconcileManager.
 */
export function startReconcileWorker(options?: ReconcileWorkerOptions): ReconcileManager {
  const manager = getReconcileManager(options);

  // Setup periodic cleanup
  setInterval(async () => {
    try {
      // await manager.cleanOldJobs();
    } catch (error) {
      logger.error('Periodic reconciliation cleanup failed', { error });
    }
  }, 6 * 60 * 60 * 1000); // Every 6 hours

  logger.info('Reconciliation worker started', {
    concurrency: options?.concurrency || 5,
    maxRetries: options?.maxRetries || 5
  });

  return manager;
}
