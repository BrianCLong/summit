/**
 * Core MLOps Platform Types
 * Comprehensive type definitions for ML model lifecycle management
 */

import { z } from 'zod';

// ============================================================================
// Model Types
// ============================================================================

export const ModelFrameworkSchema = z.enum([
  'tensorflow',
  'pytorch',
  'scikit-learn',
  'xgboost',
  'lightgbm',
  'onnx',
  'huggingface',
  'jax',
  'custom',
]);

export type ModelFramework = z.infer<typeof ModelFrameworkSchema>;

export const ModelTypeSchema = z.enum([
  'classification',
  'regression',
  'clustering',
  'anomaly-detection',
  'nlp',
  'computer-vision',
  'reinforcement-learning',
  'time-series',
  'graph-neural-network',
  'generative',
  'custom',
]);

export type ModelType = z.infer<typeof ModelTypeSchema>;

export const ModelStatusSchema = z.enum([
  'draft',
  'training',
  'validating',
  'testing',
  'staging',
  'production',
  'archived',
  'deprecated',
  'failed',
]);

export type ModelStatus = z.infer<typeof ModelStatusSchema>;

// ============================================================================
// Model Metadata
// ============================================================================

export const ModelMetadataSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  version: z.string(),
  framework: ModelFrameworkSchema,
  type: ModelTypeSchema,
  status: ModelStatusSchema,
  description: z.string().optional(),
  tags: z.array(z.string()).default([]),
  author: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),

  // Model artifacts
  artifactUri: z.string(),
  size: z.number(), // bytes
  checksum: z.string(),

  // Training info
  trainingRunId: z.string().optional(),
  trainingDataset: z.string().optional(),
  trainingConfig: z.record(z.any()).optional(),

  // Performance metrics
  metrics: z.record(z.number()).optional(),

  // Deployment info
  deployments: z.array(z.object({
    environment: z.string(),
    endpoint: z.string(),
    deployedAt: z.date(),
    status: z.string(),
  })).default([]),

  // Governance
  compliance: z.object({
    approved: z.boolean(),
    approver: z.string().optional(),
    approvedAt: z.date().optional(),
    reviewNotes: z.string().optional(),
  }).optional(),
});

export type ModelMetadata = z.infer<typeof ModelMetadataSchema>;

// ============================================================================
// Training Types
// ============================================================================

export const TrainingStatusSchema = z.enum([
  'pending',
  'running',
  'completed',
  'failed',
  'cancelled',
  'paused',
]);

export type TrainingStatus = z.infer<typeof TrainingStatusSchema>;

export const TrainingConfigSchema = z.object({
  runId: z.string().uuid(),
  modelName: z.string(),
  framework: ModelFrameworkSchema,

  // Dataset configuration
  dataset: z.object({
    name: z.string(),
    version: z.string(),
    trainPath: z.string(),
    validationPath: z.string().optional(),
    testPath: z.string().optional(),
  }),

  // Hyperparameters
  hyperparameters: z.record(z.any()),

  // Compute resources
  resources: z.object({
    gpus: z.number().default(0),
    cpus: z.number().default(1),
    memory: z.string().default('4Gi'),
    nodeSelector: z.record(z.string()).optional(),
    tolerations: z.array(z.any()).optional(),
  }),

  // Distributed training
  distributed: z.object({
    enabled: z.boolean().default(false),
    strategy: z.enum(['data-parallel', 'model-parallel', 'hybrid']).optional(),
    workers: z.number().default(1),
  }).optional(),

  // Training parameters
  batchSize: z.number(),
  epochs: z.number(),
  learningRate: z.number(),
  optimizer: z.string(),

  // Checkpointing
  checkpoint: z.object({
    enabled: z.boolean().default(true),
    frequency: z.number().default(10), // epochs
    keepBest: z.number().default(3),
  }),

  // Early stopping
  earlyStopping: z.object({
    enabled: z.boolean().default(false),
    metric: z.string(),
    patience: z.number(),
    minDelta: z.number(),
  }).optional(),

  // Experiment tracking
  experimentTags: z.array(z.string()).default([]),
  metadata: z.record(z.any()).optional(),
});

export type TrainingConfig = z.infer<typeof TrainingConfigSchema>;

export const TrainingRunSchema = z.object({
  id: z.string().uuid(),
  config: TrainingConfigSchema,
  status: TrainingStatusSchema,

  startTime: z.date().optional(),
  endTime: z.date().optional(),
  duration: z.number().optional(), // seconds

  // Metrics tracking
  metrics: z.array(z.object({
    epoch: z.number(),
    step: z.number(),
    timestamp: z.date(),
    metrics: z.record(z.number()),
  })).default([]),

  // Resource utilization
  resourceUsage: z.object({
    peakGpuMemory: z.number().optional(),
    peakCpuUsage: z.number().optional(),
    peakMemory: z.number().optional(),
    totalGpuHours: z.number().optional(),
  }).optional(),

  // Artifacts
  artifacts: z.array(z.object({
    name: z.string(),
    path: z.string(),
    type: z.string(),
    size: z.number(),
  })).default([]),

  // Error information
  error: z.object({
    message: z.string(),
    stackTrace: z.string().optional(),
    timestamp: z.date(),
  }).optional(),
});

export type TrainingRun = z.infer<typeof TrainingRunSchema>;

// ============================================================================
// Feature Store Types
// ============================================================================

export const FeatureTypeSchema = z.enum([
  'int',
  'float',
  'string',
  'boolean',
  'timestamp',
  'array',
  'embedding',
  'json',
]);

export type FeatureType = z.infer<typeof FeatureTypeSchema>;

export const FeatureSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().optional(),
  type: FeatureTypeSchema,

  // Feature group
  featureGroup: z.string(),

  // Versioning
  version: z.number(),

  // Transformation
  transformation: z.object({
    type: z.string(),
    config: z.record(z.any()),
  }).optional(),

  // Data quality
  constraints: z.array(z.object({
    type: z.string(),
    config: z.record(z.any()),
  })).default([]),

  // Statistics
  statistics: z.object({
    min: z.number().optional(),
    max: z.number().optional(),
    mean: z.number().optional(),
    stddev: z.number().optional(),
    nullCount: z.number().optional(),
    distinctCount: z.number().optional(),
  }).optional(),

  // Metadata
  tags: z.array(z.string()).default([]),
  owner: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Feature = z.infer<typeof FeatureSchema>;

export const FeatureStoreConfigSchema = z.object({
  online: z.object({
    enabled: z.boolean().default(true),
    backend: z.enum(['redis', 'dynamodb', 'cassandra', 'bigtable']),
    ttl: z.number().optional(), // seconds
    config: z.record(z.any()),
  }),

  offline: z.object({
    enabled: z.boolean().default(true),
    backend: z.enum(['s3', 'gcs', 'azure-blob', 'postgresql', 'snowflake']),
    config: z.record(z.any()),
  }),

  // Feature materialization
  materialization: z.object({
    enabled: z.boolean().default(false),
    schedule: z.string().optional(), // cron expression
    incremental: z.boolean().default(true),
  }).optional(),
});

export type FeatureStoreConfig = z.infer<typeof FeatureStoreConfigSchema>;

// ============================================================================
// Model Serving Types
// ============================================================================

export const DeploymentStrategySchema = z.enum([
  'blue-green',
  'canary',
  'shadow',
  'a-b-test',
  'rolling',
  'recreate',
]);

export type DeploymentStrategy = z.infer<typeof DeploymentStrategySchema>;

export const ServingConfigSchema = z.object({
  deploymentId: z.string().uuid(),
  modelId: z.string().uuid(),
  modelVersion: z.string(),

  // Deployment strategy
  strategy: DeploymentStrategySchema,
  strategyConfig: z.record(z.any()).optional(),

  // Environment
  environment: z.enum(['dev', 'staging', 'production']),

  // Compute resources
  resources: z.object({
    replicas: z.number().default(1),
    minReplicas: z.number().default(1),
    maxReplicas: z.number().default(10),
    cpuRequest: z.string().default('500m'),
    cpuLimit: z.string().default('2000m'),
    memoryRequest: z.string().default('1Gi'),
    memoryLimit: z.string().default('4Gi'),
    gpuRequest: z.number().default(0),
  }),

  // Auto-scaling
  autoscaling: z.object({
    enabled: z.boolean().default(false),
    metric: z.enum(['cpu', 'memory', 'requests-per-second', 'latency']),
    targetValue: z.number(),
  }).optional(),

  // Model optimization
  optimization: z.object({
    quantization: z.boolean().default(false),
    pruning: z.boolean().default(false),
    batchOptimization: z.boolean().default(true),
    accelerator: z.enum(['cpu', 'gpu', 'tpu', 'neuron']).optional(),
  }).optional(),

  // Traffic routing
  traffic: z.object({
    percentage: z.number().min(0).max(100),
    shadowMode: z.boolean().default(false),
  }),

  // Health checks
  healthCheck: z.object({
    enabled: z.boolean().default(true),
    path: z.string().default('/health'),
    interval: z.number().default(30), // seconds
    timeout: z.number().default(5),
    successThreshold: z.number().default(1),
    failureThreshold: z.number().default(3),
  }),
});

export type ServingConfig = z.infer<typeof ServingConfigSchema>;

// ============================================================================
// Model Monitoring Types
// ============================================================================

export const DriftTypeSchema = z.enum([
  'data-drift',
  'prediction-drift',
  'concept-drift',
  'feature-drift',
]);

export type DriftType = z.infer<typeof DriftTypeSchema>;

export const DriftDetectionResultSchema = z.object({
  timestamp: z.date(),
  driftType: DriftTypeSchema,
  detected: z.boolean(),
  severity: z.enum(['low', 'medium', 'high', 'critical']),

  // Statistical measures
  metrics: z.object({
    pValue: z.number().optional(),
    distance: z.number().optional(), // KL divergence, etc.
    threshold: z.number(),
  }),

  // Affected features
  affectedFeatures: z.array(z.object({
    name: z.string(),
    baseline: z.record(z.number()),
    current: z.record(z.number()),
    drift: z.number(),
  })).optional(),

  // Recommendations
  recommendations: z.array(z.string()).default([]),
});

export type DriftDetectionResult = z.infer<typeof DriftDetectionResultSchema>;

export const ModelMonitoringConfigSchema = z.object({
  modelId: z.string().uuid(),
  deploymentId: z.string().uuid(),

  // Monitoring intervals
  intervals: z.object({
    performance: z.number().default(60), // seconds
    drift: z.number().default(300),
    dataQuality: z.number().default(120),
  }),

  // Drift detection
  driftDetection: z.object({
    enabled: z.boolean().default(true),
    method: z.enum(['kolmogorov-smirnov', 'chi-squared', 'jensen-shannon', 'population-stability-index']),
    threshold: z.number(),
    windowSize: z.number(), // samples
    referenceWindow: z.number().optional(), // samples from training
  }),

  // Performance tracking
  performanceMetrics: z.array(z.string()).default(['latency', 'throughput', 'error_rate']),

  // Alerting
  alerts: z.array(z.object({
    condition: z.string(),
    threshold: z.number(),
    severity: z.enum(['info', 'warning', 'error', 'critical']),
    channels: z.array(z.string()),
  })).default([]),

  // Data retention
  retentionPeriod: z.number().default(90), // days
});

export type ModelMonitoringConfig = z.infer<typeof ModelMonitoringConfigSchema>;

// ============================================================================
// Model Explainability Types
// ============================================================================

export const ExplainabilityMethodSchema = z.enum([
  'shap',
  'lime',
  'integrated-gradients',
  'attention-weights',
  'feature-importance',
  'counterfactual',
  'anchor',
  'partial-dependence',
]);

export type ExplainabilityMethod = z.infer<typeof ExplainabilityMethodSchema>;

export const ExplanationRequestSchema = z.object({
  modelId: z.string().uuid(),
  method: ExplainabilityMethodSchema,

  // Input data
  input: z.record(z.any()),

  // Method configuration
  config: z.object({
    numSamples: z.number().optional(),
    backgroundData: z.array(z.record(z.any())).optional(),
    targetClass: z.number().optional(),
  }).optional(),
});

export type ExplanationRequest = z.infer<typeof ExplanationRequestSchema>;

export const ExplanationResultSchema = z.object({
  requestId: z.string().uuid(),
  modelId: z.string().uuid(),
  method: ExplainabilityMethodSchema,
  timestamp: z.date(),

  // Feature attributions
  featureImportance: z.array(z.object({
    feature: z.string(),
    importance: z.number(),
    direction: z.enum(['positive', 'negative', 'neutral']),
  })),

  // Global explanation
  globalInsights: z.object({
    topFeatures: z.array(z.string()),
    interactions: z.array(z.object({
      features: z.array(z.string()),
      strength: z.number(),
    })).optional(),
  }).optional(),

  // Visualization data
  visualizations: z.array(z.object({
    type: z.string(),
    data: z.record(z.any()),
  })).default([]),

  // Text explanation
  textExplanation: z.string().optional(),
});

export type ExplanationResult = z.infer<typeof ExplanationResultSchema>;

// ============================================================================
// Model Governance Types
// ============================================================================

export const ComplianceStatusSchema = z.enum([
  'compliant',
  'non-compliant',
  'pending-review',
  'exempt',
]);

export type ComplianceStatus = z.infer<typeof ComplianceStatusSchema>;

export const ModelGovernanceSchema = z.object({
  modelId: z.string().uuid(),

  // Compliance tracking
  compliance: z.object({
    status: ComplianceStatusSchema,
    frameworks: z.array(z.string()), // GDPR, CCPA, HIPAA, etc.
    lastReview: z.date().optional(),
    nextReview: z.date().optional(),
    reviewer: z.string().optional(),
  }),

  // Bias and fairness
  fairness: z.object({
    evaluated: z.boolean().default(false),
    metrics: z.record(z.number()).optional(),
    protectedAttributes: z.array(z.string()).default([]),
    mitigationStrategies: z.array(z.string()).default([]),
  }).optional(),

  // Audit trail
  auditLog: z.array(z.object({
    timestamp: z.date(),
    action: z.string(),
    actor: z.string(),
    details: z.record(z.any()),
  })).default([]),

  // Access control
  accessControl: z.object({
    owners: z.array(z.string()),
    viewers: z.array(z.string()),
    approvers: z.array(z.string()),
  }),

  // Documentation
  documentation: z.object({
    modelCard: z.string().optional(),
    datasheets: z.array(z.string()).default([]),
    ethicsReview: z.string().optional(),
  }).optional(),
});

export type ModelGovernance = z.infer<typeof ModelGovernanceSchema>;

// ============================================================================
// AutoML Types
// ============================================================================

export const AutoMLConfigSchema = z.object({
  taskType: ModelTypeSchema,
  dataset: z.object({
    trainPath: z.string(),
    validationPath: z.string().optional(),
    targetColumn: z.string(),
    featureColumns: z.array(z.string()).optional(),
  }),

  // Search space
  searchSpace: z.object({
    algorithms: z.array(z.string()).optional(),
    hyperparameters: z.record(z.object({
      type: z.enum(['categorical', 'continuous', 'discrete']),
      values: z.array(z.any()).optional(),
      min: z.number().optional(),
      max: z.number().optional(),
    })).optional(),
  }),

  // Optimization
  optimization: z.object({
    metric: z.string(),
    direction: z.enum(['maximize', 'minimize']),
    budget: z.object({
      maxTrials: z.number(),
      maxTime: z.number().optional(), // seconds
      maxCost: z.number().optional(),
    }),
  }),

  // Search strategy
  searchStrategy: z.enum(['random', 'grid', 'bayesian', 'genetic', 'hyperband']),

  // Early stopping
  earlyStopping: z.object({
    enabled: z.boolean().default(true),
    patience: z.number(),
  }).optional(),
});

export type AutoMLConfig = z.infer<typeof AutoMLConfigSchema>;

// ============================================================================
// Pipeline Types
// ============================================================================

export const PipelineStageSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  type: z.enum([
    'data-ingestion',
    'data-validation',
    'data-preprocessing',
    'feature-engineering',
    'training',
    'evaluation',
    'model-validation',
    'deployment',
    'monitoring',
  ]),
  config: z.record(z.any()),
  dependencies: z.array(z.string()).default([]), // stage IDs

  // Execution
  status: z.enum(['pending', 'running', 'completed', 'failed', 'skipped']).optional(),
  startTime: z.date().optional(),
  endTime: z.date().optional(),
  error: z.string().optional(),

  // Artifacts
  inputs: z.array(z.string()).default([]),
  outputs: z.array(z.string()).default([]),
});

export type PipelineStage = z.infer<typeof PipelineStageSchema>;

export const MLPipelineSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().optional(),
  version: z.string(),

  // Stages
  stages: z.array(PipelineStageSchema),

  // Execution
  status: z.enum(['draft', 'active', 'paused', 'completed', 'failed']),

  // Schedule
  schedule: z.object({
    enabled: z.boolean().default(false),
    cron: z.string().optional(),
    timezone: z.string().default('UTC'),
  }).optional(),

  // Triggers
  triggers: z.array(z.object({
    type: z.enum(['manual', 'scheduled', 'event', 'performance-degradation']),
    config: z.record(z.any()),
  })).default([]),

  // Metadata
  tags: z.array(z.string()).default([]),
  owner: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type MLPipeline = z.infer<typeof MLPipelineSchema>;

// Export all schemas
export const MLOpsSchemas = {
  ModelFramework: ModelFrameworkSchema,
  ModelType: ModelTypeSchema,
  ModelStatus: ModelStatusSchema,
  ModelMetadata: ModelMetadataSchema,
  TrainingStatus: TrainingStatusSchema,
  TrainingConfig: TrainingConfigSchema,
  TrainingRun: TrainingRunSchema,
  FeatureType: FeatureTypeSchema,
  Feature: FeatureSchema,
  FeatureStoreConfig: FeatureStoreConfigSchema,
  DeploymentStrategy: DeploymentStrategySchema,
  ServingConfig: ServingConfigSchema,
  DriftType: DriftTypeSchema,
  DriftDetectionResult: DriftDetectionResultSchema,
  ModelMonitoringConfig: ModelMonitoringConfigSchema,
  ExplainabilityMethod: ExplainabilityMethodSchema,
  ExplanationRequest: ExplanationRequestSchema,
  ExplanationResult: ExplanationResultSchema,
  ComplianceStatus: ComplianceStatusSchema,
  ModelGovernance: ModelGovernanceSchema,
  AutoMLConfig: AutoMLConfigSchema,
  PipelineStage: PipelineStageSchema,
  MLPipeline: MLPipelineSchema,
};
