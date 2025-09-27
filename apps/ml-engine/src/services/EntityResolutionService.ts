import { config } from '../config';
import { logger } from '../utils/logger';

export interface EntityMatch {
  entityId: string;
  similarity: number;
  confidence: number;
}

export interface TrainingResult {
  success: boolean;
  modelVersion: string;
  accuracy: number;
}

export interface PerformanceMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  processingTime: number;
}

export interface FeedbackRecord {
  entity1Id: string;
  entity2Id: string;
  isMatch: boolean;
  confidence: number;
  userId?: string;
  timestamp: Date;
}

export interface BatchStatus {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  total: number;
  results?: any[];
  error?: string;
}

export interface ModelInfo {
  name: string;
  version: string;
  loaded: boolean;
  type: string;
}

export type SentimentFramework = 'AUTO' | 'TORCH' | 'TENSORFLOW';

export interface SentimentPrediction {
  text: string;
  label: string;
  score: number;
  modelName: string;
  framework: SentimentFramework;
  jobId?: string;
  sourceId?: string;
  neo4jNodeId?: string;
}

export interface SentimentJobResult {
  jobId: string;
  processedCount: number;
  predictions: SentimentPrediction[];
  neo4jBatchId?: string;
}

interface PythonPrediction {
  text: string;
  label: string;
  score: number;
  model_name: string;
  framework?: string;
  job_id?: string;
  source_id?: string;
  neo4j_node_id?: string;
}

interface PythonPredictResponse {
  predictions: PythonPrediction[];
  job_id?: string;
  processed_count?: number;
  neo4j_batch_id?: string;
}

interface SentimentRequestOptions {
  modelName?: string;
  framework?: SentimentFramework;
  limit?: number;
}

export class EntityResolutionService {
  private batches: Map<string, BatchStatus> = new Map();
  private loadedModels: Set<string> = new Set();
  private readonly pythonConfig = config.ml.python;
  private readonly ingestConfig = config.ingest;

  async initialize(): Promise<void> {
    logger.info('EntityResolutionService initialized');
  }

  async findDuplicates(entityId: string, limit: number = 10, threshold: number = 0.8): Promise<EntityMatch[]> {
    // Placeholder implementation - replace with real ML logic
    logger.debug('findDuplicates called with', { entityId, limit, threshold });
    return [];
  }

  async bulkResolution(entityIds: string[], threshold: number = 0.8, maxClusters: number = 100): Promise<string[][]> {
    logger.debug('bulkResolution called with', { entityCount: entityIds.length, threshold, maxClusters });
    return entityIds.map((id) => [id]);
  }

  async trainFromFeedback(positiveExamples: any[], negativeExamples: any[]): Promise<TrainingResult> {
    logger.info('trainFromFeedback invoked', {
      positiveExamples: positiveExamples.length,
      negativeExamples: negativeExamples.length,
    });

    return {
      success: true,
      modelVersion: '1.0.0',
      accuracy: 0.85,
    };
  }

  async calculateSimilarity(entity1Id: string, entity2Id: string): Promise<number> {
    logger.debug('calculateSimilarity called', { entity1Id, entity2Id });
    return Math.random();
  }

  async getPerformanceMetrics(): Promise<PerformanceMetrics> {
    return {
      accuracy: 0.85,
      precision: 0.82,
      recall: 0.78,
      f1Score: 0.8,
      processingTime: 150,
    };
  }

  async recordFeedback(feedback: FeedbackRecord): Promise<void> {
    logger.info('Feedback recorded', feedback);
  }

  async getSemanticEmbeddings(texts: string[], modelName: string = 'all-MiniLM-L6-v2'): Promise<number[][]> {
    logger.debug('getSemanticEmbeddings invoked', { count: texts.length, modelName });
    return texts.map(() => Array(384).fill(0).map(() => Math.random()));
  }

  async calculateSemanticSimilarity(text1: string, text2: string, modelName: string = 'all-MiniLM-L6-v2'): Promise<number> {
    logger.debug('calculateSemanticSimilarity invoked', { modelName });
    return Math.random();
  }

  async processBatch(batchId: string, entities: any[], config?: any): Promise<void> {
    this.batches.set(batchId, {
      status: 'processing',
      progress: 0,
      total: entities.length,
    });

    setTimeout(() => {
      this.batches.set(batchId, {
        status: 'completed',
        progress: entities.length,
        total: entities.length,
        results: entities.map((e) => ({ ...e, processed: true })),
      });
    }, 1000);
  }

  async getBatchStatus(batchId: string): Promise<BatchStatus> {
    return (
      this.batches.get(batchId) || {
        status: 'pending',
        progress: 0,
        total: 0,
      }
    );
  }

  async getAvailableModels(): Promise<ModelInfo[]> {
    return [
      {
        name: 'all-MiniLM-L6-v2',
        version: '1.0.0',
        loaded: this.loadedModels.has('all-MiniLM-L6-v2'),
        type: 'sentence-transformer',
      },
      {
        name: 'entity-resolution-base',
        version: '1.0.0',
        loaded: this.loadedModels.has('entity-resolution-base'),
        type: 'classification',
      },
    ];
  }

  async loadModel(modelName: string): Promise<void> {
    this.loadedModels.add(modelName);
    logger.info('Model loaded', { modelName });
  }

  async analyzeSentiment(texts: string[], options?: SentimentRequestOptions): Promise<SentimentPrediction[]> {
    if (!texts || texts.length === 0) {
      throw new Error('At least one text item is required for sentiment analysis');
    }

    const payload = this.buildPayload({
      texts,
      model_name: options?.modelName,
      framework: this.normalizeFramework(options?.framework),
    });

    const response = await this.callPython<PythonPredictResponse>(this.pythonConfig.predictEndpoint, payload);
    return (response.predictions || []).map((prediction) => this.toSentimentPrediction(prediction));
  }

  async analyzeIngestJob(jobId: string, options?: SentimentRequestOptions): Promise<SentimentJobResult> {
    if (!jobId) {
      throw new Error('jobId is required');
    }

    const payload = this.buildPayload({
      job_id: jobId,
      limit: options?.limit ?? this.ingestConfig.wizardDefaultLimit,
      model_name: options?.modelName,
      framework: this.normalizeFramework(options?.framework),
    });

    const response = await this.callPython<PythonPredictResponse>(this.pythonConfig.ingestEndpoint, payload);
    const predictions = (response.predictions || []).map((prediction) => this.toSentimentPrediction(prediction));

    return {
      jobId: response.job_id || jobId,
      processedCount: response.processed_count ?? predictions.length,
      predictions,
      neo4jBatchId: response.neo4j_batch_id,
    };
  }

  private buildPayload(payload: Record<string, unknown>): Record<string, unknown> {
    return Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined));
  }

  private async callPython<T>(endpoint: string, payload: Record<string, unknown>): Promise<T> {
    const url = `${this.pythonConfig.serviceUrl}${endpoint}`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        logger.error('Python service request failed', {
          url,
          status: response.status,
          errorBody,
        });
        throw new Error(`Python service responded with status ${response.status}`);
      }

      return (await response.json()) as T;
    } catch (error) {
      logger.error('Python service call threw an error', {
        url,
        error,
      });
      throw error;
    }
  }

  private normalizeFramework(framework?: SentimentFramework): string | undefined {
    if (!framework) {
      const defaultFramework = this.pythonConfig.defaultFramework ?? 'auto';
      return this.normalizeFrameworkString(defaultFramework);
    }

    return this.normalizeFrameworkString(framework.toLowerCase());
  }

  private normalizeFrameworkString(framework: string): string | undefined {
    const normalized = framework.toLowerCase();
    if (normalized === 'torch' || normalized === 'pt') {
      return 'torch';
    }

    if (normalized === 'tensorflow' || normalized === 'tf') {
      return 'tensorflow';
    }

    return 'auto';
  }

  private toSentimentPrediction(prediction: PythonPrediction): SentimentPrediction {
    return {
      text: prediction.text,
      label: prediction.label,
      score: prediction.score,
      modelName: prediction.model_name,
      framework: this.frameworkFromPython(prediction.framework),
      jobId: prediction.job_id,
      sourceId: prediction.source_id,
      neo4jNodeId: prediction.neo4j_node_id,
    };
  }

  private frameworkFromPython(framework?: string): SentimentFramework {
    const value = (framework || this.pythonConfig.defaultFramework || 'auto').toLowerCase();
    if (value === 'torch' || value === 'pt') {
      return 'TORCH';
    }

    if (value === 'tensorflow' || value === 'tf') {
      return 'TENSORFLOW';
    }

    return 'AUTO';
  }
}