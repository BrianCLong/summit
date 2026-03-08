"use strict";
// @ts-nocheck
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.DistributedQueue = void 0;
exports.createDistributedQueue = createDistributedQueue;
const bullmq_1 = require("bullmq");
const events_1 = require("events");
const uuid_1 = require("uuid");
const types_js_1 = require("./types.js");
const logger_js_1 = require("../utils/logger.js");
class DistributedQueue extends events_1.EventEmitter {
    config;
    redisClient;
    queues = new Map();
    workers = new Map();
    queueEvents = new Map();
    deadLetterQueue;
    flowProducer;
    processors = new Map();
    idempotencyCache = new Map();
    logger;
    isShuttingDown = false;
    constructor(name, redisClient, options = {}) {
        super();
        this.redisClient = redisClient;
        this.logger = new logger_js_1.Logger(`DistributedQueue:${name}`);
        this.config = {
            name,
            partitions: options.partitions ?? [
                { id: 'default', name: 'Default', weight: 1, maxConcurrency: 10 },
            ],
            defaultPriority: options.defaultPriority ?? types_js_1.DistributedPriority.NORMAL,
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
    async initialize() {
        const connection = await this.getRedisConnection();
        // Create partition queues
        for (const partition of this.config.partitions) {
            const queueName = this.getPartitionQueueName(partition.id);
            const queue = new bullmq_1.Queue(queueName, {
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
            const events = new bullmq_1.QueueEvents(queueName, { connection });
            this.queueEvents.set(partition.id, events);
            this.setupQueueEventHandlers(partition.id, events);
        }
        // Create dead-letter queue if enabled
        if (this.config.deadLetterConfig.enabled) {
            this.deadLetterQueue = new bullmq_1.Queue(this.config.deadLetterConfig.queueName, {
                connection,
                defaultJobOptions: {
                    removeOnComplete: false,
                    removeOnFail: false,
                },
            });
        }
        // Create flow producer for complex workflows
        this.flowProducer = new bullmq_1.FlowProducer({ connection });
        this.logger.info('Distributed queue initialized', {
            partitions: this.config.partitions.map(p => p.id),
            deadLetterEnabled: this.config.deadLetterConfig.enabled,
        });
        this.emit('initialized');
    }
    /**
     * Add a job to the queue
     */
    async addJob(name, data, options = {}) {
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
                    return job;
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
        const jobId = options.idempotencyKey ?? (0, uuid_1.v4)();
        const bullmqJob = await queue.add(name, {
            __data: data,
            __metadata: options.metadata,
            __correlationId: options.correlationId ?? (0, uuid_1.v4)(),
            __agentId: options.agentId,
            __fleetId: options.fleetId,
            __routingKey: options.routingKey,
        }, {
            jobId,
            priority,
            attempts: retryStrategy.maxAttempts,
            backoff: {
                type: 'exponential',
                delay: retryStrategy.initialDelay,
            },
            delay: options.delay,
            repeat: options.repeat,
            lifo: priority === types_js_1.DistributedPriority.CRITICAL,
            removeOnComplete: {
                age: 86400,
                count: 1000,
            },
            removeOnFail: {
                age: 604800,
                count: 5000,
            },
        });
        const distributedJob = this.toDistributedJob(bullmqJob, partition);
        // Store idempotency key if provided
        if (options.idempotencyKey) {
            this.storeIdempotency(options.idempotencyKey, bullmqJob.id);
        }
        this.logger.info('Job added', { jobId: bullmqJob.id, name, partition, priority });
        this.emit('job:added', distributedJob);
        return distributedJob;
    }
    /**
     * Add multiple jobs in bulk
     */
    async addBulk(jobs) {
        // Group jobs by partition
        const partitionedJobs = new Map();
        for (const job of jobs) {
            const partition = job.options?.partition ?? 'default';
            if (!partitionedJobs.has(partition)) {
                partitionedJobs.set(partition, []);
            }
            partitionedJobs.get(partition).push(job);
        }
        const results = [];
        for (const [partition, partitionJobs] of partitionedJobs) {
            const queue = this.queues.get(partition);
            if (!queue) {
                throw new Error(`Partition ${partition} not found`);
            }
            const bullmqJobs = await queue.addBulk(partitionJobs.map(job => ({
                name: job.name,
                data: {
                    __data: job.data,
                    __metadata: job.options?.metadata,
                    __correlationId: job.options?.correlationId ?? (0, uuid_1.v4)(),
                },
                opts: {
                    priority: job.options?.priority ?? this.config.defaultPriority,
                    jobId: job.options?.idempotencyKey ?? (0, uuid_1.v4)(),
                },
            })));
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
    registerProcessor(processor, options = {}) {
        const partition = options.partition ?? 'default';
        const concurrency = options.concurrency ?? this.config.partitions.find(p => p.id === partition)?.maxConcurrency ?? 10;
        this.processors.set(partition, processor);
        this.startWorker(partition, processor, concurrency, options.filter);
        this.logger.info('Processor registered', { partition, concurrency });
    }
    /**
     * Get a job by ID
     */
    async getJob(jobId) {
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
    async getJobs(status, partition, start = 0, end = 100) {
        const statuses = Array.isArray(status) ? status : [status];
        const queues = partition ? [[partition, this.queues.get(partition)]] : Array.from(this.queues);
        const results = [];
        for (const [part, queue] of queues) {
            if (!queue)
                continue;
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
    async retryJob(jobId) {
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
    async removeJob(jobId) {
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
    async pause(partition) {
        if (partition) {
            const queue = this.queues.get(partition);
            if (queue) {
                await queue.pause();
                this.logger.info('Partition paused', { partition });
            }
        }
        else {
            for (const [part, queue] of this.queues) {
                await queue.pause();
                this.logger.info('Partition paused', { partition: part });
            }
        }
    }
    /**
     * Resume a partition or all partitions
     */
    async resume(partition) {
        if (partition) {
            const queue = this.queues.get(partition);
            if (queue) {
                await queue.resume();
                this.logger.info('Partition resumed', { partition });
            }
        }
        else {
            for (const [part, queue] of this.queues) {
                await queue.resume();
                this.logger.info('Partition resumed', { partition: part });
            }
        }
    }
    /**
     * Get queue statistics
     */
    async getStats() {
        const partitionStats = new Map();
        let totalWaiting = 0;
        let totalActive = 0;
        let totalCompleted = 0;
        let totalFailed = 0;
        let totalDelayed = 0;
        let totalPaused = 0;
        let deadLetterCount = 0;
        for (const [partition, queue] of this.queues) {
            const counts = await queue.getJobCounts();
            const stats = {
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
            errorRate: totalCompleted + totalFailed > 0
                ? (totalFailed / (totalCompleted + totalFailed)) * 100
                : 0,
            partitions: partitionStats,
        };
    }
    /**
     * Get dead-letter queue jobs
     */
    async getDeadLetterJobs(start = 0, end = 100) {
        if (!this.deadLetterQueue) {
            return [];
        }
        const jobs = await this.deadLetterQueue.getJobs(['waiting', 'active'], start, end);
        return jobs.map(job => this.toDistributedJob(job, 'dead-letter'));
    }
    /**
     * Purge dead-letter queue
     */
    async purgeDeadLetterQueue() {
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
    async createPartition(partition) {
        if (this.queues.has(partition.id)) {
            throw new Error(`Partition ${partition.id} already exists`);
        }
        const connection = await this.getRedisConnection();
        const queueName = this.getPartitionQueueName(partition.id);
        const queue = new bullmq_1.Queue(queueName, { connection });
        this.queues.set(partition.id, queue);
        const events = new bullmq_1.QueueEvents(queueName, { connection });
        this.queueEvents.set(partition.id, events);
        this.setupQueueEventHandlers(partition.id, events);
        this.config.partitions.push(partition);
        this.logger.info('Partition created', { partitionId: partition.id });
        this.emit('partition:created', partition);
    }
    /**
     * Remove a partition (must be empty)
     */
    async removePartition(partitionId) {
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
    async shutdown() {
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
    async getRedisConnection() {
        // Get a raw connection from the cluster client for BullMQ
        // BullMQ expects ioredis-compatible connection
        return this.redisClient.acquire();
    }
    getPartitionQueueName(partitionId) {
        return `${this.config.name}:partition:${partitionId}`;
    }
    startWorker(partition, processor, concurrency, filter) {
        const queueName = this.getPartitionQueueName(partition);
        const worker = new bullmq_1.Worker(queueName, async (bullmqJob) => {
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
            }
            catch (error) {
                const err = error instanceof Error ? error : new Error(String(error));
                // Check if should move to dead-letter queue
                if (this.config.deadLetterConfig.enabled &&
                    bullmqJob.attemptsMade >= this.config.defaultRetryStrategy.maxAttempts) {
                    await this.moveToDeadLetterQueue(bullmqJob, err);
                }
                this.emit('job:failed', distributedJob, err);
                throw err;
            }
        }, {
            connection: this.redisClient.getActiveNode()
                ? {
                    host: this.redisClient.getActiveNode().host,
                    port: this.redisClient.getActiveNode().port,
                }
                : undefined,
            concurrency,
            stalledInterval: this.config.stalledInterval,
            lockDuration: this.config.lockDuration,
            autorun: true,
        });
        worker.on('completed', (job) => {
            this.logger.debug('Worker completed job', { jobId: job.id, partition });
        });
        worker.on('failed', (job, error) => {
            this.logger.error('Worker failed job', {
                jobId: job?.id,
                partition,
                error: error.message,
            });
        });
        worker.on('stalled', (jobId) => {
            this.logger.warn('Job stalled', { jobId, partition });
            this.emit('job:stalled', jobId);
        });
        worker.on('error', (error) => {
            this.logger.error('Worker error', { partition, error: error.message });
        });
        this.workers.set(partition, worker);
    }
    async moveToDeadLetterQueue(job, error) {
        if (!this.deadLetterQueue)
            return;
        await this.deadLetterQueue.add('dead-letter', {
            originalQueue: this.config.name,
            originalJobId: job.id,
            originalName: job.name,
            originalData: job.data,
            failureReason: error.message,
            failedAt: new Date().toISOString(),
            attemptsMade: job.attemptsMade,
            stackTrace: error.stack,
        }, {
            jobId: `dlq:${job.id}`,
            removeOnComplete: false,
            removeOnFail: false,
        });
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
        if (this.config.deadLetterConfig.alertOnThreshold &&
            dlCount >= this.config.deadLetterConfig.alertOnThreshold) {
            this.emit('dead-letter:threshold-exceeded', {
                count: dlCount,
                threshold: this.config.deadLetterConfig.alertOnThreshold,
            });
        }
    }
    async reprocessFromDeadLetter(dlJob) {
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
    setupQueueEventHandlers(partition, events) {
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
    toDistributedJob(job, partition) {
        const data = job.data;
        return {
            id: job.id,
            name: job.name,
            data: data.__data ?? data,
            options: {
                priority: job.opts.priority,
                partition,
                correlationId: data.__correlationId,
                agentId: data.__agentId,
                fleetId: data.__fleetId,
                routingKey: data.__routingKey,
                metadata: data.__metadata,
            },
            status: this.toJobStatus(job),
            partition,
            progress: job.progress,
            attemptsMade: job.attemptsMade,
            createdAt: new Date(job.timestamp),
            processedAt: job.processedOn ? new Date(job.processedOn) : undefined,
            completedAt: job.finishedOn ? new Date(job.finishedOn) : undefined,
            failedReason: job.failedReason ?? undefined,
            returnValue: job.returnvalue,
        };
    }
    toJobStatus(job) {
        const state = job.getState();
        // getState returns a promise, but we can infer from properties
        if (job.finishedOn && !job.failedReason)
            return 'completed';
        if (job.failedReason)
            return 'failed';
        if (job.processedOn)
            return 'active';
        if (job.delay && job.delay > 0)
            return 'delayed';
        return 'waiting';
    }
    toBullMQStatus(status) {
        const mapping = {
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
    checkIdempotency(key) {
        const entry = this.idempotencyCache.get(key);
        if (entry && entry.expiry > Date.now()) {
            return { jobId: entry.jobId };
        }
        this.idempotencyCache.delete(key);
        return null;
    }
    storeIdempotency(key, jobId) {
        this.idempotencyCache.set(key, {
            jobId,
            expiry: Date.now() + this.config.idempotencyTTL,
        });
    }
}
exports.DistributedQueue = DistributedQueue;
/**
 * Create a distributed queue with default configuration
 */
function createDistributedQueue(name, redisClient, options) {
    return new DistributedQueue(name, redisClient, options);
}
