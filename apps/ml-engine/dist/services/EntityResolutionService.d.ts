import { TrainingPipeline } from '../training/TrainingPipeline.js';
import { ModelBenchmarkingService, ABTestingManager, ABTestConfig, ABTestAssignment, ABTestOutcome, HyperparameterOptimizationRequest, HyperparameterOptimizationResult, HyperparameterOptimizer, ModelRegistry, RealtimeMetricSnapshot, RetrainingOrchestrator } from '../benchmarking/index.js';
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
export declare class EntityResolutionService {
    private readonly trainingPipeline;
    private readonly benchmarkingService;
    private readonly abTestingManager;
    private readonly hyperparameterOptimizer;
    private readonly modelRegistry;
    private readonly retrainingOrchestrator;
    private readonly batches;
    private readonly loadedModels;
    private initialized;
    constructor(trainingPipeline: TrainingPipeline, benchmarkingService: ModelBenchmarkingService, abTestingManager: ABTestingManager, hyperparameterOptimizer: HyperparameterOptimizer, modelRegistry: ModelRegistry, retrainingOrchestrator: RetrainingOrchestrator);
    initialize(): Promise<void>;
    findDuplicates(entityId: string, limit?: number, threshold?: number): Promise<EntityMatch[]>;
    bulkResolution(entityIds: string[], threshold?: number, maxClusters?: number): Promise<string[][]>;
    trainFromFeedback(positiveExamples: any[], negativeExamples: any[]): Promise<TrainingResult>;
    calculateSimilarity(entity1Id: string, entity2Id: string): Promise<number>;
    getPerformanceMetrics(): Promise<PerformanceMetrics>;
    recordFeedback(feedback: FeedbackRecord): Promise<void>;
    getSemanticEmbeddings(texts: string[], modelName?: string): Promise<number[][]>;
    calculateSemanticSimilarity(text1: string, text2: string, modelName?: string): Promise<number>;
    processBatch(batchId: string, entities: any[], config?: any): Promise<void>;
    getBatchStatus(batchId: string): Promise<BatchStatus>;
    getAvailableModels(): Promise<ModelInfo[]>;
    loadModel(modelIdentifier: string): Promise<void>;
    createABTest(config: ABTestConfig): Promise<void>;
    assignToABTest(experimentName: string, subjectId: string): Promise<ABTestAssignment>;
    recordABTestOutcome(outcome: ABTestOutcome): Promise<void>;
    getABTestReport(experimentName: string): Promise<any>;
    optimizeHyperparameters(request: HyperparameterOptimizationRequest): Promise<HyperparameterOptimizationResult>;
    recordExternalEngineBenchmark(payload: EngineBenchmarkPayload): Promise<void>;
    recordExternalInference(payload: EngineInferencePayload): Promise<void>;
    getRealtimeMetrics(modelType?: string): RealtimeMetricSnapshot[];
    private mapTrainingMetricsToPerformance;
    private normalizeFeedbackExamples;
    private recordEntityResolutionInference;
    private calculateLatency;
}
