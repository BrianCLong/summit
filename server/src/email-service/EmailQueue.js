"use strict";
// @ts-nocheck
/**
 * Email Queue
 *
 * Manages email sending queue with retry logic and rate limiting
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailQueue = void 0;
const bullmq_1 = require("bullmq");
class EmailQueue {
    queue;
    worker = null;
    config;
    redis;
    constructor(config) {
        this.config = config;
        // Create Redis connection
        this.redis = new ioredis_1.Redis({
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379'),
            maxRetriesPerRequest: null,
        });
        // Create BullMQ queue
        this.queue = new bullmq_1.Queue('email-queue', {
            connection: this.redis,
            defaultJobOptions: {
                attempts: config?.retryAttempts || 3,
                backoff: {
                    type: config?.retryBackoff || 'exponential',
                    delay: config?.retryDelay || 1000,
                },
                removeOnComplete: {
                    age: 24 * 3600, // Keep completed jobs for 24 hours
                    count: 1000,
                },
                removeOnFail: {
                    age: 7 * 24 * 3600, // Keep failed jobs for 7 days
                },
            },
        });
    }
    async initialize() {
        // Worker will be started separately via startWorker()
    }
    /**
     * Start processing queue
     */
    async startWorker(processFn) {
        this.worker = new bullmq_1.Worker('email-queue', async (job) => {
            await processFn(job);
        }, {
            connection: this.redis,
            concurrency: this.config?.concurrency || 5,
            limiter: {
                max: 10,
                duration: 1000, // 10 jobs per second
            },
        });
        this.worker.on('completed', (job) => {
            console.log(`Email job ${job.id} completed`);
        });
        this.worker.on('failed', (job, err) => {
            console.error(`Email job ${job?.id} failed:`, err);
        });
    }
    /**
     * Enqueue an email for sending
     */
    async enqueue(message, options) {
        const job = await this.queue.add('send-email', message, {
            priority: options?.priority,
            delay: options?.delay,
        });
        return job.id ?? '';
    }
    /**
     * Get job status
     */
    async getJobStatus(jobId) {
        const job = await this.queue.getJob(jobId);
        if (!job) {
            return null;
        }
        const state = await job.getState();
        return {
            id: job.id ?? '',
            message: job.data,
            priority: job.opts.priority ?? 0,
            attempts: job.attemptsMade,
            maxAttempts: job.opts.attempts ?? 3,
            createdAt: new Date(job.timestamp),
            scheduledFor: job.opts.delay
                ? new Date(job.timestamp + job.opts.delay)
                : undefined,
            lastAttemptAt: job.processedOn ? new Date(job.processedOn) : undefined,
            error: job.failedReason,
            status: this.mapState(state),
        };
    }
    /**
     * Cancel a queued email
     */
    async cancel(jobId) {
        const job = await this.queue.getJob(jobId);
        if (job) {
            await job.remove();
            return true;
        }
        return false;
    }
    /**
     * Get queue metrics
     */
    async getMetrics() {
        const [waiting, active, completed, failed, delayed] = await Promise.all([
            this.queue.getWaitingCount(),
            this.queue.getActiveCount(),
            this.queue.getCompletedCount(),
            this.queue.getFailedCount(),
            this.queue.getDelayedCount(),
        ]);
        return {
            waiting,
            active,
            completed,
            failed,
            delayed,
            total: waiting + active + completed + failed + delayed,
        };
    }
    /**
     * Pause queue processing
     */
    async pause() {
        await this.queue.pause();
    }
    /**
     * Resume queue processing
     */
    async resume() {
        await this.queue.resume();
    }
    /**
     * Shutdown queue
     */
    async shutdown() {
        if (this.worker) {
            await this.worker.close();
        }
        await this.queue.close();
        await this.redis.quit();
    }
    mapState(state) {
        switch (state) {
            case 'waiting':
            case 'delayed':
                return 'pending';
            case 'active':
                return 'processing';
            case 'completed':
                return 'sent';
            case 'failed':
                return 'failed';
            default:
                return 'pending';
        }
    }
}
exports.EmailQueue = EmailQueue;
