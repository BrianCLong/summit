"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueueManager = void 0;
const crypto_1 = require("crypto");
const bullmq_1 = require("bullmq");
const ioredis_1 = __importDefault(require("ioredis"));
const queue_config_js_1 = require("../config/queue.config.js");
const logger_js_1 = require("../utils/logger.js");
const MetricsCollector_js_1 = require("../monitoring/MetricsCollector.js");
const RateLimiter_js_1 = require("../utils/RateLimiter.js");
const LeaseManager_js_1 = require("./LeaseManager.js");
const errors_js_1 = require("./errors.js");
class QueueManager {
    queues = new Map();
    workers = new Map();
    queueEvents = new Map();
    processors = new Map();
    connection;
    logger;
    metrics;
    rateLimiters = new Map();
    deadLetterQueue;
    leaseManager;
    leaseEnabled;
    leaseDurationMs;
    leaseRenewIntervalMs;
    constructor() {
        this.connection = new ioredis_1.default(queue_config_js_1.defaultQueueConfig.redis);
        this.logger = new logger_js_1.Logger('QueueManager');
        this.metrics = new MetricsCollector_js_1.MetricsCollector();
        this.leaseEnabled = process.env.LEASED_JOBS === '1';
        this.leaseDurationMs = queue_config_js_1.workerOptions.lockDuration ?? 30000;
        this.leaseRenewIntervalMs = Math.max(1000, Math.floor(this.leaseDurationMs * 0.6));
        // Initialize dead letter queue
        this.deadLetterQueue = new bullmq_1.Queue('dead-letter-queue', {
            connection: this.connection,
        });
        if (this.leaseEnabled) {
            this.leaseManager = new LeaseManager_js_1.LeaseManager(this.connection, new logger_js_1.Logger('LeaseManager'));
        }
    }
    /**
     * Register a new queue with optional rate limiting
     */
    registerQueue(name, options = {}) {
        if (this.queues.has(name)) {
            return this.queues.get(name);
        }
        const queue = new bullmq_1.Queue(name, {
            connection: this.connection,
            defaultJobOptions: {
                ...queue_config_js_1.defaultQueueConfig.defaultJobOptions,
                ...options.defaultJobOptions,
            },
        });
        this.queues.set(name, queue);
        // Set up rate limiter if configured
        if (options.rateLimit || queue_config_js_1.defaultQueueConfig.rateLimits[name]) {
            const limit = options.rateLimit || queue_config_js_1.defaultQueueConfig.rateLimits[name];
            if (limit) {
                this.rateLimiters.set(name, new RateLimiter_js_1.RateLimiter(limit.max, limit.duration));
            }
        }
        // Set up queue events for monitoring
        const queueEvents = new bullmq_1.QueueEvents(name, {
            connection: this.connection,
        });
        this.queueEvents.set(name, queueEvents);
        this.setupQueueEventHandlers(name, queueEvents);
        this.logger.info(`Queue registered: ${name}`);
        return queue;
    }
    /**
     * Register a job processor for a queue
     */
    registerProcessor(queueName, processor) {
        this.processors.set(queueName, processor);
        this.logger.info(`Processor registered for queue: ${queueName}`);
    }
    /**
     * Start workers for all registered queues
     */
    async startWorkers() {
        for (const [queueName, processor] of this.processors.entries()) {
            await this.startWorker(queueName, processor);
        }
    }
    /**
     * Start a worker for a specific queue
     */
    async startWorker(queueName, processor) {
        if (this.workers.has(queueName)) {
            return this.workers.get(queueName);
        }
        const worker = new bullmq_1.Worker(queueName, this.buildProcessor(queueName, processor), {
            ...queue_config_js_1.workerOptions,
            connection: this.connection,
        });
        this.workers.set(queueName, worker);
        this.setupWorkerEventHandlers(queueName, worker);
        this.logger.info(`Worker started for queue: ${queueName}`);
        return worker;
    }
    /**
     * Add a job to a queue with priority and scheduling support
     */
    async addJob(queueName, jobName, data, options = {}) {
        const queue = this.queues.get(queueName);
        if (!queue) {
            throw new Error(`Queue ${queueName} not found`);
        }
        // Convert priority enum to numeric value
        const priority = options.priority
            ? this.convertPriorityToNumber(options.priority)
            : undefined;
        // Handle scheduled jobs
        const delay = options.scheduledAt
            ? Math.max(0, options.scheduledAt.getTime() - Date.now())
            : undefined;
        const jobOptions = {
            ...options,
            priority,
            delay,
            jobId: options.jobId || `${queueName}:${jobName}:${Date.now()}`,
        };
        const job = await queue.add(jobName, data, jobOptions);
        this.logger.info(`Job ${job.id} added to queue ${queueName}`);
        this.metrics.recordJobAdded(queueName);
        return job;
    }
    /**
     * Add a batch of jobs to a queue
     */
    async addBulk(queueName, jobs) {
        const queue = this.queues.get(queueName);
        if (!queue) {
            throw new Error(`Queue ${queueName} not found`);
        }
        const bulkJobs = jobs.map((job) => ({
            name: job.name,
            data: job.data,
            opts: {
                ...job.options,
                priority: job.options?.priority
                    ? this.convertPriorityToNumber(job.options.priority)
                    : undefined,
            },
        }));
        const addedJobs = await queue.addBulk(bulkJobs);
        this.logger.info(`${addedJobs.length} jobs added to queue ${queueName}`);
        this.metrics.recordJobAdded(queueName, addedJobs.length);
        return addedJobs;
    }
    /**
     * Execute a workflow with multiple steps
     */
    async executeWorkflow(workflow) {
        this.logger.info(`Starting workflow: ${workflow.name} (${workflow.id})`);
        for (const step of workflow.steps) {
            await this.executeWorkflowStep(step, workflow.id);
        }
    }
    /**
     * Get job by ID
     */
    async getJob(queueName, jobId) {
        const queue = this.queues.get(queueName);
        if (!queue) {
            throw new Error(`Queue ${queueName} not found`);
        }
        return await queue.getJob(jobId);
    }
    /**
     * Retry a failed job
     */
    async retryJob(queueName, jobId) {
        const job = await this.getJob(queueName, jobId);
        if (!job) {
            throw new Error(`Job ${jobId} not found in queue ${queueName}`);
        }
        await job.retry();
        this.logger.info(`Job ${jobId} retried in queue ${queueName}`);
    }
    /**
     * Remove a job from queue
     */
    async removeJob(queueName, jobId) {
        const job = await this.getJob(queueName, jobId);
        if (!job) {
            throw new Error(`Job ${jobId} not found in queue ${queueName}`);
        }
        await job.remove();
        this.logger.info(`Job ${jobId} removed from queue ${queueName}`);
    }
    /**
     * List jobs currently in the dead-letter queue
     */
    async listDeadLetterJobs(query, start = 0, end = 100) {
        const jobs = await this.deadLetterQueue.getJobs(['waiting', 'active'], start, end);
        return jobs
            .map((job) => ({
            jobId: job.id,
            ...job.data,
        }))
            .filter((entry) => {
            if (!query)
                return true;
            const haystack = JSON.stringify(entry).toLowerCase();
            return haystack.includes(query.toLowerCase());
        });
    }
    /**
     * Requeue a job from the dead-letter queue back to its original queue.
     */
    async requeueFromDeadLetter(jobId) {
        const dlqJob = await this.deadLetterQueue.getJob(jobId);
        if (!dlqJob) {
            throw new Error(`Dead-letter job ${jobId} not found`);
        }
        const payload = dlqJob.data;
        const targetQueue = this.queues.get(payload.originalQueue);
        if (!targetQueue) {
            throw new Error(`Original queue ${payload.originalQueue} is not registered, cannot requeue dead-letter job`);
        }
        const requeued = await targetQueue.add(payload.originalName || 'requeued-job', payload.originalData, {
            jobId: `requeue:${payload.originalJobId}`,
        });
        this.metrics.recordJobAdded(payload.originalQueue);
        await dlqJob.remove();
        this.logger.info(`Job ${payload.originalJobId} requeued from DLQ to ${payload.originalQueue}`);
        return requeued;
    }
    /**
     * Pause a queue
     */
    async pauseQueue(queueName) {
        const queue = this.queues.get(queueName);
        if (!queue) {
            throw new Error(`Queue ${queueName} not found`);
        }
        await queue.pause();
        this.logger.info(`Queue ${queueName} paused`);
    }
    /**
     * Resume a paused queue
     */
    async resumeQueue(queueName) {
        const queue = this.queues.get(queueName);
        if (!queue) {
            throw new Error(`Queue ${queueName} not found`);
        }
        await queue.resume();
        this.logger.info(`Queue ${queueName} resumed`);
    }
    /**
     * Get queue metrics
     */
    async getQueueMetrics(queueName) {
        const queue = this.queues.get(queueName);
        if (!queue) {
            throw new Error(`Queue ${queueName} not found`);
        }
        const counts = await queue.getJobCounts();
        const metrics = this.metrics.getQueueMetrics(queueName);
        return {
            ...counts,
            ...metrics,
        };
    }
    /**
     * Get all queues metrics
     */
    async getAllMetrics() {
        const metricsPromises = Array.from(this.queues.keys()).map(async (queueName) => {
            const metrics = await this.getQueueMetrics(queueName);
            return { queueName, ...metrics };
        });
        return await Promise.all(metricsPromises);
    }
    /**
     * Clean up old jobs
     */
    async cleanQueue(queueName, grace = 86400000, // 24 hours
    status = 'completed') {
        const queue = this.queues.get(queueName);
        if (!queue) {
            throw new Error(`Queue ${queueName} not found`);
        }
        await queue.clean(grace, 1000, status);
        this.logger.info(`Queue ${queueName} cleaned (${status} jobs)`);
    }
    /**
     * Obliterate a queue (remove all jobs and data)
     */
    async obliterateQueue(queueName) {
        const queue = this.queues.get(queueName);
        if (!queue) {
            throw new Error(`Queue ${queueName} not found`);
        }
        await queue.obliterate({ force: true });
        this.logger.info(`Queue ${queueName} obliterated`);
    }
    /**
     * Gracefully shutdown all workers and close connections
     */
    async shutdown() {
        this.logger.info('Shutting down queue manager...');
        // Close all workers
        const workerClosePromises = Array.from(this.workers.values()).map((worker) => worker.close());
        await Promise.all(workerClosePromises);
        // Close all queues
        const queueClosePromises = Array.from(this.queues.values()).map((queue) => queue.close());
        await Promise.all(queueClosePromises);
        // Close queue events
        const eventsClosePromises = Array.from(this.queueEvents.values()).map((events) => events.close());
        await Promise.all(eventsClosePromises);
        // Close dead letter queue
        await this.deadLetterQueue.close();
        // Close Redis connection
        await this.connection.quit();
        this.logger.info('Queue manager shutdown complete');
    }
    // Private helper methods
    buildProcessor(queueName, processor) {
        return async (job) => {
            const startTime = Date.now();
            const rateLimiter = this.rateLimiters.get(queueName);
            let lease = null;
            let renewal = null;
            try {
                if (this.leaseEnabled && this.leaseManager) {
                    lease = await this.leaseManager.acquire(job.id ?? job.opts.jobId ?? (0, crypto_1.randomUUID)(), queueName, this.leaseDurationMs);
                    renewal = this.leaseManager.startRenewal(lease, this.leaseRenewIntervalMs);
                }
                if (rateLimiter && !rateLimiter.tryAcquire()) {
                    throw new Error('Rate limit exceeded');
                }
                this.logger.info(`Processing job ${job.id} from queue ${queueName}`);
                this.metrics.recordJobStart(queueName);
                const result = await processor(job);
                if (renewal) {
                    await renewal.stop();
                }
                if (lease) {
                    await this.leaseManager?.release(lease);
                }
                const processingTime = Date.now() - startTime;
                this.metrics.recordJobComplete(queueName, processingTime);
                this.logger.info(`Job ${job.id} completed in ${processingTime}ms`);
                // Handle job chaining
                const chainTo = job.opts.chainTo;
                if (chainTo) {
                    await this.handleJobChaining(job);
                }
                return result;
            }
            catch (error) {
                let caughtError = error;
                if (renewal) {
                    try {
                        await renewal.stop();
                    }
                    catch (leaseError) {
                        caughtError = leaseError;
                    }
                }
                if (lease) {
                    await this.leaseManager?.release(lease);
                }
                const processingTime = Date.now() - startTime;
                this.metrics.recordJobFailed(queueName, processingTime);
                this.logger.error(`Job ${job.id} failed after ${processingTime}ms`, caughtError);
                const attemptsConfigured = job.opts.attempts ?? queue_config_js_1.defaultQueueConfig.defaultJobOptions?.attempts ?? 1;
                const attemptsMade = job.attemptsMade + 1;
                const leaseExpired = caughtError instanceof errors_js_1.LeaseExpiredError;
                const fatalError = (0, errors_js_1.isFatalError)(caughtError);
                const shouldDeadLetter = fatalError || attemptsMade >= attemptsConfigured;
                if (leaseExpired) {
                    this.metrics.recordLeaseExpired(queueName);
                }
                if (!shouldDeadLetter) {
                    this.metrics.recordJobRetry(queueName);
                }
                else {
                    await this.moveToDeadLetterQueue(job, caughtError);
                }
                throw caughtError;
            }
        };
    }
    convertPriorityToNumber(priority) {
        return priority;
    }
    async handleJobChaining(job) {
        const chainTo = job.opts.chainTo;
        if (!chainTo || chainTo.length === 0) {
            return;
        }
        for (const nextJob of chainTo) {
            await this.addJob(nextJob.queueName, nextJob.jobName, nextJob.data || {});
        }
        this.logger.info(`Job ${job.id} chained to ${chainTo.length} jobs`);
    }
    async executeWorkflowStep(step, workflowId) {
        try {
            const job = await this.addJob(step.queueName, step.jobName, step.data, {
                ...step.options,
                metadata: {
                    ...step.options?.metadata,
                    correlationId: workflowId,
                },
            });
            // Wait for job completion
            await job.waitUntilFinished(this.queueEvents.get(step.queueName));
            // Execute success steps
            if (step.onSuccess) {
                for (const successStep of step.onSuccess) {
                    await this.executeWorkflowStep(successStep, workflowId);
                }
            }
        }
        catch (error) {
            this.logger.error(`Workflow step failed: ${step.jobName}`, error);
            // Execute failure steps
            if (step.onFailure) {
                for (const failureStep of step.onFailure) {
                    await this.executeWorkflowStep(failureStep, workflowId);
                }
            }
            else {
                throw error;
            }
        }
    }
    async moveToDeadLetterQueue(job, error) {
        const deadLetterData = {
            originalQueue: job.queueName,
            originalJobId: job.id,
            originalName: job.name,
            originalData: job.data,
            failureReason: error.message || String(error),
            failedAt: new Date(),
            attemptsMade: job.attemptsMade + 1,
            errorStack: error?.stack,
            fatal: (0, errors_js_1.isFatalError)(error),
        };
        await this.deadLetterQueue.add('failed-job', deadLetterData, {
            jobId: `dlq:${job.id}`,
            removeOnComplete: false,
            removeOnFail: false,
        });
        this.metrics.recordDeadLetter(job.queueName);
        this.logger.warn(`Job ${job.id} moved to dead letter queue after ${job.attemptsMade} attempts`);
    }
    setupQueueEventHandlers(queueName, queueEvents) {
        queueEvents.on('completed', ({ jobId }) => {
            this.logger.debug(`Job ${jobId} completed in queue ${queueName}`);
        });
        queueEvents.on('failed', ({ jobId, failedReason }) => {
            this.logger.error(`Job ${jobId} failed in queue ${queueName}: ${failedReason}`);
        });
        queueEvents.on('progress', ({ jobId, data }) => {
            this.logger.debug(`Job ${jobId} progress: ${JSON.stringify(data)}`);
        });
    }
    setupWorkerEventHandlers(queueName, worker) {
        worker.on('completed', (job) => {
            this.logger.info(`Worker completed job ${job.id} in queue ${queueName}`);
        });
        worker.on('failed', (job, error) => {
            this.logger.error(`Worker failed job ${job?.id} in queue ${queueName}`, error);
        });
        worker.on('error', (error) => {
            this.logger.error(`Worker error in queue ${queueName}`, error);
        });
        worker.on('stalled', (jobId) => {
            this.logger.warn(`Job ${jobId} stalled in queue ${queueName}`);
        });
    }
}
exports.QueueManager = QueueManager;
