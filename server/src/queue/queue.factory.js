"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueueFactory = void 0;
// @ts-nocheck
const bullmq_1 = require("bullmq");
const index_js_1 = __importDefault(require("../config/index.js"));
const logger_js_1 = __importDefault(require("../utils/logger.js"));
const ioredis_1 = __importDefault(require("ioredis"));
const prom_client_1 = require("prom-client");
// Prometheus metrics
// const queueSizeGauge = new Counter({
//   name: 'job_queue_added_total',
//   help: 'Total number of jobs added to the queue',
//   labelNames: ['queue_name'],
// });
const jobDurationHistogram = new prom_client_1.Histogram({
    name: 'job_processing_duration_seconds',
    help: 'Duration of job processing in seconds',
    labelNames: ['queue_name', 'status'],
    buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60, 120, 300],
});
const jobFailuresCounter = new prom_client_1.Counter({
    name: 'job_failures_total',
    help: 'Total number of failed jobs',
    labelNames: ['queue_name', 'reason'],
});
class QueueFactory {
    static redisConnectionOptions = {
        host: index_js_1.default.redis.host,
        port: index_js_1.default.redis.port,
        password: index_js_1.default.redis.password,
        db: index_js_1.default.redis.db,
        maxRetriesPerRequest: null, // Required by BullMQ
    };
    static sharedConnection = new ioredis_1.default(QueueFactory.redisConnectionOptions);
    static createQueue(name, options = {}) {
        const queue = new bullmq_1.Queue(name, {
            connection: QueueFactory.sharedConnection,
            defaultJobOptions: {
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 1000,
                },
                removeOnComplete: {
                    age: 24 * 3600, // Keep for 24 hours
                    count: 1000
                },
                removeOnFail: {
                    age: 7 * 24 * 3600 // Keep failed jobs for 7 days
                },
            },
            ...options,
        });
        // Metric for added jobs
        // BullMQ doesn't have a direct "on added" event on the queue instance easily without QueueEvents,
        // but we can wrap add/addBulk if we really wanted to.
        // For now, we'll assume the producer increments the counter or we use QueueEvents elsewhere.
        // Actually, let's use QueueEvents here to monitor? No, typically QueueEvents are separate connections.
        return queue;
    }
    static createWorker(name, processor, options = {}) {
        const worker = new bullmq_1.Worker(name, async (job) => {
            const end = jobDurationHistogram.startTimer({ queue_name: name });
            try {
                logger_js_1.default.info(`Processing job ${job.id} in ${name}`);
                const result = await processor(job);
                end({ status: 'success' });
                return result;
            }
            catch (error) {
                end({ status: 'failed' });
                jobFailuresCounter.inc({ queue_name: name, reason: error.message || 'unknown' });
                logger_js_1.default.error(`Job ${job.id} failed in ${name}:`, error);
                throw error;
            }
        }, {
            connection: QueueFactory.redisConnectionOptions, // Workers need blocking connection, so new connection
            concurrency: options.concurrency || 1,
            ...options,
        });
        worker.on('completed', (job) => {
            logger_js_1.default.info(`Job ${job.id} completed in ${name}`);
        });
        worker.on('failed', (job, err) => {
            logger_js_1.default.error(`Job ${job?.id} failed in ${name}: ${err.message}`);
        });
        return worker;
    }
}
exports.QueueFactory = QueueFactory;
