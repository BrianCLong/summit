/**
 * ML Model type definitions for model registry
 */

export enum ModelType {
  VIDEO_DETECTOR = 'VIDEO_DETECTOR',
  AUDIO_DETECTOR = 'AUDIO_DETECTOR',
  IMAGE_DETECTOR = 'IMAGE_DETECTOR',
  ENSEMBLE = 'ENSEMBLE',
  FEATURE_EXTRACTOR = 'FEATURE_EXTRACTOR',
}

export enum ModelStatus {
  DRAFT = 'DRAFT',
  TESTING = 'TESTING',
  STAGING = 'STAGING',
  PRODUCTION = 'PRODUCTION',
  DEPRECATED = 'DEPRECATED',
  ARCHIVED = 'ARCHIVED',
}

export enum ModelFramework {
  PYTORCH = 'PYTORCH',
  TENSORFLOW = 'TENSORFLOW',
  ONNX = 'ONNX',
  SCIKIT_LEARN = 'SCIKIT_LEARN',
  CUSTOM = 'CUSTOM',
}

export interface MLModel {
  id: string;
  name: string;
  version: string;
  modelType: ModelType;
  framework: ModelFramework;
  
  // Storage
  storageUrl: string; // S3/MinIO URL
  fileSizeBytes: number;
  checksumSha256: string;
  
  // Training metadata
  trainingDataset?: string;
  trainingDate?: Date;
  trainingMetrics?: TrainingMetrics;
  hyperparameters?: Record<string, unknown>;
  
  // Model architecture
  architecture?: string;
  inputShape?: number[];
  outputShape?: number[];
  numParameters?: number;
  
  // Deployment
  status: ModelStatus;
  deployedAt?: Date;
  deprecatedAt?: Date;
  deployedBy?: string;
  
  // Performance tracking
  inferenceCount: number;
  avgInferenceTimeMs?: number;
  
  // Metadata
  description?: string;
  tags?: string[];
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TrainingMetrics {
  // Classification metrics
  accuracy?: number;
  precision?: number;
  recall?: number;
  f1Score?: number;
  aucRoc?: number;
  
  // Loss metrics
  trainLoss?: number;
  validationLoss?: number;
  testLoss?: number;
  
  // Confusion matrix
  truePositives?: number;
  trueNegatives?: number;
  falsePositives?: number;
  falseNegatives?: number;
  
  // Additional metrics
  eer?: number; // Equal Error Rate
  mcc?: number; // Matthews Correlation Coefficient
  
  // Per-class metrics (for multi-class)
  perClassMetrics?: Record<string, ClassMetrics>;
  
  // Training details
  epochs?: number;
  batchSize?: number;
  learningRate?: number;
  trainingTime?: number; // seconds
  
  // Dataset split
  trainSamples?: number;
  validationSamples?: number;
  testSamples?: number;
}

export interface ClassMetrics {
  precision: number;
  recall: number;
  f1Score: number;
  support: number; // number of samples
}

export interface ModelPerformanceMetric {
  id: string;
  modelId: string;
  
  // Time window
  recordedAt: Date;
  windowStart: Date;
  windowEnd: Date;
  
  // Performance metrics
  totalInferences: number;
  avgConfidence?: number;
  falsePositiveRate?: number;
  falseNegativeRate?: number;
  
  // Latency metrics
  avgLatencyMs?: number;
  p50LatencyMs?: number;
  p95LatencyMs?: number;
  p99LatencyMs?: number;
  
  // Drift indicators
  featureDriftScore?: number; // 0.0 to 1.0
  predictionDriftScore?: number; // 0.0 to 1.0
  
  // Resource usage
  avgCpuUsage?: number;
  avgMemoryUsage?: number;
  avgGpuUsage?: number;
  
  createdAt: Date;
}

export interface ModelCard {
  modelId: string;
  modelName: string;
  modelVersion: string;
  
  // Model details
  modelDescription: string;
  modelType: ModelType;
  architecture: string;
  
  // Intended use
  intendedUse: string;
  intendedUsers: string[];
  outOfScopeUse?: string[];
  
  // Training data
  trainingData: {
    dataset: string;
    datasetSize: number;
    datasetDescription?: string;
    dataCollection?: string;
    preprocessing?: string;
  };
  
  // Performance
  performance: {
    metrics: TrainingMetrics;
    testData?: string;
    limitations?: string[];
  };
  
  // Ethical considerations
  ethical: {
    sensitiveData?: string;
    demographicBias?: string;
    fairnessMetrics?: Record<string, unknown>;
    mitigationStrategies?: string[];
  };
  
  // Technical details
  technical: {
    framework: ModelFramework;
    requirements: string[];
    deployment?: string;
    monitoring?: string;
  };
  
  // Metadata
  authors: string[];
  contact?: string;
  license?: string;
  citations?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ModelDeploymentConfig {
  modelId: string;
  
  // Deployment strategy
  strategy: 'replace' | 'canary' | 'ab_test';
  canaryPercentage?: number; // 0-100, for canary deployments
  abTestPercentage?: number; // 0-100, for A/B tests
  
  // Resource allocation
  replicas?: number;
  cpuRequest?: string;
  cpuLimit?: string;
  memoryRequest?: string;
  memoryLimit?: string;
  gpuRequest?: number;
  
  // Scaling
  autoscaling?: {
    enabled: boolean;
    minReplicas: number;
    maxReplicas: number;
    targetCpuUtilization?: number;
    targetMemoryUtilization?: number;
  };
  
  // Health checks
  healthCheck?: {
    path: string;
    intervalSeconds: number;
    timeoutSeconds: number;
    successThreshold: number;
    failureThreshold: number;
  };
  
  // Rollback policy
  rollback?: {
    enabled: boolean;
    errorRateThreshold?: number;
    latencyThreshold?: number;
    autoRollback?: boolean;
  };
}

export interface ModelDriftReport {
  modelId: string;
  reportDate: Date;
  
  // Feature drift
  featureDrift: {
    score: number; // 0.0 to 1.0
    method: 'psi' | 'kl_divergence' | 'ks_test';
    driftedFeatures: Array<{
      feature: string;
      driftScore: number;
      pValue?: number;
    }>;
  };
  
  // Prediction drift
  predictionDrift: {
    score: number; // 0.0 to 1.0
    method: 'psi' | 'kl_divergence';
    baselineMean: number;
    currentMean: number;
    baselineStd: number;
    currentStd: number;
  };
  
  // Performance degradation
  performanceDrift: {
    baselineAccuracy: number;
    currentAccuracy: number;
    degradationPercent: number;
  };
  
  // Recommendations
  recommendations: string[];
  requiresRetraining: boolean;
  severity: 'low' | 'medium' | 'high';
}
