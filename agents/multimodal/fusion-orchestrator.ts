/**
 * Multimodal Fusion Orchestrator
 * Orchestrates the fusion of OSINT text/image/video into unified embeddings.
 * Coordinates CLIP/ViT, text transformers, and Neo4j graph embeddings.
 */

import { createHash, randomUUID } from 'crypto';
import { EventEmitter } from 'events';
import pino from 'pino';

import type {
  FusedEmbedding,
  FusionMethod,
  FusionPipelineConfig,
  PipelineJob,
  JobStatus,
  SourceInput,
  PipelineError,
  PipelineEvent,
  PipelineEventHandler,
  ModalityVector,
  ModalityType,
  TextEmbedding,
  ImageEmbedding,
  VideoEmbedding,
  VerificationStatus,
  PipelineMetrics,
  PerformanceMetrics,
} from './types.js';
import { CLIPPipeline } from './clip-pipeline.js';
import { TextPipeline } from './text-pipeline.js';
import { VideoPipeline } from './video-pipeline.js';
import { HallucinationGuard } from './hallucination-guard.js';
import { PgVectorStore } from './pgvector-store.js';
import { Neo4jEmbeddings } from './neo4j-embeddings.js';

const logger = pino({ name: 'fusion-orchestrator' });

export interface FusionOrchestratorConfig extends Partial<FusionPipelineConfig> {
  enableGraphEmbeddings: boolean;
  enablePgVectorStorage: boolean;
  enableHallucinationGuard: boolean;
  parallelProcessing: boolean;
  retryAttempts: number;
  retryDelayMs: number;
}

type BaseEmbedding = TextEmbedding | ImageEmbedding | VideoEmbedding;

export class FusionOrchestrator extends EventEmitter {
  private config: FusionOrchestratorConfig;
  private clipPipeline: CLIPPipeline;
  private textPipeline: TextPipeline;
  private videoPipeline: VideoPipeline;
  private hallucinationGuard: HallucinationGuard;
  private pgVectorStore: PgVectorStore | null = null;
  private neo4jEmbeddings: Neo4jEmbeddings | null = null;

  private jobs: Map<string, PipelineJob> = new Map();
  private metrics: PipelineMetrics;
  private performanceMetrics: PerformanceMetrics;

  constructor(config: Partial<FusionOrchestratorConfig> = {}) {
    super();

    this.config = {
      clipModel: 'clip-vit-large-patch14',
      textModel: 'text-embedding-3-small',
      fusionMethod: 'weighted_average',
      targetDimension: 768,
      hallucinationThreshold: 0.7,
      crossModalThreshold: 0.6,
      batchSize: 10,
      maxConcurrency: 4,
      enableGPU: false,
      cacheEnabled: true,
      cacheTTL: 3600000,
      enableGraphEmbeddings: true,
      enablePgVectorStorage: true,
      enableHallucinationGuard: true,
      parallelProcessing: true,
      retryAttempts: 3,
      retryDelayMs: 1000,
      ...config,
    };

    // Initialize pipelines
    this.clipPipeline = new CLIPPipeline({
      model: this.config.clipModel,
    });

    this.textPipeline = new TextPipeline({
      model: this.config.textModel,
    });

    this.videoPipeline = new VideoPipeline({
      clipModel: this.config.clipModel,
    });

    this.hallucinationGuard = new HallucinationGuard({
      crossModalThreshold: this.config.crossModalThreshold,
      autoRejectThreshold: this.config.hallucinationThreshold,
    });

    // Initialize storage if enabled
    if (this.config.enablePgVectorStorage) {
      this.pgVectorStore = new PgVectorStore({
        dimension: this.config.targetDimension,
      });
    }

    if (this.config.enableGraphEmbeddings) {
      this.neo4jEmbeddings = new Neo4jEmbeddings({
        dimensions: 128, // Graph embeddings typically smaller
      });
    }

    // Initialize metrics
    this.metrics = {
      totalJobsProcessed: 0,
      totalEmbeddingsGenerated: 0,
      averageProcessingTime: 0,
      hallucinationRate: 0,
      crossModalAccuracy: 0,
      modalityDistribution: {
        text: 0,
        image: 0,
        video: 0,
        audio: 0,
        document: 0,
      },
      errorRate: 0,
    };

    this.performanceMetrics = {
      embeddingLatencyMs: 0,
      fusionLatencyMs: 0,
      vectorSearchLatencyMs: 0,
      throughputPerSecond: 0,
      memoryUsageMB: 0,
    };

    logger.info('Fusion Orchestrator initialized', {
      fusionMethod: this.config.fusionMethod,
      targetDimension: this.config.targetDimension,
      enableGraphEmbeddings: this.config.enableGraphEmbeddings,
      enablePgVectorStorage: this.config.enablePgVectorStorage,
    });
  }

  /**
   * Initialize all components
   */
  async initialize(): Promise<void> {
    const initPromises: Promise<void>[] = [];

    if (this.pgVectorStore) {
      initPromises.push(this.pgVectorStore.initialize());
    }

    if (this.neo4jEmbeddings) {
      initPromises.push(this.neo4jEmbeddings.initialize());
    }

    await Promise.all(initPromises);
    logger.info('Fusion Orchestrator fully initialized');
  }

  /**
   * Process a fusion job
   */
  async processJob(
    investigationId: string,
    sources: SourceInput[],
    entityId?: string,
  ): Promise<FusedEmbedding> {
    const jobId = randomUUID();
    const startTime = Date.now();

    // Create job
    const job: PipelineJob = {
      id: jobId,
      investigationId,
      status: 'pending',
      sources,
      progress: 0,
      errors: [],
    };

    this.jobs.set(jobId, job);
    this.emitEvent({ type: 'job_started', jobId, timestamp: new Date() });

    try {
      job.status = 'processing';
      job.startedAt = new Date();

      // Step 1: Process each modality
      const modalityEmbeddings = await this.processModalities(job, sources);

      job.progress = 0.5;

      // Step 2: Fuse embeddings
      const fusedEmbedding = await this.fuseEmbeddings(
        modalityEmbeddings,
        investigationId,
        entityId || jobId,
      );

      job.progress = 0.7;

      // Step 3: Validate with hallucination guard
      if (this.config.enableHallucinationGuard) {
        const validation = await this.hallucinationGuard.validate(
          fusedEmbedding,
          modalityEmbeddings,
        );

        fusedEmbedding.hallucinationScore = validation.score;
        fusedEmbedding.verificationStatus = this.mapValidationToStatus(
          validation.suggestedAction,
        );

        if (validation.isHallucination) {
          this.emitEvent({
            type: 'hallucination_detected',
            jobId,
            sourceId: fusedEmbedding.entityId,
            score: validation.score,
          });
        }
      }

      job.progress = 0.8;

      // Step 4: Enhance with graph embeddings
      if (this.config.enableGraphEmbeddings && this.neo4jEmbeddings) {
        try {
          const graphEmbedding = await this.neo4jEmbeddings.embedNode(
            fusedEmbedding.entityId,
            investigationId,
          );

          // Optionally combine with graph embedding
          fusedEmbedding.fusedVector = this.combineWithGraphEmbedding(
            fusedEmbedding.fusedVector,
            graphEmbedding.embedding,
          );
        } catch (error) {
          logger.warn('Graph embedding failed, continuing without', {
            entityId: fusedEmbedding.entityId,
            error: error instanceof Error ? error.message : 'Unknown',
          });
        }
      }

      job.progress = 0.9;

      // Step 5: Store in pgvector
      if (this.config.enablePgVectorStorage && this.pgVectorStore) {
        await this.pgVectorStore.store(fusedEmbedding);
      }

      // Complete job
      job.status = 'completed';
      job.completedAt = new Date();
      job.progress = 1.0;
      job.results = [fusedEmbedding];

      // Update metrics
      this.updateMetrics(job, modalityEmbeddings, Date.now() - startTime);

      this.emitEvent({
        type: 'fusion_completed',
        jobId,
        entityId: fusedEmbedding.entityId,
        fusedEmbeddingId: fusedEmbedding.id,
      });

      this.emitEvent({
        type: 'job_completed',
        jobId,
        totalEmbeddings: 1,
      });

      logger.info('Fusion job completed', {
        jobId,
        entityId: fusedEmbedding.entityId,
        modalityCount: modalityEmbeddings.length,
        processingTimeMs: Date.now() - startTime,
      });

      return fusedEmbedding;
    } catch (error) {
      job.status = 'failed';
      job.errors.push({
        code: 'FUSION_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
        recoverable: false,
      });

      this.emitEvent({
        type: 'job_failed',
        jobId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw error;
    }
  }

  /**
   * Process batch of sources
   */
  async processBatch(
    investigationId: string,
    sourceGroups: Array<{ entityId: string; sources: SourceInput[] }>,
  ): Promise<FusedEmbedding[]> {
    const results: FusedEmbedding[] = [];

    if (this.config.parallelProcessing) {
      // Process in parallel with concurrency limit
      const chunks = this.chunkArray(sourceGroups, this.config.maxConcurrency!);

      for (const chunk of chunks) {
        const chunkResults = await Promise.all(
          chunk.map((group) =>
            this.processJob(investigationId, group.sources, group.entityId)
              .catch((error) => {
                logger.error('Batch item failed', {
                  entityId: group.entityId,
                  error: error instanceof Error ? error.message : 'Unknown',
                });
                return null;
              }),
          ),
        );

        results.push(
          ...chunkResults.filter((r): r is FusedEmbedding => r !== null),
        );
      }
    } else {
      // Sequential processing
      for (const group of sourceGroups) {
        try {
          const result = await this.processJob(
            investigationId,
            group.sources,
            group.entityId,
          );
          results.push(result);
        } catch (error) {
          logger.error('Batch item failed', {
            entityId: group.entityId,
            error: error instanceof Error ? error.message : 'Unknown',
          });
        }
      }
    }

    logger.info('Batch processing completed', {
      total: sourceGroups.length,
      successful: results.length,
    });

    return results;
  }

  /**
   * Process individual modalities
   */
  private async processModalities(
    job: PipelineJob,
    sources: SourceInput[],
  ): Promise<BaseEmbedding[]> {
    const embeddings: BaseEmbedding[] = [];

    for (const source of sources) {
      try {
        let embedding: BaseEmbedding;

        switch (source.type) {
          case 'text':
            embedding = await this.textPipeline.embedText(
              source.uri,
              job.investigationId,
            );
            break;

          case 'image':
            embedding = await this.clipPipeline.embedImage(
              source.uri,
              job.investigationId,
            );
            break;

          case 'video':
            embedding = await this.videoPipeline.embedVideo(
              source.uri,
              job.investigationId,
            );
            break;

          default:
            logger.warn('Unsupported modality', { type: source.type });
            continue;
        }

        embeddings.push(embedding);

        this.emitEvent({
          type: 'modality_processed',
          jobId: job.id,
          modality: source.type,
          sourceId: embedding.id,
        });

        // Update modality distribution
        this.metrics.modalityDistribution[source.type]++;
      } catch (error) {
        const pipelineError: PipelineError = {
          code: 'MODALITY_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          sourceId: source.uri,
          modality: source.type,
          timestamp: new Date(),
          recoverable: true,
        };

        job.errors.push(pipelineError);
        logger.error('Failed to process modality', {
          type: source.type,
          uri: source.uri,
          error: pipelineError.message,
        });
      }
    }

    return embeddings;
  }

  /**
   * Fuse embeddings from multiple modalities
   */
  private async fuseEmbeddings(
    embeddings: BaseEmbedding[],
    investigationId: string,
    entityId: string,
  ): Promise<FusedEmbedding> {
    if (embeddings.length === 0) {
      throw new Error('No embeddings to fuse');
    }

    // Create modality vectors
    const modalityVectors: ModalityVector[] = embeddings.map((emb) => ({
      modality: emb.modality,
      vector: emb.vector,
      weight: emb.metadata.confidence,
      sourceId: emb.id,
      confidence: emb.metadata.confidence,
    }));

    // Fuse based on method
    let fusedVector: number[];

    switch (this.config.fusionMethod) {
      case 'concatenation':
        fusedVector = this.fuseConcatenation(modalityVectors);
        break;

      case 'average':
        fusedVector = this.fuseAverage(modalityVectors);
        break;

      case 'weighted_average':
        fusedVector = this.fuseWeightedAverage(modalityVectors);
        break;

      case 'attention':
        fusedVector = this.fuseAttention(modalityVectors);
        break;

      case 'cross_modal_transformer':
        fusedVector = await this.fuseCrossModalTransformer(modalityVectors);
        break;

      default:
        fusedVector = this.fuseWeightedAverage(modalityVectors);
    }

    // Project to target dimension
    fusedVector = this.projectToTargetDimension(fusedVector);

    // Calculate cross-modal score
    const crossModalScore = this.calculateCrossModalScore(modalityVectors);

    const fusedEmbedding: FusedEmbedding = {
      id: this.generateFusionId(entityId, embeddings),
      investigationId,
      entityId,
      fusionMethod: this.config.fusionMethod!,
      modalityVectors,
      fusedVector,
      fusedDimension: fusedVector.length,
      crossModalScore,
      hallucinationScore: 0,
      verificationStatus: 'unverified',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return fusedEmbedding;
  }

  /**
   * Fusion by concatenation
   */
  private fuseConcatenation(vectors: ModalityVector[]): number[] {
    const concatenated: number[] = [];
    for (const mv of vectors) {
      concatenated.push(...mv.vector);
    }
    return concatenated;
  }

  /**
   * Fusion by simple average
   */
  private fuseAverage(vectors: ModalityVector[]): number[] {
    if (vectors.length === 0) return [];

    // Find max dimension
    const maxDim = Math.max(...vectors.map((v) => v.vector.length));
    const result = new Array(maxDim).fill(0);

    for (const mv of vectors) {
      const projected = this.padOrTruncate(mv.vector, maxDim);
      for (let i = 0; i < maxDim; i++) {
        result[i] += projected[i] / vectors.length;
      }
    }

    return this.normalize(result);
  }

  /**
   * Fusion by weighted average
   */
  private fuseWeightedAverage(vectors: ModalityVector[]): number[] {
    if (vectors.length === 0) return [];

    const maxDim = Math.max(...vectors.map((v) => v.vector.length));
    const result = new Array(maxDim).fill(0);
    let totalWeight = 0;

    for (const mv of vectors) {
      const projected = this.padOrTruncate(mv.vector, maxDim);
      for (let i = 0; i < maxDim; i++) {
        result[i] += projected[i] * mv.weight;
      }
      totalWeight += mv.weight;
    }

    if (totalWeight > 0) {
      for (let i = 0; i < maxDim; i++) {
        result[i] /= totalWeight;
      }
    }

    return this.normalize(result);
  }

  /**
   * Fusion with attention mechanism
   */
  private fuseAttention(vectors: ModalityVector[]): number[] {
    if (vectors.length === 0) return [];

    const maxDim = Math.max(...vectors.map((v) => v.vector.length));

    // Calculate attention scores based on cross-modal similarity
    const attentionScores: number[] = [];

    for (let i = 0; i < vectors.length; i++) {
      let score = 0;
      for (let j = 0; j < vectors.length; j++) {
        if (i !== j) {
          const sim = this.cosineSimilarity(
            this.padOrTruncate(vectors[i].vector, maxDim),
            this.padOrTruncate(vectors[j].vector, maxDim),
          );
          score += sim;
        }
      }
      // Apply softmax-like transformation
      attentionScores.push(Math.exp(score * vectors[i].confidence));
    }

    // Normalize attention scores
    const totalAttention = attentionScores.reduce((a, b) => a + b, 0);
    const normalizedAttention = attentionScores.map((s) => s / totalAttention);

    // Weighted sum with attention
    const result = new Array(maxDim).fill(0);

    for (let i = 0; i < vectors.length; i++) {
      const projected = this.padOrTruncate(vectors[i].vector, maxDim);
      for (let j = 0; j < maxDim; j++) {
        result[j] += projected[j] * normalizedAttention[i];
      }
    }

    return this.normalize(result);
  }

  /**
   * Cross-modal transformer fusion (simplified)
   */
  private async fuseCrossModalTransformer(
    vectors: ModalityVector[],
  ): Promise<number[]> {
    // Simplified cross-modal attention
    // In production, this would use an actual transformer model

    if (vectors.length === 0) return [];

    const maxDim = Math.max(...vectors.map((v) => v.vector.length));

    // Create queries, keys, values from each modality
    const projected = vectors.map((v) =>
      this.padOrTruncate(v.vector, maxDim),
    );

    // Cross-attention: each modality attends to all others
    const crossAttended: number[][] = [];

    for (let i = 0; i < projected.length; i++) {
      const query = projected[i];
      const attended = new Array(maxDim).fill(0);

      for (let j = 0; j < projected.length; j++) {
        const key = projected[j];
        const value = projected[j];

        // Scaled dot-product attention
        const attention = this.cosineSimilarity(query, key);
        const scaledAttention = attention / Math.sqrt(maxDim);
        const softmaxAttention = Math.exp(scaledAttention);

        for (let k = 0; k < maxDim; k++) {
          attended[k] += value[k] * softmaxAttention;
        }
      }

      crossAttended.push(this.normalize(attended));
    }

    // Average all cross-attended representations
    const result = new Array(maxDim).fill(0);
    for (const attended of crossAttended) {
      for (let i = 0; i < maxDim; i++) {
        result[i] += attended[i] / crossAttended.length;
      }
    }

    return this.normalize(result);
  }

  /**
   * Combine with graph embedding
   */
  private combineWithGraphEmbedding(
    fusedVector: number[],
    graphEmbedding: number[],
  ): number[] {
    // Simple concatenation with projection back to target dimension
    const combined = [...fusedVector, ...graphEmbedding];
    return this.projectToTargetDimension(combined);
  }

  /**
   * Calculate cross-modal consistency score
   */
  private calculateCrossModalScore(vectors: ModalityVector[]): number {
    if (vectors.length < 2) return 1.0;

    let totalSimilarity = 0;
    let pairCount = 0;

    const maxDim = Math.max(...vectors.map((v) => v.vector.length));

    for (let i = 0; i < vectors.length; i++) {
      for (let j = i + 1; j < vectors.length; j++) {
        const sim = this.cosineSimilarity(
          this.padOrTruncate(vectors[i].vector, maxDim),
          this.padOrTruncate(vectors[j].vector, maxDim),
        );
        totalSimilarity += sim;
        pairCount++;
      }
    }

    return pairCount > 0 ? totalSimilarity / pairCount : 1.0;
  }

  /**
   * Project vector to target dimension
   */
  private projectToTargetDimension(vector: number[]): number[] {
    const targetDim = this.config.targetDimension!;

    if (vector.length === targetDim) {
      return vector;
    }

    if (vector.length < targetDim) {
      return this.padOrTruncate(vector, targetDim);
    }

    // Reduce using PCA-like averaging
    const result = new Array(targetDim).fill(0);
    const ratio = vector.length / targetDim;

    for (let i = 0; i < targetDim; i++) {
      const start = Math.floor(i * ratio);
      const end = Math.floor((i + 1) * ratio);
      let sum = 0;
      for (let j = start; j < end; j++) {
        sum += vector[j];
      }
      result[i] = sum / (end - start);
    }

    return this.normalize(result);
  }

  /**
   * Pad or truncate vector
   */
  private padOrTruncate(vector: number[], targetDim: number): number[] {
    if (vector.length === targetDim) {
      return vector;
    }

    if (vector.length < targetDim) {
      return [...vector, ...new Array(targetDim - vector.length).fill(0)];
    }

    return vector.slice(0, targetDim);
  }

  /**
   * Normalize vector to unit length
   */
  private normalize(vector: number[]): number[] {
    const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
    if (norm === 0) return vector;
    return vector.map((v) => v / norm);
  }

  /**
   * Calculate cosine similarity
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
    return magnitude === 0 ? 0 : dotProduct / magnitude;
  }

  /**
   * Generate fusion ID
   */
  private generateFusionId(
    entityId: string,
    embeddings: BaseEmbedding[],
  ): string {
    const hash = createHash('sha256');
    hash.update(entityId);
    for (const emb of embeddings) {
      hash.update(emb.id);
    }
    return hash.digest('hex').slice(0, 16);
  }

  /**
   * Map validation action to verification status
   */
  private mapValidationToStatus(
    action: string,
  ): VerificationStatus {
    switch (action) {
      case 'accept':
        return 'auto_verified';
      case 'reject':
        return 'rejected';
      case 'flag_for_review':
        return 'flagged';
      default:
        return 'unverified';
    }
  }

  /**
   * Chunk array for parallel processing
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Update metrics
   */
  private updateMetrics(
    job: PipelineJob,
    embeddings: BaseEmbedding[],
    processingTimeMs: number,
  ): void {
    this.metrics.totalJobsProcessed++;
    this.metrics.totalEmbeddingsGenerated += embeddings.length;

    // Update average processing time
    const totalTime =
      this.metrics.averageProcessingTime * (this.metrics.totalJobsProcessed - 1) +
      processingTimeMs;
    this.metrics.averageProcessingTime = totalTime / this.metrics.totalJobsProcessed;

    // Update error rate
    const totalErrors = job.errors.length;
    this.metrics.errorRate =
      (this.metrics.errorRate * (this.metrics.totalJobsProcessed - 1) +
        (totalErrors > 0 ? 1 : 0)) /
      this.metrics.totalJobsProcessed;

    // Update performance metrics
    this.performanceMetrics.embeddingLatencyMs = processingTimeMs / embeddings.length;
    this.performanceMetrics.throughputPerSecond =
      1000 / this.performanceMetrics.embeddingLatencyMs;
  }

  /**
   * Emit pipeline event
   */
  private emitEvent(event: PipelineEvent): void {
    this.emit(event.type, event);
    this.emit('event', event);
  }

  /**
   * Register event handler
   */
  onEvent(handler: PipelineEventHandler): void {
    if (handler.onJobStarted) {
      this.on('job_started', (e: PipelineEvent) => {
        if (e.type === 'job_started') handler.onJobStarted!(e.jobId);
      });
    }
    if (handler.onModalityProcessed) {
      this.on('modality_processed', (e: PipelineEvent) => {
        if (e.type === 'modality_processed') {
          handler.onModalityProcessed!(e.jobId, e.modality, e.sourceId);
        }
      });
    }
    if (handler.onFusionCompleted) {
      this.on('fusion_completed', (e: PipelineEvent) => {
        if (e.type === 'fusion_completed') {
          handler.onFusionCompleted!(e.jobId, e.entityId, e.fusedEmbeddingId);
        }
      });
    }
    if (handler.onHallucinationDetected) {
      this.on('hallucination_detected', (e: PipelineEvent) => {
        if (e.type === 'hallucination_detected') {
          handler.onHallucinationDetected!(e.jobId, e.sourceId, e.score);
        }
      });
    }
    if (handler.onJobCompleted) {
      this.on('job_completed', (e: PipelineEvent) => {
        if (e.type === 'job_completed') {
          handler.onJobCompleted!(e.jobId, e.totalEmbeddings);
        }
      });
    }
    if (handler.onJobFailed) {
      this.on('job_failed', (e: PipelineEvent) => {
        if (e.type === 'job_failed') handler.onJobFailed!(e.jobId, e.error);
      });
    }
  }

  /**
   * Get job status
   */
  getJob(jobId: string): PipelineJob | undefined {
    return this.jobs.get(jobId);
  }

  /**
   * Get all jobs
   */
  getJobs(): PipelineJob[] {
    return Array.from(this.jobs.values());
  }

  /**
   * Get metrics
   */
  getMetrics(): PipelineMetrics {
    return { ...this.metrics };
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): PerformanceMetrics {
    return { ...this.performanceMetrics };
  }

  /**
   * Search similar embeddings
   */
  async searchSimilar(
    queryVector: number[],
    options: {
      topK?: number;
      threshold?: number;
      investigationId?: string;
    } = {},
  ): Promise<FusedEmbedding[]> {
    if (!this.pgVectorStore) {
      throw new Error('PgVector storage not enabled');
    }

    const results = await this.pgVectorStore.search(queryVector, options);

    // Return as FusedEmbedding placeholders
    return results.map((r) => ({
      id: r.id,
      investigationId: '',
      entityId: r.entityId,
      fusionMethod: 'weighted_average' as FusionMethod,
      modalityVectors: [],
      fusedVector: [],
      fusedDimension: 0,
      crossModalScore: r.similarity,
      hallucinationScore: 0,
      verificationStatus: 'unverified' as VerificationStatus,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
  }

  /**
   * Close all connections
   */
  async close(): Promise<void> {
    const closePromises: Promise<void>[] = [];

    if (this.pgVectorStore) {
      closePromises.push(this.pgVectorStore.close());
    }

    if (this.neo4jEmbeddings) {
      closePromises.push(this.neo4jEmbeddings.close());
    }

    await Promise.all(closePromises);
    logger.info('Fusion Orchestrator closed');
  }
}

export default FusionOrchestrator;
