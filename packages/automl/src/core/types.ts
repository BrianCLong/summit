import { z } from 'zod';

/**
 * Core types for AutoML platform
 */

// Algorithm types
export enum AlgorithmType {
  CLASSIFICATION = 'classification',
  REGRESSION = 'regression',
  CLUSTERING = 'clustering',
  DIMENSIONALITY_REDUCTION = 'dimensionality_reduction',
  ANOMALY_DETECTION = 'anomaly_detection',
  TIME_SERIES = 'time_series',
  NLP = 'nlp',
  COMPUTER_VISION = 'computer_vision',
}

// Model complexity
export enum ModelComplexity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  VERY_HIGH = 'very_high',
}

// Dataset schema
export const DatasetSchema = z.object({
  id: z.string(),
  name: z.string(),
  features: z.array(z.object({
    name: z.string(),
    type: z.enum(['numeric', 'categorical', 'text', 'datetime', 'boolean']),
    missing: z.number(),
    unique: z.number(),
    distribution: z.record(z.any()).optional(),
  })),
  target: z.string().optional(),
  rows: z.number(),
  columns: z.number(),
  metadata: z.record(z.any()).optional(),
});

export type Dataset = z.infer<typeof DatasetSchema>;

// Model configuration
export const ModelConfigSchema = z.object({
  algorithm: z.string(),
  algorithmType: z.nativeEnum(AlgorithmType),
  hyperparameters: z.record(z.any()),
  complexity: z.nativeEnum(ModelComplexity),
  estimatedTime: z.number().optional(),
  estimatedCost: z.number().optional(),
});

export type ModelConfig = z.infer<typeof ModelConfigSchema>;

// Model performance metrics
export const PerformanceMetricsSchema = z.object({
  accuracy: z.number().optional(),
  precision: z.number().optional(),
  recall: z.number().optional(),
  f1Score: z.number().optional(),
  auc: z.number().optional(),
  rmse: z.number().optional(),
  mae: z.number().optional(),
  r2: z.number().optional(),
  silhouetteScore: z.number().optional(),
  custom: z.record(z.number()).optional(),
  validationMethod: z.string(),
  folds: z.number().optional(),
});

export type PerformanceMetrics = z.infer<typeof PerformanceMetricsSchema>;

// Model result
export const ModelResultSchema = z.object({
  id: z.string(),
  modelConfig: ModelConfigSchema,
  performance: PerformanceMetricsSchema,
  trainingTime: z.number(),
  trainingCost: z.number().optional(),
  featureImportance: z.array(z.object({
    feature: z.string(),
    importance: z.number(),
  })).optional(),
  crossValidationScores: z.array(z.number()).optional(),
  metadata: z.record(z.any()).optional(),
  timestamp: z.string(),
});

export type ModelResult = z.infer<typeof ModelResultSchema>;

// AutoML job configuration
export const AutoMLJobConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  dataset: DatasetSchema,
  algorithmType: z.nativeEnum(AlgorithmType),
  optimizationMetric: z.string(),
  optimizationDirection: z.enum(['maximize', 'minimize']),
  timeLimit: z.number().optional(),
  budgetLimit: z.number().optional(),
  maxModels: z.number().optional(),
  crossValidation: z.object({
    method: z.enum(['kfold', 'stratified', 'timeseries', 'leave_one_out']),
    folds: z.number(),
  }),
  ensemble: z.object({
    enabled: z.boolean(),
    method: z.enum(['voting', 'stacking', 'boosting', 'bagging']).optional(),
    maxModels: z.number().optional(),
  }).optional(),
  preprocessing: z.object({
    autoScale: z.boolean(),
    autoEncode: z.boolean(),
    autoImpute: z.boolean(),
    handleOutliers: z.boolean(),
    balanceClasses: z.boolean(),
  }).optional(),
  featureEngineering: z.object({
    enabled: z.boolean(),
    maxFeatures: z.number().optional(),
    polynomialDegree: z.number().optional(),
    interactions: z.boolean(),
  }).optional(),
});

export type AutoMLJobConfig = z.infer<typeof AutoMLJobConfigSchema>;

// AutoML job status
export enum JobStatus {
  PENDING = 'pending',
  PREPROCESSING = 'preprocessing',
  FEATURE_ENGINEERING = 'feature_engineering',
  MODEL_SEARCH = 'model_search',
  HYPERPARAMETER_TUNING = 'hyperparameter_tuning',
  ENSEMBLE_BUILDING = 'ensemble_building',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

// AutoML job
export const AutoMLJobSchema = z.object({
  id: z.string(),
  config: AutoMLJobConfigSchema,
  status: z.nativeEnum(JobStatus),
  progress: z.number().min(0).max(100),
  modelsEvaluated: z.number(),
  bestModel: ModelResultSchema.optional(),
  allModels: z.array(ModelResultSchema).optional(),
  logs: z.array(z.string()).optional(),
  startTime: z.string(),
  endTime: z.string().optional(),
  error: z.string().optional(),
});

export type AutoMLJob = z.infer<typeof AutoMLJobSchema>;

// Pipeline step
export interface PipelineStep {
  id: string;
  name: string;
  type: 'preprocessing' | 'feature_engineering' | 'model_training' | 'ensemble' | 'deployment';
  config: Record<string, any>;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: any;
  error?: string;
}

// Pipeline
export interface Pipeline {
  id: string;
  name: string;
  steps: PipelineStep[];
  status: JobStatus;
  metadata?: Record<string, any>;
}

// Model explanation
export interface ModelExplanation {
  featureImportance: Array<{ feature: string; importance: number }>;
  shapValues?: Record<string, number[]>;
  partialDependence?: Record<string, Array<{ value: number; effect: number }>>;
  individualPredictions?: Array<{
    prediction: any;
    contributions: Record<string, number>;
  }>;
  decisionBoundary?: any;
  fairnessMetrics?: Record<string, number>;
}

// Deployment config
export interface DeploymentConfig {
  modelId: string;
  target: 'rest_api' | 'batch' | 'streaming' | 'edge';
  scaling: {
    minInstances: number;
    maxInstances: number;
    targetCPU: number;
    targetMemory: number;
  };
  monitoring: {
    enabled: boolean;
    metrics: string[];
    alertThresholds: Record<string, number>;
  };
  abTesting?: {
    enabled: boolean;
    trafficSplit: number;
    baselineModelId: string;
  };
}
