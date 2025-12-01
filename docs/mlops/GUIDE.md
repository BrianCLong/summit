# MLOps Platform Guide

## Overview

The IntelGraph MLOps Platform provides comprehensive machine learning operations capabilities for training, deploying, monitoring, and managing ML models at scale.

## Features

### 1. Model Development and Training

#### Distributed Training

```typescript
import { TrainingOrchestrator, TrainingConfig } from '@intelgraph/mlops-platform';

const orchestrator = new TrainingOrchestrator();

const config: TrainingConfig = {
  runId: 'train-001',
  modelName: 'fraud-detector',
  framework: 'pytorch',
  dataset: {
    name: 'fraud-dataset-v1',
    version: '1.0.0',
    trainPath: 's3://data/train.parquet',
    validationPath: 's3://data/val.parquet',
  },
  hyperparameters: {
    hidden_size: 256,
    num_layers: 3,
    dropout: 0.2,
  },
  resources: {
    gpus: 4,
    cpus: 16,
    memory: '32Gi',
  },
  distributed: {
    enabled: true,
    strategy: 'data-parallel',
    workers: 4,
  },
  batchSize: 128,
  epochs: 50,
  learningRate: 0.001,
  optimizer: 'adam',
  checkpoint: {
    enabled: true,
    frequency: 5,
    keepBest: 3,
  },
  earlyStopping: {
    enabled: true,
    metric: 'val_loss',
    patience: 10,
    minDelta: 0.001,
  },
  experimentTags: ['production', 'fraud-detection'],
};

const jobId = await orchestrator.submitTraining(config);
console.log(`Training job submitted: ${jobId}`);
```

#### Experiment Tracking

```typescript
// Monitor training progress
orchestrator.on('metrics:logged', ({ runId, metrics }) => {
  console.log(`Epoch ${metrics.epoch}: loss=${metrics.metrics.loss}`);
});

// Get training run details
const run = await orchestrator.getTrainingRun(jobId);
console.log(`Status: ${run.status}`);
console.log(`Metrics:`, run.metrics);
```

#### AutoML

```typescript
import { AutoMLEngine, AutoMLConfig } from '@intelgraph/training-orchestration';

const automlConfig: AutoMLConfig = {
  taskType: 'classification',
  dataset: {
    trainPath: 's3://data/train.csv',
    targetColumn: 'label',
  },
  searchSpace: {
    algorithms: ['xgboost', 'lightgbm', 'random-forest'],
    hyperparameters: {
      learning_rate: {
        type: 'continuous',
        min: 0.001,
        max: 0.1,
      },
      max_depth: {
        type: 'discrete',
        min: 3,
        max: 10,
      },
    },
  },
  optimization: {
    metric: 'f1_score',
    direction: 'maximize',
    budget: {
      maxTrials: 100,
      maxTime: 3600,
    },
  },
  searchStrategy: 'bayesian',
};

const automl = new AutoMLEngine(automlConfig);
const result = await automl.run();
console.log(`Best trial: ${result.bestTrial.id}`);
console.log(`Best score: ${result.bestTrial.score}`);
```

### 2. Model Registry

```typescript
import { ModelRegistry } from '@intelgraph/mlops-platform';

const registry = new ModelRegistry({
  backend: 'postgresql',
  connectionString: process.env.DATABASE_URL,
  artifactStore: {
    type: 's3',
    bucket: 'my-models',
  },
});

// Register a model
const model = await registry.registerModel({
  name: 'fraud-detector',
  version: '1.0.0',
  framework: 'pytorch',
  type: 'classification',
  status: 'staging',
  description: 'Transaction fraud detection model',
  tags: ['production', 'fraud'],
  author: 'ml-team',
  artifactUri: 's3://my-models/fraud-detector-v1.0.0.pth',
  size: 104857600,
  checksum: 'sha256:abc123...',
  metrics: {
    accuracy: 0.95,
    precision: 0.93,
    recall: 0.94,
    f1_score: 0.935,
  },
});

// Get model
const retrievedModel = await registry.getModel(model.id);

// List versions
const versions = await registry.listModelVersions('fraud-detector');

// Search models
const prodModels = await registry.searchModels({
  status: 'production',
  tags: ['fraud'],
});

// Compare versions
const comparison = await registry.compareVersions(version1Id, version2Id);
console.log('Metric differences:', comparison.metricsDiff);
```

### 3. Feature Store

```typescript
import { FeatureStore } from '@intelgraph/mlops-platform';

const featureStore = new FeatureStore({
  online: {
    enabled: true,
    backend: 'redis',
    ttl: 3600,
    config: {
      host: 'localhost',
      port: 6379,
    },
  },
  offline: {
    enabled: true,
    backend: 's3',
    config: {
      bucket: 'feature-store',
    },
  },
});

// Register features
const feature = await featureStore.registerFeature({
  name: 'transaction_amount',
  description: 'Transaction amount in USD',
  type: 'float',
  featureGroup: 'transaction_features',
  version: 1,
  owner: 'data-team',
  constraints: [
    {
      type: 'range',
      config: { min: 0, max: 1000000 },
    },
  ],
});

// Write features
await featureStore.batchWrite([
  {
    entityId: 'user-123',
    features: {
      transaction_amount: 150.50,
      transaction_count: 5,
      avg_transaction_amount: 120.00,
    },
  },
]);

// Read features
const vectors = await featureStore.batchRead(
  ['user-123', 'user-456'],
  [featureId1, featureId2]
);

// Point-in-time query for training
const historicalFeatures = await featureStore.pointInTimeQuery({
  entityIds: ['user-123'],
  featureNames: ['transaction_amount', 'transaction_count'],
  timestamp: new Date('2024-01-01'),
});
```

### 4. Model Serving

```typescript
import { ModelServer } from '@intelgraph/model-serving';

const server = new ModelServer();

// Deploy with canary strategy
const deployment = await server.deploy({
  deploymentId: 'fraud-detector-v2',
  modelId: 'fraud-model-123',
  modelVersion: '2.0.0',
  strategy: 'canary',
  strategyConfig: {
    canaryPercentage: 10,
  },
  environment: 'production',
  resources: {
    replicas: 3,
    minReplicas: 2,
    maxReplicas: 10,
    cpuRequest: '1000m',
    memoryRequest: '2Gi',
    gpuRequest: 1,
  },
  autoscaling: {
    enabled: true,
    metric: 'requests-per-second',
    targetValue: 100,
  },
  traffic: {
    percentage: 10,
    shadowMode: false,
  },
});

// Make predictions
const prediction = await server.predict({
  modelId: 'fraud-model-123',
  input: {
    amount: 150.50,
    merchant_category: 'retail',
    time_of_day: 14,
    location_distance: 5.2,
  },
  options: {
    timeout: 5000,
    explainability: true,
  },
});

console.log('Prediction:', prediction.output);
console.log('Latency:', prediction.latency, 'ms');

// A/B Testing
await server.updateTrafficSplit([
  { deploymentId: 'model-v1', percentage: 50 },
  { deploymentId: 'model-v2', percentage: 50 },
]);

// Scale deployment
await server.scale('fraud-detector-v2', 5);

// Auto-scaling
await server.autoScale('fraud-detector-v2');
```

### 5. Model Monitoring

```typescript
import { DriftDetector } from '@intelgraph/model-monitoring';

const driftDetector = new DriftDetector({
  modelId: 'fraud-model-123',
  deploymentId: 'fraud-detector-v2',
  intervals: {
    performance: 60,
    drift: 300,
    dataQuality: 120,
  },
  driftDetection: {
    enabled: true,
    method: 'kolmogorov-smirnov',
    threshold: 0.05,
    windowSize: 1000,
  },
  performanceMetrics: ['latency', 'throughput', 'error_rate'],
  alerts: [
    {
      condition: 'drift_detected',
      threshold: 0.1,
      severity: 'warning',
      channels: ['slack', 'email'],
    },
  ],
});

// Set baseline data
await driftDetector.setReferenceData(trainingDataSamples);

// Monitor production data
driftDetector.on('drift:detected', (result) => {
  console.log(`Drift detected! Type: ${result.driftType}`);
  console.log(`Severity: ${result.severity}`);
  console.log(`Recommendations:`, result.recommendations);
});

// Add production samples
for (const sample of productionData) {
  await driftDetector.addSample({
    features: sample.features,
    prediction: sample.prediction,
    actual: sample.actual,
    timestamp: new Date(),
  });
}

// Get drift history
const history = await driftDetector.getDriftHistory('data-drift');
```

### 6. Model Explainability

```typescript
import { ExplainabilityEngine } from '@intelgraph/model-explainability';

const explainer = new ExplainabilityEngine();

// SHAP explanation
const shapExplanation = await explainer.explain({
  modelId: 'fraud-model-123',
  method: 'shap',
  input: {
    amount: 500,
    merchant_category: 'electronics',
    time_of_day: 23,
    location_distance: 100,
  },
  config: {
    numSamples: 1000,
  },
});

console.log('Feature importance:', shapExplanation.featureImportance);
console.log('Explanation:', shapExplanation.textExplanation);

// LIME explanation
const limeExplanation = await explainer.explain({
  modelId: 'fraud-model-123',
  method: 'lime',
  input: transactionData,
});

// Global explanation
const globalExplanation = await explainer.getGlobalExplanation('fraud-model-123');
console.log('Top features:', globalExplanation.topFeatures);
console.log('Feature interactions:', globalExplanation.interactions);

// Bias detection
const biasAnalysis = await explainer.detectBias(
  'fraud-model-123',
  'customer_location',
  predictions
);

if (biasAnalysis.biasDetected) {
  console.log('Bias detected!');
  console.log('Disparate impact:', biasAnalysis.metrics.disparateImpact);
  console.log('Recommendations:', biasAnalysis.recommendations);
}
```

### 7. MLOps Service API

```bash
# Register a model
curl -X POST http://localhost:8080/api/v1/models \
  -H "Content-Type: application/json" \
  -d '{
    "name": "fraud-detector",
    "version": "1.0.0",
    "framework": "pytorch",
    "type": "classification"
  }'

# Submit training job
curl -X POST http://localhost:8080/api/v1/training/submit \
  -H "Content-Type: application/json" \
  -d @training-config.json

# Deploy model
curl -X POST http://localhost:8080/api/v1/deployments \
  -H "Content-Type: application/json" \
  -d @deployment-config.json

# Make prediction
curl -X POST http://localhost:8080/api/v1/predict \
  -H "Content-Type: application/json" \
  -d '{
    "modelId": "fraud-model-123",
    "input": {
      "amount": 150.50,
      "merchant_category": "retail"
    }
  }'

# Get explanation
curl -X POST http://localhost:8080/api/v1/explain \
  -H "Content-Type: application/json" \
  -d '{
    "modelId": "fraud-model-123",
    "method": "shap",
    "input": {...}
  }'
```

## Architecture

### Components

1. **MLOps Platform Core** - Central types and interfaces
2. **Training Orchestration** - Distributed training and AutoML
3. **Model Registry** - Model versioning and metadata
4. **Feature Store** - Online/offline feature management
5. **Model Serving** - Multi-strategy deployment
6. **Model Monitoring** - Drift detection and performance tracking
7. **Model Explainability** - XAI methods (SHAP, LIME, etc.)

### Services

- **MLOps Service** - Main API gateway (port 8080)
- **Model Registry Service** - Dedicated registry API (port 8081)

## Best Practices

### 1. Model Versioning

- Use semantic versioning (major.minor.patch)
- Tag models with meaningful labels
- Track lineage and dependencies
- Document model cards

### 2. Feature Engineering

- Register all features in the feature store
- Use point-in-time correctness for training
- Monitor feature drift
- Document feature transformations

### 3. Model Deployment

- Start with canary deployments
- Monitor performance metrics
- Set up alerting
- Have rollback procedures

### 4. Monitoring

- Set appropriate drift thresholds
- Monitor both data and concept drift
- Track prediction quality
- Set up automated alerts

### 5. Governance

- Document all models
- Track compliance requirements
- Monitor for bias
- Maintain audit trails

## Next Steps

- Explore [Best Practices](./BEST_PRACTICES.md)
- Review API documentation
- Set up CI/CD pipelines
- Configure monitoring dashboards
