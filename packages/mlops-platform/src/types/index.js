"use strict";
/**
 * Core MLOps Platform Types
 * Comprehensive type definitions for ML model lifecycle management
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MLOpsSchemas = exports.MLPipelineSchema = exports.PipelineStageSchema = exports.AutoMLConfigSchema = exports.ModelGovernanceSchema = exports.ComplianceStatusSchema = exports.ExplanationResultSchema = exports.ExplanationRequestSchema = exports.ExplainabilityMethodSchema = exports.ModelMonitoringConfigSchema = exports.DriftDetectionResultSchema = exports.DriftTypeSchema = exports.ServingConfigSchema = exports.DeploymentStrategySchema = exports.FeatureStoreConfigSchema = exports.FeatureSchema = exports.FeatureTypeSchema = exports.TrainingRunSchema = exports.TrainingConfigSchema = exports.TrainingStatusSchema = exports.ModelMetadataSchema = exports.ModelStatusSchema = exports.ModelTypeSchema = exports.ModelFrameworkSchema = void 0;
const zod_1 = require("zod");
// ============================================================================
// Model Types
// ============================================================================
exports.ModelFrameworkSchema = zod_1.z.enum([
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
exports.ModelTypeSchema = zod_1.z.enum([
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
exports.ModelStatusSchema = zod_1.z.enum([
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
// ============================================================================
// Model Metadata
// ============================================================================
exports.ModelMetadataSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    name: zod_1.z.string(),
    version: zod_1.z.string(),
    framework: exports.ModelFrameworkSchema,
    type: exports.ModelTypeSchema,
    status: exports.ModelStatusSchema,
    description: zod_1.z.string().optional(),
    tags: zod_1.z.array(zod_1.z.string()).default([]),
    author: zod_1.z.string(),
    createdAt: zod_1.z.date(),
    updatedAt: zod_1.z.date(),
    // Model artifacts
    artifactUri: zod_1.z.string(),
    size: zod_1.z.number(), // bytes
    checksum: zod_1.z.string(),
    // Training info
    trainingRunId: zod_1.z.string().optional(),
    trainingDataset: zod_1.z.string().optional(),
    trainingConfig: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).optional(),
    // Performance metrics
    metrics: zod_1.z.record(zod_1.z.string(), zod_1.z.number()).optional(),
    // Deployment info
    deployments: zod_1.z.array(zod_1.z.object({
        environment: zod_1.z.string(),
        endpoint: zod_1.z.string(),
        deployedAt: zod_1.z.date(),
        status: zod_1.z.string(),
    })).default([]),
    // Governance
    compliance: zod_1.z.object({
        approved: zod_1.z.boolean(),
        approver: zod_1.z.string().optional(),
        approvedAt: zod_1.z.date().optional(),
        reviewNotes: zod_1.z.string().optional(),
    }).optional(),
});
// ============================================================================
// Training Types
// ============================================================================
exports.TrainingStatusSchema = zod_1.z.enum([
    'pending',
    'running',
    'completed',
    'failed',
    'cancelled',
    'paused',
]);
exports.TrainingConfigSchema = zod_1.z.object({
    runId: zod_1.z.string().uuid(),
    modelName: zod_1.z.string(),
    framework: exports.ModelFrameworkSchema,
    // Dataset configuration
    dataset: zod_1.z.object({
        name: zod_1.z.string(),
        version: zod_1.z.string(),
        trainPath: zod_1.z.string(),
        validationPath: zod_1.z.string().optional(),
        testPath: zod_1.z.string().optional(),
    }),
    // Hyperparameters
    hyperparameters: zod_1.z.record(zod_1.z.string(), zod_1.z.any()),
    // Compute resources
    resources: zod_1.z.object({
        gpus: zod_1.z.number().default(0),
        cpus: zod_1.z.number().default(1),
        memory: zod_1.z.string().default('4Gi'),
        nodeSelector: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).optional(),
        tolerations: zod_1.z.array(zod_1.z.any()).optional(),
    }),
    // Distributed training
    distributed: zod_1.z.object({
        enabled: zod_1.z.boolean().default(false),
        strategy: zod_1.z.enum(['data-parallel', 'model-parallel', 'hybrid']).optional(),
        workers: zod_1.z.number().default(1),
    }).optional(),
    // Training parameters
    batchSize: zod_1.z.number(),
    epochs: zod_1.z.number(),
    learningRate: zod_1.z.number(),
    optimizer: zod_1.z.string(),
    // Checkpointing
    checkpoint: zod_1.z.object({
        enabled: zod_1.z.boolean().default(true),
        frequency: zod_1.z.number().default(10), // epochs
        keepBest: zod_1.z.number().default(3),
    }),
    // Early stopping
    earlyStopping: zod_1.z.object({
        enabled: zod_1.z.boolean().default(false),
        metric: zod_1.z.string(),
        patience: zod_1.z.number(),
        minDelta: zod_1.z.number(),
    }).optional(),
    // Experiment tracking
    experimentTags: zod_1.z.array(zod_1.z.string()).default([]),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).optional(),
});
exports.TrainingRunSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    config: exports.TrainingConfigSchema,
    status: exports.TrainingStatusSchema,
    startTime: zod_1.z.date().optional(),
    endTime: zod_1.z.date().optional(),
    duration: zod_1.z.number().optional(), // seconds
    // Metrics tracking
    metrics: zod_1.z.array(zod_1.z.object({
        epoch: zod_1.z.number(),
        step: zod_1.z.number(),
        timestamp: zod_1.z.date(),
        metrics: zod_1.z.record(zod_1.z.string(), zod_1.z.number()),
    })).default([]),
    // Resource utilization
    resourceUsage: zod_1.z.object({
        peakGpuMemory: zod_1.z.number().optional(),
        peakCpuUsage: zod_1.z.number().optional(),
        peakMemory: zod_1.z.number().optional(),
        totalGpuHours: zod_1.z.number().optional(),
    }).optional(),
    // Artifacts
    artifacts: zod_1.z.array(zod_1.z.object({
        name: zod_1.z.string(),
        path: zod_1.z.string(),
        type: zod_1.z.string(),
        size: zod_1.z.number(),
    })).default([]),
    // Error information
    error: zod_1.z.object({
        message: zod_1.z.string(),
        stackTrace: zod_1.z.string().optional(),
        timestamp: zod_1.z.date(),
    }).optional(),
});
// ============================================================================
// Feature Store Types
// ============================================================================
exports.FeatureTypeSchema = zod_1.z.enum([
    'int',
    'float',
    'string',
    'boolean',
    'timestamp',
    'array',
    'embedding',
    'json',
]);
exports.FeatureSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    name: zod_1.z.string(),
    description: zod_1.z.string().optional(),
    type: exports.FeatureTypeSchema,
    // Feature group
    featureGroup: zod_1.z.string(),
    // Versioning
    version: zod_1.z.number(),
    // Transformation
    transformation: zod_1.z.object({
        type: zod_1.z.string(),
        config: zod_1.z.record(zod_1.z.string(), zod_1.z.any()),
    }).optional(),
    // Data quality
    constraints: zod_1.z.array(zod_1.z.object({
        type: zod_1.z.string(),
        config: zod_1.z.record(zod_1.z.string(), zod_1.z.any()),
    })).default([]),
    // Statistics
    statistics: zod_1.z.object({
        min: zod_1.z.number().optional(),
        max: zod_1.z.number().optional(),
        mean: zod_1.z.number().optional(),
        stddev: zod_1.z.number().optional(),
        nullCount: zod_1.z.number().optional(),
        distinctCount: zod_1.z.number().optional(),
    }).optional(),
    // Metadata
    tags: zod_1.z.array(zod_1.z.string()).default([]),
    owner: zod_1.z.string(),
    createdAt: zod_1.z.date(),
    updatedAt: zod_1.z.date(),
});
exports.FeatureStoreConfigSchema = zod_1.z.object({
    online: zod_1.z.object({
        enabled: zod_1.z.boolean().default(true),
        backend: zod_1.z.enum(['redis', 'dynamodb', 'cassandra', 'bigtable']),
        ttl: zod_1.z.number().optional(), // seconds
        config: zod_1.z.record(zod_1.z.string(), zod_1.z.any()),
    }),
    offline: zod_1.z.object({
        enabled: zod_1.z.boolean().default(true),
        backend: zod_1.z.enum(['s3', 'gcs', 'azure-blob', 'postgresql', 'snowflake']),
        config: zod_1.z.record(zod_1.z.string(), zod_1.z.any()),
    }),
    // Feature materialization
    materialization: zod_1.z.object({
        enabled: zod_1.z.boolean().default(false),
        schedule: zod_1.z.string().optional(), // cron expression
        incremental: zod_1.z.boolean().default(true),
    }).optional(),
});
// ============================================================================
// Model Serving Types
// ============================================================================
exports.DeploymentStrategySchema = zod_1.z.enum([
    'blue-green',
    'canary',
    'shadow',
    'a-b-test',
    'rolling',
    'recreate',
]);
exports.ServingConfigSchema = zod_1.z.object({
    deploymentId: zod_1.z.string().uuid(),
    modelId: zod_1.z.string().uuid(),
    modelVersion: zod_1.z.string(),
    // Deployment strategy
    strategy: exports.DeploymentStrategySchema,
    strategyConfig: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).optional(),
    // Environment
    environment: zod_1.z.enum(['dev', 'staging', 'production']),
    // Compute resources
    resources: zod_1.z.object({
        replicas: zod_1.z.number().default(1),
        minReplicas: zod_1.z.number().default(1),
        maxReplicas: zod_1.z.number().default(10),
        cpuRequest: zod_1.z.string().default('500m'),
        cpuLimit: zod_1.z.string().default('2000m'),
        memoryRequest: zod_1.z.string().default('1Gi'),
        memoryLimit: zod_1.z.string().default('4Gi'),
        gpuRequest: zod_1.z.number().default(0),
    }),
    // Auto-scaling
    autoscaling: zod_1.z.object({
        enabled: zod_1.z.boolean().default(false),
        metric: zod_1.z.enum(['cpu', 'memory', 'requests-per-second', 'latency']),
        targetValue: zod_1.z.number(),
    }).optional(),
    // Model optimization
    optimization: zod_1.z.object({
        quantization: zod_1.z.boolean().default(false),
        pruning: zod_1.z.boolean().default(false),
        batchOptimization: zod_1.z.boolean().default(true),
        accelerator: zod_1.z.enum(['cpu', 'gpu', 'tpu', 'neuron']).optional(),
    }).optional(),
    // Traffic routing
    traffic: zod_1.z.object({
        percentage: zod_1.z.number().min(0).max(100),
        shadowMode: zod_1.z.boolean().default(false),
    }),
    // Health checks
    healthCheck: zod_1.z.object({
        enabled: zod_1.z.boolean().default(true),
        path: zod_1.z.string().default('/health'),
        interval: zod_1.z.number().default(30), // seconds
        timeout: zod_1.z.number().default(5),
        successThreshold: zod_1.z.number().default(1),
        failureThreshold: zod_1.z.number().default(3),
    }),
});
// ============================================================================
// Model Monitoring Types
// ============================================================================
exports.DriftTypeSchema = zod_1.z.enum([
    'data-drift',
    'prediction-drift',
    'concept-drift',
    'feature-drift',
]);
exports.DriftDetectionResultSchema = zod_1.z.object({
    timestamp: zod_1.z.date(),
    driftType: exports.DriftTypeSchema,
    detected: zod_1.z.boolean(),
    severity: zod_1.z.enum(['low', 'medium', 'high', 'critical']),
    // Statistical measures
    metrics: zod_1.z.object({
        pValue: zod_1.z.number().optional(),
        distance: zod_1.z.number().optional(), // KL divergence, etc.
        threshold: zod_1.z.number(),
    }),
    // Affected features
    affectedFeatures: zod_1.z.array(zod_1.z.object({
        name: zod_1.z.string(),
        baseline: zod_1.z.record(zod_1.z.string(), zod_1.z.number()),
        current: zod_1.z.record(zod_1.z.string(), zod_1.z.number()),
        drift: zod_1.z.number(),
    })).optional(),
    // Recommendations
    recommendations: zod_1.z.array(zod_1.z.string()).default([]),
});
exports.ModelMonitoringConfigSchema = zod_1.z.object({
    modelId: zod_1.z.string().uuid(),
    deploymentId: zod_1.z.string().uuid(),
    // Monitoring intervals
    intervals: zod_1.z.object({
        performance: zod_1.z.number().default(60), // seconds
        drift: zod_1.z.number().default(300),
        dataQuality: zod_1.z.number().default(120),
    }),
    // Drift detection
    driftDetection: zod_1.z.object({
        enabled: zod_1.z.boolean().default(true),
        method: zod_1.z.enum(['kolmogorov-smirnov', 'chi-squared', 'jensen-shannon', 'population-stability-index']),
        threshold: zod_1.z.number(),
        windowSize: zod_1.z.number(), // samples
        referenceWindow: zod_1.z.number().optional(), // samples from training
    }),
    // Performance tracking
    performanceMetrics: zod_1.z.array(zod_1.z.string()).default(['latency', 'throughput', 'error_rate']),
    // Alerting
    alerts: zod_1.z.array(zod_1.z.object({
        condition: zod_1.z.string(),
        threshold: zod_1.z.number(),
        severity: zod_1.z.enum(['info', 'warning', 'error', 'critical']),
        channels: zod_1.z.array(zod_1.z.string()),
    })).default([]),
    // Data retention
    retentionPeriod: zod_1.z.number().default(90), // days
});
// ============================================================================
// Model Explainability Types
// ============================================================================
exports.ExplainabilityMethodSchema = zod_1.z.enum([
    'shap',
    'lime',
    'integrated-gradients',
    'attention-weights',
    'feature-importance',
    'counterfactual',
    'anchor',
    'partial-dependence',
]);
exports.ExplanationRequestSchema = zod_1.z.object({
    modelId: zod_1.z.string().uuid(),
    method: exports.ExplainabilityMethodSchema,
    // Input data
    input: zod_1.z.record(zod_1.z.string(), zod_1.z.any()),
    // Method configuration
    config: zod_1.z.object({
        numSamples: zod_1.z.number().optional(),
        backgroundData: zod_1.z.array(zod_1.z.record(zod_1.z.string(), zod_1.z.any())).optional(),
        targetClass: zod_1.z.number().optional(),
    }).optional(),
});
exports.ExplanationResultSchema = zod_1.z.object({
    requestId: zod_1.z.string().uuid(),
    modelId: zod_1.z.string().uuid(),
    method: exports.ExplainabilityMethodSchema,
    timestamp: zod_1.z.date(),
    // Feature attributions
    featureImportance: zod_1.z.array(zod_1.z.object({
        feature: zod_1.z.string(),
        importance: zod_1.z.number(),
        direction: zod_1.z.enum(['positive', 'negative', 'neutral']),
    })),
    // Global explanation
    globalInsights: zod_1.z.object({
        topFeatures: zod_1.z.array(zod_1.z.string()),
        interactions: zod_1.z.array(zod_1.z.object({
            features: zod_1.z.array(zod_1.z.string()),
            strength: zod_1.z.number(),
        })).optional(),
    }).optional(),
    // Visualization data
    visualizations: zod_1.z.array(zod_1.z.object({
        type: zod_1.z.string(),
        data: zod_1.z.record(zod_1.z.string(), zod_1.z.any()),
    })).default([]),
    // Text explanation
    textExplanation: zod_1.z.string().optional(),
});
// ============================================================================
// Model Governance Types
// ============================================================================
exports.ComplianceStatusSchema = zod_1.z.enum([
    'compliant',
    'non-compliant',
    'pending-review',
    'exempt',
]);
exports.ModelGovernanceSchema = zod_1.z.object({
    modelId: zod_1.z.string().uuid(),
    // Compliance tracking
    compliance: zod_1.z.object({
        status: exports.ComplianceStatusSchema,
        frameworks: zod_1.z.array(zod_1.z.string()), // GDPR, CCPA, HIPAA, etc.
        lastReview: zod_1.z.date().optional(),
        nextReview: zod_1.z.date().optional(),
        reviewer: zod_1.z.string().optional(),
    }),
    // Bias and fairness
    fairness: zod_1.z.object({
        evaluated: zod_1.z.boolean().default(false),
        metrics: zod_1.z.record(zod_1.z.string(), zod_1.z.number()).optional(),
        protectedAttributes: zod_1.z.array(zod_1.z.string()).default([]),
        mitigationStrategies: zod_1.z.array(zod_1.z.string()).default([]),
    }).optional(),
    // Audit trail
    auditLog: zod_1.z.array(zod_1.z.object({
        timestamp: zod_1.z.date(),
        action: zod_1.z.string(),
        actor: zod_1.z.string(),
        details: zod_1.z.record(zod_1.z.string(), zod_1.z.any()),
    })).default([]),
    // Access control
    accessControl: zod_1.z.object({
        owners: zod_1.z.array(zod_1.z.string()),
        viewers: zod_1.z.array(zod_1.z.string()),
        approvers: zod_1.z.array(zod_1.z.string()),
    }),
    // Documentation
    documentation: zod_1.z.object({
        modelCard: zod_1.z.string().optional(),
        datasheets: zod_1.z.array(zod_1.z.string()).default([]),
        ethicsReview: zod_1.z.string().optional(),
    }).optional(),
});
// ============================================================================
// AutoML Types
// ============================================================================
exports.AutoMLConfigSchema = zod_1.z.object({
    taskType: exports.ModelTypeSchema,
    dataset: zod_1.z.object({
        trainPath: zod_1.z.string(),
        validationPath: zod_1.z.string().optional(),
        targetColumn: zod_1.z.string(),
        featureColumns: zod_1.z.array(zod_1.z.string()).optional(),
    }),
    // Search space
    searchSpace: zod_1.z.object({
        algorithms: zod_1.z.array(zod_1.z.string()).optional(),
        hyperparameters: zod_1.z.record(zod_1.z.string(), zod_1.z.object({
            type: zod_1.z.enum(['categorical', 'continuous', 'discrete']),
            values: zod_1.z.array(zod_1.z.any()).optional(),
            min: zod_1.z.number().optional(),
            max: zod_1.z.number().optional(),
        })).optional(),
    }),
    // Optimization
    optimization: zod_1.z.object({
        metric: zod_1.z.string(),
        direction: zod_1.z.enum(['maximize', 'minimize']),
        budget: zod_1.z.object({
            maxTrials: zod_1.z.number(),
            maxTime: zod_1.z.number().optional(), // seconds
            maxCost: zod_1.z.number().optional(),
        }),
    }),
    // Search strategy
    searchStrategy: zod_1.z.enum(['random', 'grid', 'bayesian', 'genetic', 'hyperband']),
    // Early stopping
    earlyStopping: zod_1.z.object({
        enabled: zod_1.z.boolean().default(true),
        patience: zod_1.z.number(),
    }).optional(),
});
// ============================================================================
// Pipeline Types
// ============================================================================
exports.PipelineStageSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    name: zod_1.z.string(),
    type: zod_1.z.enum([
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
    config: zod_1.z.record(zod_1.z.string(), zod_1.z.any()),
    dependencies: zod_1.z.array(zod_1.z.string()).default([]), // stage IDs
    // Execution
    status: zod_1.z.enum(['pending', 'running', 'completed', 'failed', 'skipped']).optional(),
    startTime: zod_1.z.date().optional(),
    endTime: zod_1.z.date().optional(),
    error: zod_1.z.string().optional(),
    // Artifacts
    inputs: zod_1.z.array(zod_1.z.string()).default([]),
    outputs: zod_1.z.array(zod_1.z.string()).default([]),
});
exports.MLPipelineSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    name: zod_1.z.string(),
    description: zod_1.z.string().optional(),
    version: zod_1.z.string(),
    // Stages
    stages: zod_1.z.array(exports.PipelineStageSchema),
    // Execution
    status: zod_1.z.enum(['draft', 'active', 'paused', 'completed', 'failed']),
    // Schedule
    schedule: zod_1.z.object({
        enabled: zod_1.z.boolean().default(false),
        cron: zod_1.z.string().optional(),
        timezone: zod_1.z.string().default('UTC'),
    }).optional(),
    // Triggers
    triggers: zod_1.z.array(zod_1.z.object({
        type: zod_1.z.enum(['manual', 'scheduled', 'event', 'performance-degradation']),
        config: zod_1.z.record(zod_1.z.string(), zod_1.z.any()),
    })).default([]),
    // Metadata
    tags: zod_1.z.array(zod_1.z.string()).default([]),
    owner: zod_1.z.string(),
    createdAt: zod_1.z.date(),
    updatedAt: zod_1.z.date(),
});
// Export all schemas
exports.MLOpsSchemas = {
    ModelFramework: exports.ModelFrameworkSchema,
    ModelType: exports.ModelTypeSchema,
    ModelStatus: exports.ModelStatusSchema,
    ModelMetadata: exports.ModelMetadataSchema,
    TrainingStatus: exports.TrainingStatusSchema,
    TrainingConfig: exports.TrainingConfigSchema,
    TrainingRun: exports.TrainingRunSchema,
    FeatureType: exports.FeatureTypeSchema,
    Feature: exports.FeatureSchema,
    FeatureStoreConfig: exports.FeatureStoreConfigSchema,
    DeploymentStrategy: exports.DeploymentStrategySchema,
    ServingConfig: exports.ServingConfigSchema,
    DriftType: exports.DriftTypeSchema,
    DriftDetectionResult: exports.DriftDetectionResultSchema,
    ModelMonitoringConfig: exports.ModelMonitoringConfigSchema,
    ExplainabilityMethod: exports.ExplainabilityMethodSchema,
    ExplanationRequest: exports.ExplanationRequestSchema,
    ExplanationResult: exports.ExplanationResultSchema,
    ComplianceStatus: exports.ComplianceStatusSchema,
    ModelGovernance: exports.ModelGovernanceSchema,
    AutoMLConfig: exports.AutoMLConfigSchema,
    PipelineStage: exports.PipelineStageSchema,
    MLPipeline: exports.MLPipelineSchema,
};
