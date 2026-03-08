"use strict";
/**
 * Batch Processor
 *
 * Handles batch entity resolution jobs using BullMQ.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.batchProcessor = exports.BatchProcessor = void 0;
const bullmq_1 = require("bullmq");
const uuid_1 = require("uuid");
const pino_1 = __importDefault(require("pino"));
const prom_client_1 = require("prom-client");
const ResolutionService_js_1 = require("../core/ResolutionService.js");
const connection_js_1 = require("../db/connection.js");
const EventBus_js_1 = require("../events/EventBus.js");
const logger = (0, pino_1.default)({ name: 'BatchProcessor' });
const DEFAULT_CONFIG = {
    redisHost: 'localhost',
    redisPort: 6379,
    concurrency: 5,
    queueName: 'er-batch-jobs',
    progressUpdateInterval: 25,
};
const metricsRegistry = new prom_client_1.Registry();
const jobDurationHistogram = new prom_client_1.Histogram({
    name: 'er_batch_job_duration_seconds',
    help: 'Time spent processing a batch job',
    buckets: [0.1, 1, 5, 15, 30, 60, 120, 300, 600],
    registers: [metricsRegistry],
});
const processedRecordsCounter = new prom_client_1.Counter({
    name: 'er_batch_records_processed_total',
    help: 'Total records processed by the batch processor',
    labelNames: ['decision'],
    registers: [metricsRegistry],
});
const recordErrorCounter = new prom_client_1.Counter({
    name: 'er_batch_record_errors_total',
    help: 'Total records that failed to process',
    registers: [metricsRegistry],
});
const activeJobsGauge = new prom_client_1.Gauge({
    name: 'er_batch_active_jobs',
    help: 'Number of batch jobs currently in progress',
    registers: [metricsRegistry],
});
class BatchProcessor {
    config;
    queue;
    worker = null;
    resolutionService;
    jobStore = new Map();
    constructor(config) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.resolutionService = new ResolutionService_js_1.ResolutionService();
        const connection = {
            host: this.config.redisHost,
            port: this.config.redisPort,
            password: this.config.redisPassword,
        };
        this.queue = new bullmq_1.Queue(this.config.queueName, { connection });
        logger.info({ queueName: this.config.queueName }, 'BatchProcessor initialized');
    }
    /**
     * Start the worker to process jobs
     */
    async start() {
        if (this.worker)
            return;
        const connection = {
            host: this.config.redisHost,
            port: this.config.redisPort,
            password: this.config.redisPassword,
        };
        this.worker = new bullmq_1.Worker(this.config.queueName, async (job) => {
            return this.processJob(job);
        }, {
            connection,
            concurrency: this.config.concurrency,
        });
        this.worker.on('completed', (job) => {
            logger.info({ jobId: job.id }, 'Batch job completed');
        });
        this.worker.on('failed', (job, error) => {
            logger.error({ jobId: job?.id, error }, 'Batch job failed');
        });
        logger.info('BatchProcessor worker started');
    }
    /**
     * Stop the worker
     */
    async stop() {
        if (this.worker) {
            await this.worker.close();
            this.worker = null;
        }
        await this.queue.close();
        logger.info('BatchProcessor stopped');
    }
    /**
     * Submit a new batch job
     */
    async submitBatch(input) {
        const jobId = (0, uuid_1.v4)();
        const now = new Date().toISOString();
        const job = {
            jobId,
            tenantId: input.tenantId,
            entityType: input.entityType,
            datasetRef: input.datasetRef,
            status: 'PENDING',
            totalRecords: input.records.length,
            processedRecords: 0,
            mergedRecords: 0,
            newClusters: 0,
            reviewRequired: 0,
            errors: 0,
            createdAt: now,
            createdBy: input.createdBy,
            matcherVersion: '1.0.0',
            thresholds: {
                entityType: input.entityType,
                autoMergeThreshold: input.thresholds?.autoMergeThreshold ?? 0.9,
                candidateThreshold: input.thresholds?.candidateThreshold ?? 0.6,
                autoNoMatchThreshold: input.thresholds?.autoNoMatchThreshold ?? 0.3,
                featureWeights: input.thresholds?.featureWeights ?? {},
                deterministicFeatures: input.thresholds?.deterministicFeatures ?? [],
                requiredFeatures: input.thresholds?.requiredFeatures ?? [],
                version: '1.0.0',
                effectiveFrom: now,
            },
        };
        // Store job
        this.jobStore.set(jobId, job);
        await this.persistJob(job);
        // Queue the job
        await this.queue.add('batch-resolution', {
            jobId,
            records: input.records,
        });
        logger.info({ jobId, tenantId: input.tenantId, recordCount: input.records.length }, 'Batch job submitted');
        return job;
    }
    /**
     * Get job status
     */
    async getJobStatus(jobId) {
        // Check in-memory first
        let job = this.jobStore.get(jobId);
        if (!job) {
            // Try to load from database
            job = await this.loadJob(jobId);
            if (job) {
                this.jobStore.set(jobId, job);
            }
        }
        return job ?? null;
    }
    /**
     * Get results for a completed job
     */
    async getResults(jobId, limit = 100, offset = 0) {
        const db = (0, connection_js_1.getDatabase)();
        const results = await db.query(`SELECT * FROM er_batch_results
       WHERE job_id = $1
       ORDER BY timestamp
       LIMIT $2 OFFSET $3`, [jobId, limit, offset]);
        return results.map((row) => ({
            jobId: row.job_id,
            recordId: row.record_id,
            nodeId: row.node_id,
            clusterId: row.cluster_id,
            decision: row.decision,
            score: row.score,
            matchedWithNodeId: row.matched_with_node_id,
            reviewId: row.review_id,
            processingTimeMs: row.processing_time_ms,
            timestamp: row.timestamp,
        }));
    }
    /**
     * Cancel a running job
     */
    async cancelJob(jobId) {
        const job = this.jobStore.get(jobId);
        if (job && (job.status === 'PENDING' || job.status === 'RUNNING')) {
            job.status = 'CANCELLED';
            await this.persistJob(job);
            logger.info({ jobId }, 'Batch job cancelled');
        }
    }
    /**
     * Pause a running job
     */
    async pauseJob(jobId) {
        const job = this.jobStore.get(jobId);
        if (job && job.status === 'RUNNING') {
            job.status = 'PAUSED';
            await this.persistJob(job);
            logger.info({ jobId }, 'Batch job paused');
        }
    }
    /**
     * Resume a paused job
     */
    async resumeJob(jobId) {
        const job = this.jobStore.get(jobId);
        if (job && job.status === 'PAUSED') {
            job.status = 'RUNNING';
            await this.persistJob(job);
            logger.info({ jobId }, 'Batch job resumed');
        }
    }
    async processJob(bullJob) {
        const { jobId, records } = bullJob.data;
        let job = this.jobStore.get(jobId);
        if (!job) {
            job = await this.loadJob(jobId);
            if (job) {
                this.jobStore.set(jobId, job);
            }
        }
        if (!job) {
            throw new Error(`Job ${jobId} not found`);
        }
        const progressInterval = Math.max(this.config.progressUpdateInterval ?? 25, 1);
        const endTimer = jobDurationHistogram.startTimer();
        activeJobsGauge.inc();
        // Update status to running
        job.status = 'RUNNING';
        job.startedAt = new Date().toISOString();
        await this.persistJob(job);
        try {
            // Emit start event
            const eventBus = (0, EventBus_js_1.getEventBus)();
            await eventBus.publish({
                eventId: (0, uuid_1.v4)(),
                eventType: 'BATCH_STARTED',
                tenantId: job.tenantId,
                entityType: job.entityType,
                payload: { jobId, totalRecords: records.length },
                timestamp: new Date().toISOString(),
                source: 'batch-processor',
            });
            // Process records
            for (const record of records) {
                // Check if job was cancelled or paused
                const currentJob = this.jobStore.get(jobId);
                if (currentJob?.status === 'CANCELLED') {
                    break;
                }
                if (currentJob?.status === 'PAUSED') {
                    // Wait for resume (simplified - in production use proper signaling)
                    await new Promise((resolve) => setTimeout(resolve, 1000));
                    continue;
                }
                try {
                    const result = await this.processRecord(job, record);
                    // Update job progress in a single transaction with the result write
                    await (0, connection_js_1.getDatabase)().transaction(async (client) => {
                        await this.persistResult(result, client);
                        job.processedRecords++;
                        if (result.clusterId && result.decision === 'AUTO_MERGE') {
                            job.mergedRecords++;
                        }
                        if (result.decision === 'CANDIDATE') {
                            job.reviewRequired++;
                        }
                        if (!result.clusterId && result.decision !== 'AUTO_NO_MATCH') {
                            job.newClusters++;
                        }
                        await this.persistJob(job, client);
                    });
                    processedRecordsCounter.inc({ decision: result.decision });
                    // Update progress periodically
                    if (job.totalRecords > 0 &&
                        (job.processedRecords % progressInterval === 0 || job.processedRecords === job.totalRecords)) {
                        await bullJob.updateProgress(Math.round((job.processedRecords / job.totalRecords) * 100));
                    }
                }
                catch (error) {
                    job.errors++;
                    job.errorDetails = job.errorDetails ?? [];
                    job.errorDetails.push({
                        recordId: record.recordId,
                        error: error instanceof Error ? error.message : String(error),
                        timestamp: new Date().toISOString(),
                    });
                    recordErrorCounter.inc();
                }
            }
            if (job.status === 'CANCELLED') {
                job.completedAt = new Date().toISOString();
                await this.persistJob(job);
                logger.info({ jobId, processedRecords: job.processedRecords }, 'Batch job cancelled before completion');
                return;
            }
            // Mark as completed
            job.status = 'COMPLETED';
            job.completedAt = new Date().toISOString();
            await this.persistJob(job);
            // Emit completion event
            await eventBus.publish({
                eventId: (0, uuid_1.v4)(),
                eventType: 'BATCH_COMPLETED',
                tenantId: job.tenantId,
                entityType: job.entityType,
                payload: {
                    jobId,
                    processedRecords: job.processedRecords,
                    mergedRecords: job.mergedRecords,
                    newClusters: job.newClusters,
                    reviewRequired: job.reviewRequired,
                    errors: job.errors,
                },
                timestamp: new Date().toISOString(),
                source: 'batch-processor',
            });
            logger.info({
                jobId,
                processedRecords: job.processedRecords,
                mergedRecords: job.mergedRecords,
                errors: job.errors,
            }, 'Batch job completed');
        }
        catch (error) {
            job.status = 'FAILED';
            job.completedAt = new Date().toISOString();
            await this.persistJob(job);
            // Emit failure event
            const eventBus = (0, EventBus_js_1.getEventBus)();
            await eventBus.publish({
                eventId: (0, uuid_1.v4)(),
                eventType: 'BATCH_FAILED',
                tenantId: job.tenantId,
                entityType: job.entityType,
                payload: {
                    jobId,
                    error: error instanceof Error ? error.message : String(error),
                },
                timestamp: new Date().toISOString(),
                source: 'batch-processor',
            });
            throw error;
        }
        finally {
            activeJobsGauge.dec();
            endTimer();
            this.jobStore.delete(jobId);
        }
    }
    async processRecord(job, record) {
        const startTime = Date.now();
        const response = await this.resolutionService.resolveNow({
            tenantId: job.tenantId,
            entityType: job.entityType,
            attributes: record.attributes,
            recordRef: {
                sourceId: job.datasetRef,
                sourceSystem: 'batch',
                recordId: record.recordId,
                recordType: job.entityType,
                ingestedAt: new Date().toISOString(),
                confidence: 0.9,
            },
        });
        const topCandidate = response.candidates[0];
        return {
            jobId: job.jobId,
            recordId: record.recordId,
            nodeId: response.matchedNodeId ?? (0, uuid_1.v4)(),
            clusterId: response.clusterId,
            decision: topCandidate?.decision ?? 'AUTO_NO_MATCH',
            score: topCandidate?.score ?? null,
            matchedWithNodeId: topCandidate?.nodeId ?? null,
            reviewId: null, // Set by resolution service if review required
            processingTimeMs: Date.now() - startTime,
            timestamp: new Date().toISOString(),
        };
    }
    async persistJob(job, client) {
        const db = (0, connection_js_1.getDatabase)();
        const executor = client ? client.query.bind(client) : db.execute.bind(db);
        await executor(`INSERT INTO er_batch_jobs (
        job_id, tenant_id, entity_type, dataset_ref, status,
        total_records, processed_records, merged_records, new_clusters,
        review_required, errors, error_details, started_at, completed_at,
        created_at, created_by, matcher_version, thresholds
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      ON CONFLICT (job_id) DO UPDATE SET
        status = $5,
        processed_records = $7,
        merged_records = $8,
        new_clusters = $9,
        review_required = $10,
        errors = $11,
        error_details = $12,
        started_at = $13,
        completed_at = $14`, [
            job.jobId,
            job.tenantId,
            job.entityType,
            job.datasetRef,
            job.status,
            job.totalRecords,
            job.processedRecords,
            job.mergedRecords,
            job.newClusters,
            job.reviewRequired,
            job.errors,
            JSON.stringify(job.errorDetails ?? []),
            job.startedAt ?? null,
            job.completedAt ?? null,
            job.createdAt,
            job.createdBy,
            job.matcherVersion,
            JSON.stringify(job.thresholds),
        ]);
    }
    async persistResult(result, client) {
        const db = (0, connection_js_1.getDatabase)();
        const executor = client ? client.query.bind(client) : db.execute.bind(db);
        await executor(`INSERT INTO er_batch_results (
        job_id, record_id, node_id, cluster_id, decision, score,
        matched_with_node_id, review_id, processing_time_ms, timestamp
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`, [
            result.jobId,
            result.recordId,
            result.nodeId,
            result.clusterId,
            result.decision,
            result.score,
            result.matchedWithNodeId,
            result.reviewId,
            result.processingTimeMs,
            result.timestamp,
        ]);
    }
    async loadJob(jobId) {
        const db = (0, connection_js_1.getDatabase)();
        const row = await db.queryOne(`SELECT * FROM er_batch_jobs WHERE job_id = $1`, [jobId]);
        if (!row)
            return null;
        return {
            jobId: row.job_id,
            tenantId: row.tenant_id,
            entityType: row.entity_type,
            datasetRef: row.dataset_ref,
            status: row.status,
            totalRecords: row.total_records,
            processedRecords: row.processed_records,
            mergedRecords: row.merged_records,
            newClusters: row.new_clusters,
            reviewRequired: row.review_required,
            errors: row.errors,
            errorDetails: row.error_details,
            startedAt: row.started_at ?? undefined,
            completedAt: row.completed_at ?? undefined,
            createdAt: row.created_at,
            createdBy: row.created_by,
            matcherVersion: row.matcher_version,
            thresholds: row.thresholds,
        };
    }
}
exports.BatchProcessor = BatchProcessor;
exports.batchProcessor = new BatchProcessor();
