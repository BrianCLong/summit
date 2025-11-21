import { config } from '../config.js';
import { logger } from '../utils/logger.js';
import {
  TrainingPipeline,
  TrainingExample,
  TrainingMetrics,
} from '../training/TrainingPipeline.js';
import {
  ModelBenchmarkingService,
  ABTestingManager,
  ABTestConfig,
  ABTestAssignment,
  ABTestOutcome,
  HyperparameterOptimizationRequest,
  HyperparameterOptimizationResult,
  HyperparameterOptimizer,
  ModelRegistry,
  RealtimeMetricSnapshot,
  RetrainingOrchestrator,
} from '../benchmarking/index.js';

export interface EntityMatch {
  entityId: string;
  similarity: number;
  confidence: number;
}

export interface TrainingResult {
  success: boolean;
  modelVersion: string;
  accuracy: number;
  optimization?: HyperparameterOptimizationResult;
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
  id: string;
  name: string;
  version: string;
  loaded: boolean;
  type: string;
  metrics?: PerformanceMetrics;
  hyperparameters?: Record<string, any>;
  createdAt?: Date;
}

export interface EngineBenchmarkPayload {
  modelVersion: string;
  modelType: string;
  metrics: PerformanceMetrics;
  dataset?: string;
  context?: Record<string, any>;
}

export interface EngineInferencePayload {
  modelVersion: string;
  modelType: string;
  latencyMs: number;
  success: boolean;
  inputType: 'graph' | 'image' | 'audio' | 'text' | 'video' | 'multimodal';
  metadata?: Record<string, any>;
  metrics?: Partial<PerformanceMetrics>;
}

export class EntityResolutionService {
  private readonly batches = new Map<string, BatchStatus>();
  private readonly loadedModels = new Set<string>();
  private initialized = false;

  constructor(
    private readonly trainingPipeline: TrainingPipeline,
    private readonly benchmarkingService: ModelBenchmarkingService,
    private readonly abTestingManager: ABTestingManager,
    private readonly hyperparameterOptimizer: HyperparameterOptimizer,
    private readonly modelRegistry: ModelRegistry,
    private readonly retrainingOrchestrator: RetrainingOrchestrator,
  ) {}

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    await this.modelRegistry.initialize();
    await this.benchmarkingService.initialize();
    await this.abTestingManager.initialize();

    this.retrainingOrchestrator.registerModelType('entity-resolution', {
      degradationThreshold:
        config.ml.autoTuning.performanceDegradationThreshold,
      evaluationWindow: config.ml.autoTuning.evaluationWindow,
      minEvaluations: config.ml.autoTuning.minEvaluations,
      cooldownMs: config.ml.autoTuning.cooldownMs,
    });

    this.initialized = true;
    logger.info('EntityResolutionService initialized with benchmarking and auto-tuning');
  }

  async findDuplicates(
    entityId: string,
    limit: number = 10,
    threshold: number = 0.8,
  ): Promise<EntityMatch[]> {
    const start = process.hrtime.bigint();

    const matches: EntityMatch[] = Array.from({ length: limit }, (_, index) => ({
      entityId: `${entityId}-candidate-${index + 1}`,
      similarity: Math.random(),
      confidence: Math.random(),
    }))
      .filter((match) => match.similarity >= threshold)
      .slice(0, limit);

    await this.recordEntityResolutionInference('findDuplicates', entityId, start);
    return matches;
  }

  async bulkResolution(
    entityIds: string[],
    threshold: number = 0.8,
    maxClusters: number = 100,
  ): Promise<string[][]> {
    const start = process.hrtime.bigint();

    const clusters: string[][] = [];
    for (let i = 0; i < entityIds.length; i += Math.max(1, Math.floor(threshold * 3))) {
      clusters.push(entityIds.slice(i, Math.min(i + 3, entityIds.length)));
    }

    await this.recordEntityResolutionInference('bulkResolution', entityIds.join(','), start);
    return clusters.slice(0, maxClusters);
  }

  async trainFromFeedback(
    positiveExamples: any[],
    negativeExamples: any[],
  ): Promise<TrainingResult> {
    const normalizedExamples = [
      ...this.normalizeFeedbackExamples(positiveExamples, true),
      ...this.normalizeFeedbackExamples(negativeExamples, false),
    ];

    const historical = await this.trainingPipeline.collectTrainingData(
      Math.max(100, normalizedExamples.length),
    );
    const allExamples = [...historical, ...normalizedExamples];

    const optimization = await this.hyperparameterOptimizer.optimize(allExamples, {
      modelType: 'random_forest',
      nTrials: 30,
    });

    const modelVersion = await this.trainingPipeline.trainModel(
      allExamples,
      'random_forest',
      optimization.bestHyperparameters,
    );

    await this.modelRegistry.ensureRegistered('entity-resolution', modelVersion.version, {
      metrics: modelVersion.metrics,
      hyperparameters: modelVersion.hyperparameters,
      modelPath: modelVersion.modelPath,
      activate: false,
    });

    return {
      success: true,
      modelVersion: modelVersion.id,
      accuracy: modelVersion.metrics.accuracy,
      optimization,
    };
  }

  async calculateSimilarity(
    entity1Id: string,
    entity2Id: string,
  ): Promise<number> {
    const start = process.hrtime.bigint();
    const similarity = Math.random();
    await this.recordEntityResolutionInference('calculateSimilarity', `${entity1Id}:${entity2Id}`, start);
    return similarity;
  }

  async getPerformanceMetrics(): Promise<PerformanceMetrics> {
    const activeModel = await this.modelRegistry.getActiveModel('entity-resolution');
    if (!activeModel) {
      return {
        accuracy: 0,
        precision: 0,
        recall: 0,
        f1Score: 0,
        processingTime: 0,
      };
    }

    return this.mapTrainingMetricsToPerformance(activeModel.metrics as TrainingMetrics);
  }

  async recordFeedback(feedback: FeedbackRecord): Promise<void> {
    logger.debug('Feedback recorded for entity resolution', feedback);
  }

  async getSemanticEmbeddings(
    texts: string[],
    modelName: string = 'all-MiniLM-L6-v2',
  ): Promise<number[][]> {
    const model = await this.modelRegistry.ensureRegistered('nlp/spacy', modelName, {
      modelPath: 'external',
    });

    const start = process.hrtime.bigint();
    const embeddings = texts.map(() =>
      Array(384)
        .fill(0)
        .map(() => Math.random()),
    );

    await this.benchmarkingService.recordInference({
      modelVersionId: model.id,
      modelType: 'nlp/spacy',
      latencyMs: this.calculateLatency(start),
      success: true,
      inputType: 'text',
      metadata: { operation: 'embedding', count: texts.length, modelName },
    });

    return embeddings;
  }

  async calculateSemanticSimilarity(
    text1: string,
    text2: string,
    modelName: string = 'all-MiniLM-L6-v2',
  ): Promise<number> {
    const model = await this.modelRegistry.ensureRegistered('nlp/spacy', modelName, {
      modelPath: 'external',
    });
    const start = process.hrtime.bigint();
    const similarity = Math.random();

    await this.benchmarkingService.recordInference({
      modelVersionId: model.id,
      modelType: 'nlp/spacy',
      latencyMs: this.calculateLatency(start),
      success: true,
      inputType: 'text',
      metadata: { operation: 'semantic_similarity' },
    });

    return similarity;
  }

  async processBatch(
    batchId: string,
    entities: any[],
    config?: any,
  ): Promise<void> {
    const start = process.hrtime.bigint();
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
        results: entities.map((entity) => ({ ...entity, processed: true })),
      });
    }, 1000);

    await this.recordEntityResolutionInference('processBatch', batchId, start, {
      batchSize: entities.length,
      config,
    });
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
    const versions = await this.modelRegistry.listVersions('entity-resolution', 25);
    return versions.map((version) => ({
      id: version.id,
      name: version.modelType,
      version: version.version,
      loaded: version.isActive,
      type: version.modelType,
      metrics: this.mapTrainingMetricsToPerformance(
        version.metrics as TrainingMetrics,
      ),
      hyperparameters: version.hyperparameters,
      createdAt: version.createdAt,
    }));
  }

  async loadModel(modelIdentifier: string): Promise<void> {
    const model = await this.modelRegistry.getModelById(modelIdentifier);
    if (!model) {
      throw new Error(`Model ${modelIdentifier} not found`);
    }

    await this.trainingPipeline.activateModel(model.id);
    this.loadedModels.add(model.id);
    logger.info('Model activated', { modelVersionId: model.id });
  }

  async createABTest(config: ABTestConfig): Promise<void> {
    await this.abTestingManager.createOrUpdateExperiment(config);
  }

  async assignToABTest(
    experimentName: string,
    subjectId: string,
  ): Promise<ABTestAssignment> {
    return this.abTestingManager.assignVariant(experimentName, subjectId);
  }

  async recordABTestOutcome(outcome: ABTestOutcome): Promise<void> {
    await this.abTestingManager.recordOutcome(outcome);
  }

  async getABTestReport(experimentName: string): Promise<any> {
    return this.abTestingManager.getExperimentReport(experimentName);
  }

  async optimizeHyperparameters(
    request: HyperparameterOptimizationRequest,
  ): Promise<HyperparameterOptimizationResult> {
    const trainingData = await this.trainingPipeline.collectTrainingData();
    return this.hyperparameterOptimizer.optimize(trainingData, request);
  }

  async recordExternalEngineBenchmark(payload: EngineBenchmarkPayload): Promise<void> {
    const model = await this.modelRegistry.ensureRegistered(payload.modelType, payload.modelVersion, {
      modelPath: 'external',
    });

    await this.benchmarkingService.recordPerformance({
      modelVersionId: model.id,
      modelType: payload.modelType,
      accuracy: payload.metrics.accuracy,
      precision: payload.metrics.precision,
      recall: payload.metrics.recall,
      f1Score: payload.metrics.f1Score,
      testSetSize: payload.context?.testSetSize
        ? Number(payload.context.testSetSize)
        : undefined,
      evaluationDate: new Date(),
      evaluationContext: {
        dataset: payload.dataset,
        context: payload.context,
        stage: 'external-benchmark',
      },
    });
  }

  async recordExternalInference(payload: EngineInferencePayload): Promise<void> {
    const model = await this.modelRegistry.ensureRegistered(payload.modelType, payload.modelVersion, {
      modelPath: 'external',
    });

    await this.benchmarkingService.recordInference({
      modelVersionId: model.id,
      modelType: payload.modelType,
      latencyMs: payload.latencyMs,
      success: payload.success,
      inputType: payload.inputType,
      metadata: payload.metadata,
      metrics: payload.metrics
        ? {
            accuracy: payload.metrics.accuracy,
            precision: payload.metrics.precision,
            recall: payload.metrics.recall,
            f1Score: payload.metrics.f1Score,
          }
        : undefined,
    });
  }

  getRealtimeMetrics(modelType?: string): RealtimeMetricSnapshot[] {
    return this.benchmarkingService.getRealtimeSnapshot(modelType);
  }

  private mapTrainingMetricsToPerformance(metrics?: TrainingMetrics): PerformanceMetrics {
    if (!metrics) {
      return {
        accuracy: 0,
        precision: 0,
        recall: 0,
        f1Score: 0,
        processingTime: 0,
      };
    }

    return {
      accuracy: metrics.accuracy ?? 0,
      precision: metrics.precision ?? 0,
      recall: metrics.recall ?? 0,
      f1Score: metrics.f1Score ?? 0,
      processingTime: metrics.trainingTime ?? 0,
    };
  }

  private normalizeFeedbackExamples(
    examples: any[],
    isMatch: boolean,
  ): TrainingExample[] {
    return (examples || []).map((example) => ({
      entity1: example.entity1 ?? example[0] ?? {},
      entity2: example.entity2 ?? example[1] ?? {},
      isMatch,
      confidence: example.confidence ?? 1.0,
      features: example.features,
      timestamp: example.timestamp ? new Date(example.timestamp) : new Date(),
    }));
  }

  private async recordEntityResolutionInference(
    operation: string,
    reference: string,
    start: bigint,
    metadata: Record<string, any> = {},
  ): Promise<void> {
    const activeModel = await this.modelRegistry.getActiveModel('entity-resolution');
    if (!activeModel) {
      return;
    }

    await this.benchmarkingService.recordInference({
      modelVersionId: activeModel.id,
      modelType: 'entity-resolution',
      latencyMs: this.calculateLatency(start),
      success: true,
      inputType: 'graph',
      metadata: {
        operation,
        reference,
        ...metadata,
      },
    });
  }

  private calculateLatency(start: bigint): number {
    const diff = process.hrtime.bigint() - start;
    return Number(diff) / 1e6;
  }
}
