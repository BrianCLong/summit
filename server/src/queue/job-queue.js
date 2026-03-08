"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobQueue = void 0;
// @ts-nocheck
const node_events_1 = require("node:events");
const bullmq_1 = require("bullmq");
const pino_1 = __importDefault(require("pino"));
const redis_js_1 = require("../db/redis.js");
/**
 * Distributed job queue with BullMQ, DLQ, scheduling, and observability hooks.
 */
class JobQueue {
    config;
    queue;
    queueEvents;
    queueScheduler;
    deadLetterQueue;
    worker;
    logger = pino_1.default({ name: 'JobQueue' });
    progressEmitter = new node_events_1.EventEmitter();
    connection;
    ownsConnection;
    defaultAttempts;
    constructor(config) {
        this.config = config;
        this.connection = config.connection ?? (0, redis_js_1.getRedisClient)();
        this.ownsConnection = !config.connection;
        const defaultJobOptions = {
            attempts: 5,
            backoff: { type: 'exponential', delay: 2000 },
            removeOnComplete: { age: 24 * 3600, count: 1000 },
            removeOnFail: { age: 7 * 24 * 3600 },
            priority: 5,
            ...config.defaultJobOptions,
        };
        this.defaultAttempts = defaultJobOptions.attempts ?? 1;
        this.queue = new bullmq_1.Queue(config.name, {
            connection: this.connection,
            defaultJobOptions,
            ...config.queueOptions,
        });
        if (config.deadLetterQueueName) {
            this.deadLetterQueue = new bullmq_1.Queue(config.deadLetterQueueName, {
                connection: this.connection,
                defaultJobOptions: {
                    removeOnComplete: true,
                    removeOnFail: true,
                },
            });
        }
        this.queueScheduler = new bullmq_1.QueueScheduler(config.name, {
            connection: this.connection,
        });
        this.queueEvents = new bullmq_1.QueueEvents(config.name, {
            connection: this.connection,
        });
        this.queueEvents.on('progress', ({ jobId, data }) => {
            if (!jobId)
                return;
            this.progressEmitter.emit('progress', { jobId, progress: data });
        });
    }
    async start(processor) {
        if (this.worker) {
            return;
        }
        await Promise.all([this.queueScheduler.waitUntilReady(), this.queueEvents.waitUntilReady()]);
        this.worker = new bullmq_1.Worker(this.config.name, processor, {
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
            if (!job?.id)
                return;
            this.progressEmitter.emit('progress', { jobId: job.id, progress });
        });
        this.worker.on('failed', async (job, err) => {
            this.logger.error({ jobId: job?.id, err }, 'Job failed');
            if (!job || !this.deadLetterQueue)
                return;
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
    async enqueue(data, options = {}) {
        const job = await this.queue.add(options.jobName ?? this.config.name, options.data ?? data, {
            jobId: options.jobId,
            priority: options.priority,
            delay: options.delay,
            attempts: options.attempts,
            backoff: options.backoff,
            repeat: options.repeat,
            lifo: options.lifo,
        });
        return job.id;
    }
    async schedule(data, options) {
        const delay = Math.max(0, options.at.getTime() - Date.now());
        return this.enqueue(data, {
            delay,
            jobId: options.jobId,
            priority: options.priority,
            jobName: options.jobName,
            data: options.data,
        });
    }
    async getJobDetails(jobId) {
        const job = await this.queue.getJob(jobId);
        if (!job)
            return null;
        const [state, progress] = await Promise.all([
            job.getState(),
            Promise.resolve(typeof job.progress === 'function'
                ? job.progress()
                : job.progress),
        ]);
        return {
            id: job.id,
            name: job.name,
            data: job.data,
            state,
            progress: progress ?? 0,
            attemptsMade: job.attemptsMade,
            maxAttempts: this.getMaxAttempts(job),
            failedReason: job.failedReason,
            returnValue: job.returnvalue ?? job.returnValue,
            createdAt: job.timestamp ? new Date(job.timestamp) : undefined,
            startedAt: job.processedOn ? new Date(job.processedOn) : undefined,
            finishedAt: job.finishedOn ? new Date(job.finishedOn) : undefined,
            stacktrace: job.stacktrace,
        };
    }
    async metrics() {
        const counts = await this.queue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed');
        return {
            waiting: counts.waiting ?? 0,
            active: counts.active ?? 0,
            completed: counts.completed ?? 0,
            failed: counts.failed ?? 0,
            delayed: counts.delayed ?? 0,
        };
    }
    async pause() {
        await this.queue.pause();
        if (this.worker) {
            await this.worker.pause();
        }
    }
    async resume() {
        await this.queue.resume();
        if (this.worker) {
            await this.worker.resume();
        }
    }
    async shutdown() {
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
    onProgress(listener) {
        this.progressEmitter.on('progress', listener);
        return () => this.progressEmitter.off('progress', listener);
    }
    getWorkerState() {
        return {
            isRunning: Boolean(this.worker),
            concurrency: this.config.workerOptions?.concurrency ?? 5,
            queueName: this.config.name,
        };
    }
    getMaxAttempts(job) {
        return job.opts.attempts ?? this.defaultAttempts;
    }
}
exports.JobQueue = JobQueue;
