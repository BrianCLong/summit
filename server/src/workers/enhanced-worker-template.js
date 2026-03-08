"use strict";
// @ts-nocheck
/**
 * Enhanced Worker Template for IntelGraph Platform
 * Replaces corrupted workers with BullMQ + Zod schemas + OTEL spans
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnhancedWorker = exports.WorkerPayloadSchema = void 0;
exports.createEmbeddingUpsertWorker = createEmbeddingUpsertWorker;
const bullmq_1 = require("bullmq");
const zod_1 = require("zod");
const api_1 = require("@opentelemetry/api");
const logger_js_1 = __importDefault(require("../utils/logger.js"));
// Zod schema for type-safe payloads
exports.WorkerPayloadSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    operation: zod_1.z.enum(['upsert', 'delete', 'batch_process']),
    data: zod_1.z.record(zod_1.z.unknown()),
    metadata: zod_1.z.object({
        tenant_id: zod_1.z.string(),
        user_id: zod_1.z.string().optional(),
        priority: zod_1.z.number().min(1).max(10).default(5),
        retry_count: zod_1.z.number().default(0),
        max_retries: zod_1.z.number().default(3),
    }),
    timestamp: zod_1.z.string().datetime(),
});
class EnhancedWorker {
    config;
    processor;
    worker;
    queue;
    tracer = api_1.trace.getTracer('intelgraph-worker', '1.0.0');
    logger = logger_js_1.default.child({ component: 'enhanced-worker' });
    constructor(config, processor) {
        this.config = config;
        this.processor = processor;
        this.queue = new bullmq_1.Queue(config.queueName, {
            connection: config.connection,
            defaultJobOptions: config.defaultJobOptions,
        });
        this.worker = new bullmq_1.Worker(config.queueName, this.processJob.bind(this), {
            connection: config.connection,
            concurrency: config.concurrency,
            removeOnComplete: config.defaultJobOptions.removeOnComplete,
            removeOnFail: config.defaultJobOptions.removeOnFail,
        });
        this.setupEventHandlers();
    }
    async processJob(job) {
        const span = this.tracer.startSpan(`worker.${this.config.queueName}.process`);
        try {
            // Validate payload with Zod
            const payload = exports.WorkerPayloadSchema.parse(job.data);
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
            span.setStatus({ code: api_1.SpanStatusCode.OK });
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
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            span.recordException(error);
            span.setStatus({
                code: api_1.SpanStatusCode.ERROR,
                message: errorMessage,
            });
            this.logger.error('Worker job failed', {
                jobId: job.id,
                error: errorMessage,
                stack: error instanceof Error ? error.stack : undefined,
            });
            throw error;
        }
        finally {
            span.end();
        }
    }
    setupEventHandlers() {
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
    // Add job to queue with validation
    async addJob(name, payload, options) {
        // Validate before queueing
        const validatedPayload = exports.WorkerPayloadSchema.parse(payload);
        return this.queue.add(name, validatedPayload, options);
    }
    // Health check
    async healthCheck() {
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
        }
        catch (error) {
            return {
                healthy: false,
                stats: {
                    error: error instanceof Error ? error.message : 'Unknown error',
                },
            };
        }
    }
    // Graceful shutdown
    async shutdown() {
        this.logger.info('Shutting down enhanced worker...');
        await this.worker.close();
        await this.queue.close();
        this.logger.info('Enhanced worker shutdown complete');
    }
}
exports.EnhancedWorker = EnhancedWorker;
// Factory function for creating specific workers
function createEmbeddingUpsertWorker() {
    const config = {
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
    const processor = async (payload) => {
        // Embedding upsert implementation
        logger_js_1.default.info('Processing embedding upsert', {
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
