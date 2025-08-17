import { Queue, Worker, Job, QueueEvents } from 'bullmq';
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import pino from 'pino';
import IORedis from 'ioredis';
import { ProcessingStatus } from './MultimodalDataService.js';

const logger = pino({ name: 'ExtractionJobService' });

export interface ExtractionJob {
  id: string;
  investigationId: string;
  mediaSourceId: string;
  extractionMethods: string[];
  jobOptions: Record<string, any>;
  status: ProcessingStatus;
  progress: number;
  startedAt?: Date;
  completedAt?: Date;
  durationMs?: number;
  entitiesExtracted: number;
  errors: string[];
  processingMetrics: Record<string, any>;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExtractionJobInput {
  investigationId: string;
  mediaSourceId: string;
  extractionMethods: string[];
  options?: Record<string, any>;
}

export interface ExtractionResult {
  entities: ExtractedEntity[];
  metrics: ExtractionMetrics;
  errors: string[];
}

export interface ExtractedEntity {
  entityType: string;
  extractedText?: string;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
    confidence: number;
  };
  temporalRange?: {
    startTime: number;
    endTime: number;
    confidence: number;
  };
  confidence: number;
  extractionMethod: string;
  extractionVersion: string;
  metadata: Record<string, any>;
}

export interface ExtractionMetrics {
  processingTime: number;
  entitiesExtracted: number;
  confidenceDistribution: ConfidenceDistribution[];
  methodPerformance: MethodPerformance[];
}

export interface ConfidenceDistribution {
  level: string;
  count: number;
  percentage: number;
}

export interface MethodPerformance {
  method: string;
  executionTime: number;
  entitiesFound: number;
  averageConfidence: number;
}

export class ExtractionJobService {
  private db: Pool;
  private redis: IORedis;
  private extractionQueue: Queue;
  private extractionWorker: Worker;
  private queueEvents: QueueEvents;

  constructor(db: Pool, redisConfig: any) {
    this.db = db;
    this.redis = new IORedis(redisConfig);
    
    // Initialize BullMQ queue for extraction jobs
    this.extractionQueue = new Queue('multimodal-extraction', {
      connection: this.redis,
      defaultJobOptions: {
        removeOnComplete: 100, // Keep last 100 completed jobs
        removeOnFail: 50,      // Keep last 50 failed jobs
        attempts: 3,           // Retry up to 3 times
        backoff: {
          type: 'exponential',
          delay: 5000
        }
      }
    });

    // Initialize worker for processing extraction jobs
    this.extractionWorker = new Worker(
      'multimodal-extraction',
      this.processExtractionJob.bind(this),
      {
        connection: this.redis,
        concurrency: 5, // Process up to 5 jobs concurrently
        limiter: {
          max: 10,      // Maximum 10 jobs
          duration: 60000 // per minute
        }
      }
    );

    // Initialize queue events for monitoring
    this.queueEvents = new QueueEvents('multimodal-extraction', {
      connection: this.redis
    });

    this.setupEventListeners();
  }

  /**
   * Start a new extraction job
   */
  async startExtractionJob(
    input: ExtractionJobInput,
    userId?: string
  ): Promise<ExtractionJob> {
    const jobId = uuidv4();
    const now = new Date();

    try {
      // Create job record in database
      const query = `
        INSERT INTO extraction_jobs (
          id, investigation_id, media_source_id, extraction_methods, job_options,
          status, progress, entities_extracted, errors, processing_metrics,
          created_by, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
        ) RETURNING *
      `;

      const values = [
        jobId,
        input.investigationId,
        input.mediaSourceId,
        input.extractionMethods,
        JSON.stringify(input.options || {}),
        ProcessingStatus.PENDING,
        0.0,
        0,
        [],
        JSON.stringify({}),
        userId,
        now,
        now
      ];

      const result = await this.db.query(query, values);
      const job = this.mapRowToExtractionJob(result.rows[0]);

      // Add job to BullMQ queue
      await this.extractionQueue.add(
        'extract-entities',
        {
          jobId,
          investigationId: input.investigationId,
          mediaSourceId: input.mediaSourceId,
          extractionMethods: input.extractionMethods,
          options: input.options || {}
        },
        {
          jobId, // Use our UUID as Bull job ID
          priority: this.calculateJobPriority(input.extractionMethods),
          delay: 0,
          attempts: 3
        }
      );

      logger.info(`Started extraction job: ${jobId}, methods: ${input.extractionMethods.join(', ')}`);
      return job;

    } catch (error) {
      logger.error(`Failed to start extraction job:`, error);
      throw error;
    }
  }

  /**
   * Get extraction job by ID
   */
  async getExtractionJob(id: string): Promise<ExtractionJob | null> {
    try {
      const query = 'SELECT * FROM extraction_jobs WHERE id = $1';
      const result = await this.db.query(query, [id]);
      
      return result.rows.length > 0 ? this.mapRowToExtractionJob(result.rows[0]) : null;
    } catch (error) {
      logger.error(`Failed to get extraction job ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get extraction jobs for investigation
   */
  async getExtractionJobs(
    investigationId: string,
    filters: {
      status?: ProcessingStatus;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<ExtractionJob[]> {
    try {
      let query = 'SELECT * FROM extraction_jobs WHERE investigation_id = $1';
      const values: any[] = [investigationId];
      let paramCount = 1;

      if (filters.status) {
        query += ` AND status = $${++paramCount}`;
        values.push(filters.status);
      }

      query += ' ORDER BY created_at DESC';

      if (filters.limit) {
        query += ` LIMIT $${++paramCount}`;
        values.push(filters.limit);
      }

      if (filters.offset) {
        query += ` OFFSET $${++paramCount}`;
        values.push(filters.offset);
      }

      const result = await this.db.query(query, values);
      return result.rows.map(row => this.mapRowToExtractionJob(row));

    } catch (error) {
      logger.error(`Failed to get extraction jobs for investigation ${investigationId}:`, error);
      throw error;
    }
  }

  /**
   * Cancel extraction job
   */
  async cancelExtractionJob(id: string): Promise<ExtractionJob> {
    try {
      // Remove from queue if still pending
      const bullJob = await this.extractionQueue.getJob(id);
      if (bullJob && await bullJob.isWaiting()) {
        await bullJob.remove();
      }

      // Update database status
      const query = `
        UPDATE extraction_jobs 
        SET status = $1, updated_at = NOW()
        WHERE id = $2 AND status IN ($3, $4)
        RETURNING *
      `;

      const result = await this.db.query(query, [
        ProcessingStatus.CANCELLED,
        id,
        ProcessingStatus.PENDING,
        ProcessingStatus.IN_PROGRESS
      ]);

      if (result.rows.length === 0) {
        throw new Error(`Extraction job ${id} not found or cannot be cancelled`);
      }

      logger.info(`Cancelled extraction job: ${id}`);
      return this.mapRowToExtractionJob(result.rows[0]);

    } catch (error) {
      logger.error(`Failed to cancel extraction job ${id}:`, error);
      throw error;
    }
  }

  /**
   * Retry failed extraction job
   */
  async retryExtractionJob(id: string): Promise<ExtractionJob> {
    try {
      const job = await this.getExtractionJob(id);
      if (!job) {
        throw new Error(`Extraction job ${id} not found`);
      }

      if (job.status !== ProcessingStatus.FAILED) {
        throw new Error(`Extraction job ${id} is not in failed state`);
      }

      // Reset job status and clear errors
      const query = `
        UPDATE extraction_jobs 
        SET status = $1, progress = 0, errors = '{}', updated_at = NOW()
        WHERE id = $2
        RETURNING *
      `;

      const result = await this.db.query(query, [ProcessingStatus.PENDING, id]);

      // Re-add to queue
      await this.extractionQueue.add(
        'extract-entities',
        {
          jobId: id,
          investigationId: job.investigationId,
          mediaSourceId: job.mediaSourceId,
          extractionMethods: job.extractionMethods,
          options: job.jobOptions
        },
        {
          jobId: id,
          priority: this.calculateJobPriority(job.extractionMethods)
        }
      );

      logger.info(`Retried extraction job: ${id}`);
      return this.mapRowToExtractionJob(result.rows[0]);

    } catch (error) {
      logger.error(`Failed to retry extraction job ${id}:`, error);
      throw error;
    }
  }

  /**
   * Process extraction job (worker function)
   */
  private async processExtractionJob(job: Job): Promise<void> {
    const { jobId, investigationId, mediaSourceId, extractionMethods, options } = job.data;
    const startTime = Date.now();

    logger.info(`Processing extraction job: ${jobId}, methods: ${extractionMethods.join(', ')}`);

    try {
      // Update job status to IN_PROGRESS
      await this.updateJobStatus(jobId, ProcessingStatus.IN_PROGRESS, 0, new Date());

      // Get media source information
      const mediaSource = await this.getMediaSourceInfo(mediaSourceId);
      if (!mediaSource) {
        throw new Error(`Media source ${mediaSourceId} not found`);
      }

      // Process each extraction method
      const allResults: ExtractedEntity[] = [];
      const allErrors: string[] = [];
      const methodMetrics: MethodPerformance[] = [];

      for (let i = 0; i < extractionMethods.length; i++) {
        const method = extractionMethods[i];
        const methodStartTime = Date.now();

        try {
          // Update progress
          const progress = (i / extractionMethods.length) * 0.8; // Reserve 20% for final processing
          await this.updateJobProgress(jobId, progress);

          // Perform extraction based on method
          const result = await this.performExtraction(method, mediaSource, options);
          allResults.push(...result.entities);

          // Record method performance
          const methodDuration = Date.now() - methodStartTime;
          methodMetrics.push({
            method,
            executionTime: methodDuration,
            entitiesFound: result.entities.length,
            averageConfidence: result.entities.reduce((sum, e) => sum + e.confidence, 0) / result.entities.length || 0
          });

          logger.info(`Completed extraction method ${method}: ${result.entities.length} entities, ${methodDuration}ms`);

        } catch (methodError) {
          const errorMsg = `Failed extraction method ${method}: ${methodError.message}`;
          allErrors.push(errorMsg);
          logger.warn(errorMsg);
        }
      }

      // Save extracted entities to database
      await this.updateJobProgress(jobId, 0.9);
      const savedCount = await this.saveExtractedEntities(investigationId, mediaSourceId, allResults);

      // Calculate final metrics
      const totalDuration = Date.now() - startTime;
      const confidenceDistribution = this.calculateConfidenceDistribution(allResults);
      
      const metrics: ExtractionMetrics = {
        processingTime: totalDuration,
        entitiesExtracted: savedCount,
        confidenceDistribution,
        methodPerformance: methodMetrics
      };

      // Update job as completed
      await this.updateJobStatus(
        jobId,
        ProcessingStatus.COMPLETED,
        1.0,
        new Date(),
        new Date(),
        totalDuration,
        savedCount,
        allErrors,
        metrics
      );

      logger.info(`Completed extraction job: ${jobId}, extracted: ${savedCount} entities, duration: ${totalDuration}ms`);

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMsg = error.message || 'Unknown error';

      await this.updateJobStatus(
        jobId,
        ProcessingStatus.FAILED,
        undefined,
        undefined,
        new Date(),
        duration,
        0,
        [errorMsg]
      );

      logger.error(`Failed extraction job ${jobId}:`, error);
      throw error; // Re-throw for BullMQ retry handling
    }
  }

  /**
   * Perform extraction using specified method
   */
  private async performExtraction(
    method: string,
    mediaSource: any,
    options: any
  ): Promise<{ entities: ExtractedEntity[]; metrics: any }> {
    // This is a simplified implementation
    // In production, you'd integrate with actual ML/AI services
    
    const entities: ExtractedEntity[] = [];
    
    switch (method) {
      case 'ocr':
        if (mediaSource.media_type === 'IMAGE') {
          entities.push({
            entityType: 'text',
            extractedText: 'Sample OCR text',
            confidence: 0.85,
            extractionMethod: 'ocr',
            extractionVersion: '1.0',
            metadata: { ocrEngine: 'tesseract' }
          });
        }
        break;

      case 'object_detection':
        if (mediaSource.media_type === 'IMAGE' || mediaSource.media_type === 'VIDEO') {
          entities.push({
            entityType: 'person',
            boundingBox: { x: 100, y: 100, width: 200, height: 300, confidence: 0.9 },
            confidence: 0.9,
            extractionMethod: 'object_detection',
            extractionVersion: '1.0',
            metadata: { model: 'yolo_v8' }
          });
        }
        break;

      case 'speech_to_text':
        if (mediaSource.media_type === 'AUDIO' || mediaSource.media_type === 'VIDEO') {
          entities.push({
            entityType: 'speech',
            extractedText: 'Sample transcribed speech',
            temporalRange: { startTime: 0, endTime: 5.5, confidence: 0.8 },
            confidence: 0.8,
            extractionMethod: 'speech_to_text',
            extractionVersion: '1.0',
            metadata: { model: 'whisper' }
          });
        }
        break;

      case 'face_detection':
        if (mediaSource.media_type === 'IMAGE' || mediaSource.media_type === 'VIDEO') {
          entities.push({
            entityType: 'face',
            boundingBox: { x: 150, y: 50, width: 100, height: 120, confidence: 0.95 },
            confidence: 0.95,
            extractionMethod: 'face_detection',
            extractionVersion: '1.0',
            metadata: { model: 'mtcnn' }
          });
        }
        break;

      default:
        throw new Error(`Unknown extraction method: ${method}`);
    }

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

    return {
      entities,
      metrics: {
        method,
        processingTime: 1500,
        accuracy: 0.87
      }
    };
  }

  /**
   * Save extracted entities to database
   */
  private async saveExtractedEntities(
    investigationId: string,
    mediaSourceId: string,
    entities: ExtractedEntity[]
  ): Promise<number> {
    let savedCount = 0;

    for (const entity of entities) {
      try {
        const id = uuidv4();
        const query = `
          INSERT INTO multimodal_entities (
            id, investigation_id, media_source_id, entity_type, extracted_text,
            bbox_x, bbox_y, bbox_width, bbox_height, bbox_confidence,
            temporal_start, temporal_end, temporal_confidence,
            confidence, extraction_method, extraction_version,
            human_verified, metadata, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20
          )
        `;

        const values = [
          id,
          investigationId,
          mediaSourceId,
          entity.entityType,
          entity.extractedText,
          entity.boundingBox?.x,
          entity.boundingBox?.y,
          entity.boundingBox?.width,
          entity.boundingBox?.height,
          entity.boundingBox?.confidence,
          entity.temporalRange?.startTime,
          entity.temporalRange?.endTime,
          entity.temporalRange?.confidence,
          entity.confidence,
          entity.extractionMethod,
          entity.extractionVersion,
          false,
          JSON.stringify(entity.metadata),
          new Date(),
          new Date()
        ];

        await this.db.query(query, values);
        savedCount++;

      } catch (error) {
        logger.warn(`Failed to save entity: ${error.message}`);
      }
    }

    return savedCount;
  }

  /**
   * Calculate confidence distribution
   */
  private calculateConfidenceDistribution(entities: ExtractedEntity[]): ConfidenceDistribution[] {
    const total = entities.length;
    if (total === 0) return [];

    const counts = {
      'LOW': entities.filter(e => e.confidence < 0.5).length,
      'MEDIUM': entities.filter(e => e.confidence >= 0.5 && e.confidence < 0.7).length,
      'HIGH': entities.filter(e => e.confidence >= 0.7 && e.confidence < 0.9).length,
      'VERY_HIGH': entities.filter(e => e.confidence >= 0.9).length
    };

    return Object.entries(counts).map(([level, count]) => ({
      level,
      count,
      percentage: (count / total) * 100
    }));
  }

  /**
   * Calculate job priority based on extraction methods
   */
  private calculateJobPriority(methods: string[]): number {
    // Higher priority for simpler, faster methods
    const priorities = {
      'ocr': 3,
      'face_detection': 2,
      'object_detection': 1,
      'speech_to_text': 1,
      'video_analysis': 0
    };

    const avgPriority = methods.reduce((sum, method) => {
      return sum + (priorities[method] || 1);
    }, 0) / methods.length;

    return Math.round(avgPriority);
  }

  /**
   * Setup event listeners for queue monitoring
   */
  private setupEventListeners(): void {
    this.queueEvents.on('completed', async ({ jobId }) => {
      logger.info(`Extraction job completed: ${jobId}`);
    });

    this.queueEvents.on('failed', async ({ jobId, failedReason }) => {
      logger.error(`Extraction job failed: ${jobId}, reason: ${failedReason}`);
    });

    this.queueEvents.on('progress', async ({ jobId, data }) => {
      logger.debug(`Extraction job progress: ${jobId}, progress: ${data}%`);
    });

    this.extractionWorker.on('completed', (job) => {
      logger.info(`Worker completed job: ${job.id}`);
    });

    this.extractionWorker.on('failed', (job, err) => {
      logger.error(`Worker failed job: ${job?.id}, error: ${err.message}`);
    });
  }

  /**
   * Get media source information
   */
  private async getMediaSourceInfo(mediaSourceId: string): Promise<any> {
    const query = 'SELECT * FROM media_sources WHERE id = $1';
    const result = await this.db.query(query, [mediaSourceId]);
    return result.rows[0] || null;
  }

  /**
   * Update job status in database
   */
  private async updateJobStatus(
    jobId: string,
    status: ProcessingStatus,
    progress?: number,
    startedAt?: Date,
    completedAt?: Date,
    durationMs?: number,
    entitiesExtracted?: number,
    errors?: string[],
    metrics?: any
  ): Promise<void> {
    const updates: string[] = ['status = $2', 'updated_at = NOW()'];
    const values: any[] = [jobId, status];
    let paramCount = 2;

    if (progress !== undefined) {
      updates.push(`progress = $${++paramCount}`);
      values.push(progress);
    }

    if (startedAt) {
      updates.push(`started_at = $${++paramCount}`);
      values.push(startedAt);
    }

    if (completedAt) {
      updates.push(`completed_at = $${++paramCount}`);
      values.push(completedAt);
    }

    if (durationMs !== undefined) {
      updates.push(`duration_ms = $${++paramCount}`);
      values.push(durationMs);
    }

    if (entitiesExtracted !== undefined) {
      updates.push(`entities_extracted = $${++paramCount}`);
      values.push(entitiesExtracted);
    }

    if (errors) {
      updates.push(`errors = $${++paramCount}`);
      values.push(errors);
    }

    if (metrics) {
      updates.push(`processing_metrics = $${++paramCount}`);
      values.push(JSON.stringify(metrics));
    }

    const query = `UPDATE extraction_jobs SET ${updates.join(', ')} WHERE id = $1`;
    await this.db.query(query, values);
  }

  /**
   * Update job progress
   */
  private async updateJobProgress(jobId: string, progress: number): Promise<void> {
    const query = 'UPDATE extraction_jobs SET progress = $1, updated_at = NOW() WHERE id = $2';
    await this.db.query(query, [progress, jobId]);
  }

  /**
   * Map database row to ExtractionJob object
   */
  private mapRowToExtractionJob(row: any): ExtractionJob {
    return {
      id: row.id,
      investigationId: row.investigation_id,
      mediaSourceId: row.media_source_id,
      extractionMethods: row.extraction_methods,
      jobOptions: row.job_options || {},
      status: row.status as ProcessingStatus,
      progress: row.progress,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      durationMs: row.duration_ms,
      entitiesExtracted: row.entities_extracted,
      errors: row.errors || [],
      processingMetrics: row.processing_metrics || {},
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  /**
   * Cleanup resources
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down ExtractionJobService...');
    
    await this.extractionWorker.close();
    await this.extractionQueue.close();
    await this.queueEvents.close();
    await this.redis.disconnect();
    
    logger.info('ExtractionJobService shutdown complete');
  }
}

export default ExtractionJobService;