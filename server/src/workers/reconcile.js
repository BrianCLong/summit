"use strict";
// @ts-nocheck
/**
 * BullMQ Reconciliation Worker: Post-hoc token usage reconciliation
 * Processes actual vs estimated token usage for budget accuracy
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReconcileManager = void 0;
exports.getReconcileManager = getReconcileManager;
const logger_js_1 = __importDefault(require("../utils/logger.js"));
const budgetLedger_js_1 = require("../db/budgetLedger.js");
const tokcount_enhanced_js_1 = require("../lib/tokcount-enhanced.js");
/**
 * Reconciliation Queue Manager
 */
class ReconcileManager {
    options;
    // private queue: Queue<ReconcileJobData>;
    // private worker: Worker<ReconcileJobData>;
    // private events: QueueEvents;
    redis;
    budgetLedger = (0, budgetLedger_js_1.getBudgetLedgerManager)();
    stats = {
        processed: 0,
        succeeded: 0,
        failed: 0,
        retried: 0,
        lastProcessed: new Date(),
    };
    constructor(options = {}) {
        this.options = options;
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
    //   this.worker.on('completed', (job: any) => {
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
    //   } catch (error: any) {
    //     logger.error('Failed to enqueue reconciliation', { error, data });
    //     throw error;
    //   }
    // }
    /**
     * Calculate job priority (higher number = higher priority)
     */
    calculatePriority(data) {
        let priority = 0;
        // High-cost operations get priority
        if (data.estimated.totalUsd > 1.0)
            priority += 10;
        if (data.estimated.totalUsd > 5.0)
            priority += 20;
        // Recently created entries get priority
        const now = Date.now();
        const hourAgo = now - 60 * 60 * 1000;
        priority += 5; // Base priority for recent jobs
        return priority;
    }
    /**
     * Calculate job delay based on data
     */
    calculateDelay(data) {
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
    // private async processReconciliation(job): Promise<ReconcileResult> { // Changed Job to any
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
    //   } catch (error: any) {
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
     * Fetch actual usage from provider APIs
     */
    async fetchActualUsage(provider, model, correlationId, originalPayload) {
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
                    logger_js_1.default.warn('Unknown provider for usage reconciliation', {
                        provider,
                    });
                    return null;
            }
        }
        catch (error) {
            logger_js_1.default.error('Failed to fetch actual usage from provider', {
                provider,
                model,
                correlationId,
                error,
            });
            return null;
        }
    }
    /**
     * OpenAI usage reconciliation
     */
    async fetchOpenAIUsage(correlationId, originalPayload) {
        // In production, this would query OpenAI's usage API
        // For now, use enhanced estimation as fallback
        if (!originalPayload)
            return null;
        try {
            const result = await (0, tokcount_enhanced_js_1.estimateTokensAndCost)({
                payload: originalPayload,
                provider: 'openai',
            });
            return {
                promptTokens: result.promptTokens,
                completionTokens: result.completionTokens,
                totalUsd: result.totalUSD,
            };
        }
        catch (error) {
            logger_js_1.default.error('OpenAI usage fallback failed', { error, correlationId });
            return null;
        }
    }
    /**
     * Anthropic usage reconciliation
     */
    async fetchAnthropicUsage(correlationId, originalPayload) {
        // Similar to OpenAI but for Anthropic API
        if (!originalPayload)
            return null;
        try {
            const result = await (0, tokcount_enhanced_js_1.estimateTokensAndCost)({
                payload: originalPayload,
                provider: 'anthropic',
            });
            return {
                promptTokens: result.promptTokens,
                completionTokens: result.completionTokens,
                totalUsd: result.totalUSD,
            };
        }
        catch (error) {
            logger_js_1.default.error('Anthropic usage fallback failed', { error, correlationId });
            return null;
        }
    }
    /**
     * Google Gemini usage reconciliation
     */
    async fetchGeminiUsage(correlationId, originalPayload) {
        // Similar to OpenAI but for Gemini API
        if (!originalPayload)
            return null;
        try {
            const result = await (0, tokcount_enhanced_js_1.estimateTokensAndCost)({
                payload: originalPayload,
                provider: 'gemini',
            });
            return {
                promptTokens: result.promptTokens,
                completionTokens: result.completionTokens,
                totalUsd: result.totalUSD,
            };
        }
        catch (error) {
            logger_js_1.default.error('Gemini usage fallback failed', { error, correlationId });
            return null;
        }
    }
    /**
     * Enhanced estimation for reconciliation
     */
    async enhanceEstimation(provider, model, payload) {
        const result = await (0, tokcount_enhanced_js_1.estimateTokensAndCost)({
            payload,
            provider: provider,
        });
        return {
            promptTokens: result.promptTokens,
            completionTokens: result.completionTokens,
            totalUsd: result.totalUSD,
        };
    }
}
exports.ReconcileManager = ReconcileManager;
// Global manager instance
let globalReconcileManager = null;
/**
 * Get global reconciliation manager
 */
function getReconcileManager(options) {
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
 * Start reconciliation worker (called from server startup)
 */
// export function startReconcileWorker(options?: ReconcileWorkerOptions): ReconcileManager {
//   const manager = getReconcileManager(options);
//   // Setup periodic cleanup
//   setInterval(async () => {
//     try {
//       await manager.cleanOldJobs();
//     } catch (error: any) {
//       logger.error('Periodic reconciliation cleanup failed', { error });
//     }
//   }, 6 * 60 * 60 * 1000); // Every 6 hours
//   logger.info('Reconciliation worker started', {
//     concurrency: options?.concurrency || 5,
//     maxRetries: options?.maxRetries || 5
//   });
//   return manager;
// }
