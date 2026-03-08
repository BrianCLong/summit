"use strict";
// @ts-nocheck
/**
 * Centralized Bull Queue Configuration
 * Issue: #11812 - Job Queue with Bull and Redis
 *
 * Provides configuration and utilities for BullMQ job queues
 * MIT License - Copyright (c) 2025 IntelGraph
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.queueRegistry = exports.JobPriority = exports.QueueName = exports.defaultWorkerOptions = exports.defaultQueueOptions = void 0;
exports.createRedisConnection = createRedisConnection;
exports.addJob = addJob;
exports.addRepeatableJob = addRepeatableJob;
exports.gracefulShutdown = gracefulShutdown;
const bullmq_1 = require("bullmq");
const ioredis_1 = __importDefault(require("ioredis"));
const logger_js_1 = __importDefault(require("../utils/logger.js"));
// Redis connection configuration
const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379', 10);
const REDIS_PASSWORD = process.env.REDIS_PASSWORD;
const REDIS_DB = parseInt(process.env.REDIS_QUEUE_DB || '1', 10);
/**
 * Create Redis connection for BullMQ
 */
function createRedisConnection() {
    const connection = new ioredis_1.default({
        host: REDIS_HOST,
        port: REDIS_PORT,
        password: REDIS_PASSWORD,
        db: REDIS_DB,
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
        retryStrategy: (times) => {
            const delay = Math.min(times * 50, 2000);
            logger_js_1.default.warn(`Redis connection retry attempt ${times}, waiting ${delay}ms`);
            return delay;
        },
    });
    connection.on('error', (err) => {
        logger_js_1.default.error('Redis connection error', { error: err.message });
    });
    connection.on('connect', () => {
        logger_js_1.default.info('Redis connection established for queues');
    });
    return connection;
}
/**
 * Default queue options
 */
exports.defaultQueueOptions = {
    connection: createRedisConnection(),
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 2000,
        },
        removeOnComplete: {
            age: 24 * 3600, // Keep completed jobs for 24 hours
            count: 1000, // Keep max 1000 completed jobs
        },
        removeOnFail: {
            age: 7 * 24 * 3600, // Keep failed jobs for 7 days
        },
    },
};
/**
 * Default worker options
 */
exports.defaultWorkerOptions = {
    connection: createRedisConnection(),
    concurrency: parseInt(process.env.QUEUE_WORKER_CONCURRENCY || '5', 10),
    limiter: {
        max: 10,
        duration: 1000,
    },
    autorun: true,
};
/**
 * Queue names enum for type safety
 */
var QueueName;
(function (QueueName) {
    QueueName["EMAIL"] = "email";
    QueueName["NOTIFICATIONS"] = "notifications";
    QueueName["DATA_PROCESSING"] = "data-processing";
    QueueName["ANALYTICS"] = "analytics";
    QueueName["WEBHOOKS"] = "webhooks";
    QueueName["TRUST_SCORE"] = "trust-score";
    QueueName["EMBEDDING"] = "embedding";
    QueueName["RETENTION"] = "retention";
})(QueueName || (exports.QueueName = QueueName = {}));
/**
 * Job priority levels
 */
var JobPriority;
(function (JobPriority) {
    JobPriority[JobPriority["CRITICAL"] = 1] = "CRITICAL";
    JobPriority[JobPriority["HIGH"] = 2] = "HIGH";
    JobPriority[JobPriority["NORMAL"] = 3] = "NORMAL";
    JobPriority[JobPriority["LOW"] = 4] = "LOW";
    JobPriority[JobPriority["BACKGROUND"] = 5] = "BACKGROUND";
})(JobPriority || (exports.JobPriority = JobPriority = {}));
/**
 * Queue registry to manage all queues
 */
class QueueRegistry {
    queues = new Map();
    workers = new Map();
    /**
     * Get or create a queue
     */
    getQueue(name, options) {
        if (!this.queues.has(name)) {
            const queue = new bullmq_1.Queue(name, {
                ...exports.defaultQueueOptions,
                ...options,
            });
            this.queues.set(name, queue);
            logger_js_1.default.info(`Queue created: ${name}`);
        }
        return this.queues.get(name);
    }
    /**
     * Register a worker for a queue
     */
    registerWorker(name, processor, options) {
        if (this.workers.has(name)) {
            logger_js_1.default.warn(`Worker already exists for queue: ${name}`);
            return this.workers.get(name);
        }
        const worker = new bullmq_1.Worker(name, processor, {
            ...exports.defaultWorkerOptions,
            ...options,
        });
        // Worker event handlers
        worker.on('completed', (job) => {
            logger_js_1.default.info(`Job completed: ${job.id} in queue ${name}`, {
                queue: name,
                jobId: job.id,
                jobName: job.name,
                duration: Date.now() - job.timestamp,
            });
        });
        worker.on('failed', (job, err) => {
            logger_js_1.default.error(`Job failed: ${job?.id} in queue ${name}`, {
                queue: name,
                jobId: job?.id,
                jobName: job?.name,
                error: err.message,
                stack: err.stack,
                attempts: job?.attemptsMade,
            });
        });
        worker.on('error', (err) => {
            logger_js_1.default.error(`Worker error in queue ${name}`, {
                queue: name,
                error: err.message,
                stack: err.stack,
            });
        });
        this.workers.set(name, worker);
        logger_js_1.default.info(`Worker registered for queue: ${name}`);
        return worker;
    }
    /**
     * Get all queues
     */
    getAllQueues() {
        return Array.from(this.queues.values());
    }
    /**
     * Get all workers
     */
    getAllWorkers() {
        return Array.from(this.workers.values());
    }
    /**
     * Close all queues and workers
     */
    async close() {
        logger_js_1.default.info('Closing all queues and workers');
        const closePromises = [];
        // Close all workers
        for (const [name, worker] of this.workers) {
            closePromises.push(worker.close().then(() => {
                logger_js_1.default.info(`Worker closed: ${name}`);
            }));
        }
        // Close all queues
        for (const [name, queue] of this.queues) {
            closePromises.push(queue.close().then(() => {
                logger_js_1.default.info(`Queue closed: ${name}`);
            }));
        }
        await Promise.all(closePromises);
        this.queues.clear();
        this.workers.clear();
        logger_js_1.default.info('All queues and workers closed');
    }
}
/**
 * Global queue registry instance
 */
exports.queueRegistry = new QueueRegistry();
/**
 * Helper to add a job to a queue
 */
async function addJob(queueName, jobName, data, options) {
    const queue = exports.queueRegistry.getQueue(queueName);
    await queue.add(jobName, data, {
        priority: options?.priority || JobPriority.NORMAL,
        delay: options?.delay,
        attempts: options?.attempts,
        removeOnComplete: options?.removeOnComplete,
        removeOnFail: options?.removeOnFail,
    });
    logger_js_1.default.info(`Job added to queue: ${queueName}/${jobName}`, {
        queue: queueName,
        jobName,
        priority: options?.priority,
    });
}
/**
 * Helper to add a repeatable job (cron-like)
 */
async function addRepeatableJob(queueName, jobName, data, cronExpression) {
    const queue = exports.queueRegistry.getQueue(queueName);
    await queue.add(jobName, data, {
        repeat: {
            pattern: cronExpression,
        },
    });
    logger_js_1.default.info(`Repeatable job added: ${queueName}/${jobName}`, {
        queue: queueName,
        jobName,
        cron: cronExpression,
    });
}
/**
 * Graceful shutdown handler
 */
async function gracefulShutdown() {
    logger_js_1.default.info('Graceful shutdown initiated for queues');
    await exports.queueRegistry.close();
}
// Register shutdown handlers
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
exports.default = exports.queueRegistry;
