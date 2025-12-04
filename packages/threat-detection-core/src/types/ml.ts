/**
 * Machine learning model types for threat detection
 */

export enum ModelType {
  SUPERVISED_CLASSIFIER = 'SUPERVISED_CLASSIFIER',
  UNSUPERVISED_ANOMALY = 'UNSUPERVISED_ANOMALY',
  SEMI_SUPERVISED = 'SEMI_SUPERVISED',
  AUTOENCODER = 'AUTOENCODER',
  GAN = 'GAN',
  ENSEMBLE = 'ENSEMBLE',
  ONLINE_LEARNING = 'ONLINE_LEARNING',
  DEEP_LEARNING = 'DEEP_LEARNING',
  TIME_SERIES = 'TIME_SERIES'
}

export interface MLModel {
  id: string;
  name: string;
  version: string;
  type: ModelType;

  // Training
  trainingDatasetId?: string;
  trainedAt?: Date;
  trainingMetrics?: {
    accuracy?: number;
    precision?: number;
    recall?: number;
    f1Score?: number;
    rocAuc?: number;
    confusionMatrix?: number[][];
  };

  // Features
  features: string[];
  featureImportance?: Record<string, number>;

  // Deployment
  deployed: boolean;
  deployedAt?: Date;
  endpoint?: string;

  // Performance
  performanceMetrics: {
    inferenceTime: number; // milliseconds
    throughput: number; // predictions per second
    accuracy: number;
    falsePositiveRate: number;
    falseNegativeRate: number;
  };

  // Drift detection
  driftDetection: {
    enabled: boolean;
    lastChecked?: Date;
    driftDetected: boolean;
    driftScore?: number;
  };

  // Retraining
  retrainingSchedule?: string; // cron expression
  lastRetrained?: Date;
  autoRetrain: boolean;

  // Metadata
  description: string;
  tags: string[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PredictionRequest {
  modelId: string;
  features: Record<string, any>;
  context?: Record<string, any>;
  explainPrediction?: boolean;
}

export interface PredictionResult {
  modelId: string;
  prediction: any;
  confidence: number;
  probabilities?: Record<string, number>;

  // Explainability
  explanation?: {
    method: 'lime' | 'shap' | 'attention' | 'feature_importance';
    featureContributions: Record<string, number>;
    reasoning?: string;
  };

  // Metadata
  inferenceTime: number; // milliseconds
  timestamp: Date;
  modelVersion: string;
}

export interface AnomalyDetectionModel {
  algorithm: 'isolation_forest' | 'one_class_svm' | 'autoencoder' | 'lstm' | 'gan' | 'statistical';
  threshold: number;
  contaminationRate?: number; // For unsupervised models

  // Statistical parameters
  statisticalParams?: {
    method: 'zscore' | 'iqr' | 'mad' | 'grubbs';
    windowSize?: number;
    sensitivity: number;
  };

  // Time-series specific
  timeSeriesParams?: {
    seasonality?: number;
    trend?: boolean;
    lookbackWindow: number;
    forecastHorizon?: number;
  };
}

export interface EnsembleModel {
  baseModels: string[]; // Model IDs
  aggregationMethod: 'voting' | 'averaging' | 'weighted_average' | 'stacking';
  weights?: Record<string, number>;

  // Meta-learner for stacking
  metaLearner?: {
    modelType: string;
    trained: boolean;
  };
}

export interface OnlineLearningModel {
  batchSize: number;
  learningRate: number;
  updateFrequency: number; // milliseconds

  // Sliding window for continuous learning
  windowSize: number;

  // Performance tracking
  performanceHistory: {
    timestamp: Date;
    accuracy: number;
    sampleSize: number;
  }[];
}

export interface FeatureEngineering {
  rawFeatures: string[];
  derivedFeatures: {
    name: string;
    transformation: string;
    dependencies: string[];
  }[];

  // Normalization
  normalization?: {
    method: 'minmax' | 'zscore' | 'robust' | 'none';
    parameters: Record<string, any>;
  };

  // Encoding
  categoricalEncoding?: {
    method: 'onehot' | 'label' | 'target' | 'embedding';
    columns: string[];
  };

  // Dimensionality reduction
  dimensionalityReduction?: {
    method: 'pca' | 'tsne' | 'umap' | 'autoencoder';
    targetDimensions: number;
  };
}

export interface ModelMonitoring {
  modelId: string;

  // Data drift
  dataDrift: {
    detected: boolean;
    score: number;
    features: Record<string, {
      driftScore: number;
      drifted: boolean;
    }>;
  };

  // Concept drift
  conceptDrift: {
    detected: boolean;
    score: number;
    method: 'adwin' | 'ddm' | 'eddm' | 'page_hinkley';
  };

  // Performance degradation
  performanceDegradation: {
    detected: boolean;
    currentAccuracy: number;
    baselineAccuracy: number;
    degradationPercent: number;
  };

  // Recommendations
  recommendations: {
    retrain: boolean;
    reason: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
  }[];

  lastChecked: Date;
}
