/**
 * Batch Processor
 *
 * Handles batch entity resolution jobs using BullMQ.
 */

import { Queue, Worker, Job } from 'bullmq';
import { v4 as uuidv4 } from 'uuid';
import pino from 'pino';
import type {
  BatchJob,
  BatchJobStatus,
  BatchResult,
  EntityType,
  ResolutionThresholds,
} from '../types/index.js';
import { ResolutionService } from '../core/ResolutionService.js';
import { getDatabase } from '../db/connection.js';
import { getEventBus } from '../events/EventBus.js';

const logger = pino({ name: 'BatchProcessor' });

export interface BatchProcessorConfig {
  redisHost: string;
  redisPort: number;
  redisPassword?: string;
  concurrency: number;
  queueName: string;
}

export interface SubmitBatchInput {
  tenantId: string;
  entityType: EntityType;
  datasetRef: string;
  records: Array<{
    recordId: string;
    attributes: Record<string, unknown>;
  }>;
  thresholds?: Partial<ResolutionThresholds>;
  createdBy: string;
}

const DEFAULT_CONFIG: BatchProcessorConfig = {
  redisHost: 'localhost',
  redisPort: 6379,
  concurrency: 5,
  queueName: 'er-batch-jobs',
};

export class BatchProcessor {
  private config: BatchProcessorConfig;
  private queue: Queue;
  private worker: Worker | null = null;
  private resolutionService: ResolutionService;
  private jobStore: Map<string, BatchJob> = new Map();

  constructor(config?: Partial<BatchProcessorConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.resolutionService = new ResolutionService();

    const connection = {
      host: this.config.redisHost,
      port: this.config.redisPort,
      password: this.config.redisPassword,
    };

    this.queue = new Queue(this.config.queueName, { connection });

    logger.info({ queueName: this.config.queueName }, 'BatchProcessor initialized');
  }

  /**
   * Start the worker to process jobs
   */
  async start(): Promise<void> {
    if (this.worker) return;

    const connection = {
      host: this.config.redisHost,
      port: this.config.redisPort,
      password: this.config.redisPassword,
    };

    this.worker = new Worker(
      this.config.queueName,
      async (job: Job) => {
        return this.processJob(job);
      },
      {
        connection,
        concurrency: this.config.concurrency,
      }
    );

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
  async stop(): Promise<void> {
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
  async submitBatch(input: SubmitBatchInput): Promise<BatchJob> {
    const jobId = uuidv4();
    const now = new Date().toISOString();

    const job: BatchJob = {
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

    logger.info(
      { jobId, tenantId: input.tenantId, recordCount: input.records.length },
      'Batch job submitted'
    );

    return job;
  }

  /**
   * Get job status
   */
  async getJobStatus(jobId: string): Promise<BatchJob | null> {
    // Check in-memory first
    let job = this.jobStore.get(jobId);

    if (!job) {
      // Try to load from database
      job = await this.loadJob(jobId);
    }

    return job ?? null;
  }

  /**
   * Get results for a completed job
   */
  async getResults(jobId: string, limit = 100, offset = 0): Promise<BatchResult[]> {
    const db = getDatabase();
    const results = await db.query<{
      job_id: string;
      record_id: string;
      node_id: string;
      cluster_id: string | null;
      decision: string;
      score: number | null;
      matched_with_node_id: string | null;
      review_id: string | null;
      processing_time_ms: number;
      timestamp: string;
    }>(
      `SELECT * FROM er_batch_results
       WHERE job_id = $1
       ORDER BY timestamp
       LIMIT $2 OFFSET $3`,
      [jobId, limit, offset]
    );

    return results.map((row) => ({
      jobId: row.job_id,
      recordId: row.record_id,
      nodeId: row.node_id,
      clusterId: row.cluster_id,
      decision: row.decision as BatchResult['decision'],
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
  async cancelJob(jobId: string): Promise<void> {
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
  async pauseJob(jobId: string): Promise<void> {
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
  async resumeJob(jobId: string): Promise<void> {
    const job = this.jobStore.get(jobId);
    if (job && job.status === 'PAUSED') {
      job.status = 'RUNNING';
      await this.persistJob(job);
      logger.info({ jobId }, 'Batch job resumed');
    }
  }

  private async processJob(bullJob: Job): Promise<void> {
    const { jobId, records } = bullJob.data as {
      jobId: string;
      records: Array<{ recordId: string; attributes: Record<string, unknown> }>;
    };

    const job = this.jobStore.get(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    // Update status to running
    job.status = 'RUNNING';
    job.startedAt = new Date().toISOString();
    await this.persistJob(job);

    try {
      // Emit start event
      const eventBus = getEventBus();
      await eventBus.publish({
        eventId: uuidv4(),
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
          await this.persistResult(result);

          // Update job progress
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

          // Update progress periodically
          if (job.processedRecords % 100 === 0) {
            await this.persistJob(job);
            await bullJob.updateProgress(
              Math.round((job.processedRecords / job.totalRecords) * 100)
            );
          }
        } catch (error) {
          job.errors++;
          job.errorDetails = job.errorDetails ?? [];
          job.errorDetails.push({
            recordId: record.recordId,
            error: error instanceof Error ? error.message : String(error),
            timestamp: new Date().toISOString(),
          });
        }
      }

      // Mark as completed
      job.status = 'COMPLETED';
      job.completedAt = new Date().toISOString();
      await this.persistJob(job);

      // Emit completion event
      await eventBus.publish({
        eventId: uuidv4(),
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

      logger.info(
        {
          jobId,
          processedRecords: job.processedRecords,
          mergedRecords: job.mergedRecords,
          errors: job.errors,
        },
        'Batch job completed'
      );
    } catch (error) {
      job.status = 'FAILED';
      job.completedAt = new Date().toISOString();
      await this.persistJob(job);

      // Emit failure event
      const eventBus = getEventBus();
      await eventBus.publish({
        eventId: uuidv4(),
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
  }

  private async processRecord(
    job: BatchJob,
    record: { recordId: string; attributes: Record<string, unknown> }
  ): Promise<BatchResult> {
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
      nodeId: response.matchedNodeId ?? uuidv4(),
      clusterId: response.clusterId,
      decision: topCandidate?.decision ?? 'AUTO_NO_MATCH',
      score: topCandidate?.score ?? null,
      matchedWithNodeId: topCandidate?.nodeId ?? null,
      reviewId: null, // Set by resolution service if review required
      processingTimeMs: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    };
  }

  private async persistJob(job: BatchJob): Promise<void> {
    const db = getDatabase();
    await db.execute(
      `INSERT INTO er_batch_jobs (
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
        completed_at = $14`,
      [
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
      ]
    );
  }

  private async persistResult(result: BatchResult): Promise<void> {
    const db = getDatabase();
    await db.execute(
      `INSERT INTO er_batch_results (
        job_id, record_id, node_id, cluster_id, decision, score,
        matched_with_node_id, review_id, processing_time_ms, timestamp
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
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
      ]
    );
  }

  private async loadJob(jobId: string): Promise<BatchJob | null> {
    const db = getDatabase();
    const row = await db.queryOne<{
      job_id: string;
      tenant_id: string;
      entity_type: EntityType;
      dataset_ref: string;
      status: BatchJobStatus;
      total_records: number;
      processed_records: number;
      merged_records: number;
      new_clusters: number;
      review_required: number;
      errors: number;
      error_details: Array<{ recordId: string; error: string; timestamp: string }>;
      started_at: string | null;
      completed_at: string | null;
      created_at: string;
      created_by: string;
      matcher_version: string;
      thresholds: ResolutionThresholds;
    }>(
      `SELECT * FROM er_batch_jobs WHERE job_id = $1`,
      [jobId]
    );

    if (!row) return null;

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

export const batchProcessor = new BatchProcessor();
