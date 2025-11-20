import { Pool } from 'pg';
import { ModelBenchmarkingService } from '../benchmarking/ModelBenchmarkingService.js';
import { ModelRegistry } from '../benchmarking/ModelRegistry.js';
export interface TrainingExample {
    entity1: any;
    entity2: any;
    isMatch: boolean;
    confidence: number;
    features?: Record<string, number>;
    userId?: string;
    timestamp: Date;
}
export interface TrainingMetrics {
    accuracy: number;
    precision: number;
    recall: number;
    f1Score: number;
    confusionMatrix: {
        truePositives: number;
        falsePositives: number;
        trueNegatives: number;
        falseNegatives: number;
    };
    totalExamples: number;
    trainingTime: number;
}
export interface ModelVersion {
    id: string;
    version: string;
    modelType: string;
    metrics: TrainingMetrics;
    isActive: boolean;
    createdAt: Date;
    modelPath: string;
    hyperparameters: Record<string, any>;
}
export declare class TrainingPipeline {
    private readonly benchmarkingService?;
    private readonly modelRegistry?;
    private pgPool;
    private modelsDir;
    constructor(pgPool: Pool, benchmarkingService?: ModelBenchmarkingService, modelRegistry?: ModelRegistry);
    private ensureModelsDirectory;
    collectTrainingData(minExamples?: number): Promise<TrainingExample[]>;
    generateFeatures(examples: TrainingExample[]): Promise<TrainingExample[]>;
    trainModel(examples: TrainingExample[], modelType?: string, hyperparameters?: Record<string, any>): Promise<ModelVersion>;
    evaluateModel(modelId: string, testExamples: TrainingExample[]): Promise<TrainingMetrics>;
    private runPythonScript;
    private saveModelVersion;
    private getModelVersion;
    private shouldActivateModel;
    private getActiveModel;
    activateModel(modelId: string): Promise<void>;
    getModelHistory(modelType?: string, limit?: number): Promise<ModelVersion[]>;
    scheduleTraining(cron: string, modelType: string): Promise<void>;
    private recordPerformanceSnapshot;
}
