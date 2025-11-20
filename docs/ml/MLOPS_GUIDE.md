# MLOps Guide

Complete guide to the IntelGraph ML Model Registry and MLOps Platform.

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Components](#components)
4. [Getting Started](#getting-started)
5. [Model Lifecycle](#model-lifecycle)
6. [Training Pipeline](#training-pipeline)
7. [Model Serving](#model-serving)
8. [Monitoring & Drift Detection](#monitoring--drift-detection)
9. [Feature Store](#feature-store)
10. [Best Practices](#best-practices)

## Overview

The IntelGraph MLOps platform provides enterprise-grade machine learning operations infrastructure with:

- **Model Registry**: Centralized model versioning, metadata, and artifact storage
- **Feature Store**: Online/offline feature serving with versioning
- **Training Pipeline**: Automated training with hyperparameter tuning
- **Model Serving**: REST API, batch, and streaming inference
- **Monitoring**: Drift detection, data quality, and performance tracking
- **Governance**: Approval workflows, model cards, and compliance documentation

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     MLOps Platform                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │   Training   │  │   Feature    │  │    Model     │    │
│  │   Service    │──│    Store     │──│   Registry   │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
│         │                 │                   │            │
│         │                 │                   │            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │  Inference   │  │  Monitoring  │  │ Governance   │    │
│  │     API      │──│   Service    │──│   Workflow   │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
         │                    │                    │
    ┌────────┐          ┌──────────┐        ┌──────────┐
    │ Models │          │  Redis   │        │Postgres  │
    │Storage │          │ (Online) │        │(Offline) │
    └────────┘          └──────────┘        └──────────┘
```

## Components

### 1. ML Model Registry (`@intelgraph/ml-registry`)

Centralized model management system:

- **Model Versioning**: Semantic versioning for all models
- **Lineage Tracking**: Track model ancestry and data provenance
- **Artifact Storage**: Store model weights, configs, and metadata
- **Stage Management**: Development → Staging → Production workflow
- **A/B Testing**: Compare model performance with traffic splitting
- **Model Comparison**: Side-by-side metric comparisons

### 2. Feature Store (`@intelgraph/feature-store`)

Feature engineering and serving platform:

- **Online Serving**: Low-latency feature retrieval via Redis
- **Offline Serving**: Batch feature computation via PostgreSQL
- **Feature Versioning**: Track feature definitions and transformations
- **Feature Groups**: Organize related features
- **Lineage Tracking**: Understand feature dependencies

### 3. Model Serving (`@intelgraph/model-serving`)

Inference infrastructure:

- **REST API**: Real-time predictions with sub-100ms latency
- **Batch Predictions**: Process large datasets efficiently
- **Streaming Inference**: Real-time data stream processing
- **Model Ensembling**: Combine multiple models
- **Load Balancing**: Distribute requests across replicas

### 4. Model Monitoring (`@intelgraph/model-monitoring`)

Production model monitoring:

- **Drift Detection**: Statistical tests for data and concept drift
- **Data Quality**: Null rates, outliers, schema validation
- **Performance Tracking**: Monitor accuracy, latency, throughput
- **Alerting**: Automated alerts via email, Slack, PagerDuty

### 5. Training Service (`services/ml-training`)

Automated model training:

- **Hyperparameter Tuning**: Optuna-based optimization
- **Distributed Training**: PyTorch DDP for multi-GPU training
- **Experiment Tracking**: MLflow integration
- **Automated Pipelines**: End-to-end training workflows

### 6. Inference API (`services/inference-api`)

Production inference service:

- **REST API**: FastAPI-based inference endpoints
- **Batch Processing**: Handle bulk prediction requests
- **Monitoring**: Prometheus metrics and request tracking
- **Caching**: Intelligent result caching

## Getting Started

### Installation

#### TypeScript Packages

```bash
# Install dependencies
pnpm install

# Build packages
pnpm -F @intelgraph/ml-registry build
pnpm -F @intelgraph/feature-store build
pnpm -F @intelgraph/model-serving build
pnpm -F @intelgraph/model-monitoring build
```

#### Python Services

```bash
# ML Training Service
cd services/ml-training
pip install -r requirements.txt

# Inference API
cd services/inference-api
pip install -r requirements.txt
```

### Configuration

#### Model Registry

```typescript
import { createMLRegistry } from '@intelgraph/ml-registry';

const registry = createMLRegistry({
  postgres: {
    host: 'localhost',
    port: 5432,
    database: 'ml_registry',
    user: 'postgres',
    password: 'postgres',
  },
  redis: {
    host: 'localhost',
    port: 6379,
  },
  storage: {
    type: 'local',
    basePath: '/data/models',
  },
});

await registry.initialize();
```

#### Feature Store

```typescript
import { createFeatureStore } from '@intelgraph/feature-store';

const featureStore = createFeatureStore({
  postgres: {
    host: 'localhost',
    port: 5432,
    database: 'features',
    user: 'postgres',
    password: 'postgres',
  },
  redis: {
    host: 'localhost',
    port: 6379,
  },
  offline: {
    type: 'postgres',
    config: {},
  },
});

await featureStore.initialize();
```

## Model Lifecycle

### 1. Register a Model

```typescript
const model = await registry.registry.registerModel({
  name: 'fraud_detector',
  version: '1.0.0',
  framework: 'pytorch',
  model_type: 'classification',
  stage: 'development',
  author: 'data-science-team',
  artifact_uri: '/models/fraud_detector_v1.pt',
  model_size_bytes: 1024000,
  metrics: {
    accuracy: 0.95,
    precision: 0.93,
    recall: 0.94,
    f1: 0.935,
  },
  hyperparameters: {
    learning_rate: 0.001,
    batch_size: 32,
    hidden_size: 128,
  },
  tags: ['fraud-detection', 'production-ready'],
});
```

### 2. Track Lineage

```typescript
await registry.lineage.recordLineage({
  model_id: model.id,
  model_version: '1.0.0',
  parent_models: [
    {
      model_id: 'previous_model_id',
      version: '0.9.0',
      relationship: 'fine-tuned',
    },
  ],
  datasets: [
    {
      dataset_id: 'fraud_training_2024',
      version: '1.0',
      split: 'train',
      size: 100000,
    },
  ],
  experiment_id: 'exp-123',
  run_id: 'run-456',
});
```

### 3. Stage Transition

```typescript
// Request promotion to staging
const transition = await registry.stages.requestTransition(
  model.id,
  '1.0.0',
  'staging',
  'Model passed all validation tests',
  [
    { item: 'Unit tests passing', completed: true },
    { item: 'Integration tests passing', completed: true },
    { item: 'Performance metrics meet threshold', completed: true },
  ]
);

// Approve transition
await registry.stages.approveTransition(
  transition.id,
  'ml-engineer@company.com',
  transition.checklist
);
```

### 4. A/B Testing

```typescript
const abTest = await registry.comparator.createABTest({
  name: 'Fraud Detector v1.0 vs v1.1',
  description: 'Compare new model with 20% traffic',
  control_model: {
    model_id: 'model_v1_id',
    version: '1.0.0',
  },
  treatment_model: {
    model_id: 'model_v1_1_id',
    version: '1.1.0',
  },
  traffic_split: {
    control: 80,
    treatment: 20,
  },
  start_date: new Date().toISOString(),
  status: 'running',
  success_metrics: ['precision', 'recall', 'latency'],
  created_by: 'ml-engineer@company.com',
});
```

## Training Pipeline

### Start Training Job

```bash
curl -X POST http://localhost:8000/training/start \
  -H "Content-Type: application/json" \
  -d '{
    "model_name": "fraud_detector",
    "model_type": "pytorch",
    "dataset_config": {
      "train_path": "/data/train.csv",
      "val_path": "/data/val.csv"
    },
    "hyperparameters": {
      "learning_rate": 0.001,
      "batch_size": 32,
      "epochs": 100
    },
    "enable_tuning": true,
    "tuning_trials": 50,
    "tags": ["fraud-detection"]
  }'
```

### Monitor Training

```bash
# Get job status
curl http://localhost:8000/training/status/{job_id}

# List all jobs
curl http://localhost:8000/training/jobs
```

### Evaluate Model

```bash
curl -X POST http://localhost:8000/evaluation/evaluate \
  -H "Content-Type: application/json" \
  -d '{
    "model_name": "fraud_detector",
    "model_version": "1.0.0",
    "dataset_config": {
      "test_path": "/data/test.csv"
    },
    "metrics": ["accuracy", "precision", "recall", "f1"],
    "include_fairness": true,
    "include_robustness": true,
    "include_explainability": true
  }'
```

## Model Serving

### Real-time Inference

```bash
curl -X POST http://localhost:8001/predict \
  -H "Content-Type: application/json" \
  -d '{
    "model_name": "fraud_detector",
    "model_version": "1.0.0",
    "inputs": {
      "amount": 150.50,
      "merchant_id": "12345",
      "user_id": "67890"
    },
    "options": {
      "return_confidence": true,
      "return_explanation": true
    }
  }'
```

### Batch Predictions

```bash
curl -X POST http://localhost:8001/predict/batch \
  -H "Content-Type: application/json" \
  -d '{
    "model_name": "fraud_detector",
    "model_version": "1.0.0",
    "inputs": [
      {"amount": 150.50, "merchant_id": "12345"},
      {"amount": 75.25, "merchant_id": "67890"}
    ]
  }'
```

## Monitoring & Drift Detection

### Detect Drift

```typescript
const driftReport = await monitoring.detectDrift(
  modelId,
  '1.0.0',
  baselineData, // Last 7 days
  currentData,  // Today
  0.1           // Threshold
);

if (driftReport.drift_detected) {
  console.warn(`Drift detected! Score: ${driftReport.drift_score}`);
  // Trigger retraining or alerting
}
```

### Monitor Data Quality

```typescript
const qualityReport = await monitoring.checkDataQuality(
  modelId,
  '1.0.0',
  currentData
);

if (qualityReport.quality_score < 0.9) {
  console.warn('Data quality issues detected');
}
```

## Feature Store

### Register Features

```typescript
const feature = await featureStore.registerFeature({
  name: 'user_transaction_count_7d',
  version: '1.0.0',
  feature_type: 'int',
  entity_type: 'user',
  description: 'Number of transactions in last 7 days',
  owner: 'feature-eng-team',
  online_enabled: true,
  offline_enabled: true,
  ttl_seconds: 3600,
});
```

### Write Features (Online + Offline)

```typescript
await featureStore.writeFeature(
  'user_transaction_count_7d',
  'user_12345',
  42,
  '1.0.0'
);
```

### Read Features (Online-first)

```typescript
const featureValue = await featureStore.readFeature(
  'user_transaction_count_7d',
  'user_12345',
  '1.0.0'
);

console.log(featureValue.value); // 42
```

### Feature Vectors

```typescript
const vector = await featureStore.readFeatureVector(
  'user',
  'user_12345',
  [
    'user_transaction_count_7d',
    'user_avg_transaction_amount',
    'user_last_login_days',
  ],
  '1.0.0'
);

console.log(vector.features);
// {
//   user_transaction_count_7d: 42,
//   user_avg_transaction_amount: 125.50,
//   user_last_login_days: 2
// }
```

## Best Practices

### Model Development

1. **Version Everything**: Models, features, datasets, and code
2. **Track Experiments**: Use MLflow or Weights & Biases
3. **Reproducibility**: Pin dependencies, use Docker, set random seeds
4. **Code Review**: Peer review all model code
5. **Unit Tests**: Test data preprocessing, model logic, and metrics

### Model Deployment

1. **Staging First**: Always deploy to staging before production
2. **Gradual Rollout**: Use A/B testing or canary deployments
3. **Monitoring**: Set up alerts for drift, latency, and errors
4. **Rollback Plan**: Have a documented rollback procedure
5. **Documentation**: Maintain model cards and API docs

### Model Monitoring

1. **Baseline Metrics**: Establish performance baselines
2. **Drift Detection**: Monitor input, output, and concept drift
3. **Data Quality**: Check for null rates, outliers, and schema changes
4. **Business Metrics**: Track impact on business KPIs
5. **Automated Retraining**: Set up triggers for model updates

### Feature Engineering

1. **Feature Documentation**: Document all feature definitions
2. **Feature Validation**: Validate feature values and distributions
3. **Online-Offline Consistency**: Ensure parity between serving modes
4. **Feature Reuse**: Build a shared feature library
5. **Monitoring**: Track feature drift and staleness

### Governance

1. **Approval Workflows**: Require sign-off for production deployments
2. **Model Cards**: Document model purpose, limitations, and biases
3. **Audit Trails**: Log all model changes and decisions
4. **Compliance**: Follow data privacy and regulatory requirements
5. **Incident Response**: Have a plan for model failures

### Security

1. **Access Control**: Restrict access to models and data
2. **Model Encryption**: Encrypt models at rest and in transit
3. **Input Validation**: Validate all inference inputs
4. **Rate Limiting**: Prevent abuse of inference endpoints
5. **Security Audits**: Regular security reviews

## Troubleshooting

### Model Not Found

```typescript
// Check if model exists
const model = await registry.registry.getModel('model_name', 'version');
if (!model) {
  console.error('Model not found in registry');
}
```

### Drift Detected

```typescript
// Get drift details
const driftReports = await monitoring.getDriftReports(modelId, 10);
const latestDrift = driftReports[0];

// Check feature-level drift
for (const [feature, score] of Object.entries(latestDrift.feature_drifts)) {
  if (score > 0.1) {
    console.warn(`Feature ${feature} has high drift: ${score}`);
  }
}
```

### Slow Inference

1. Check model size and complexity
2. Enable model caching
3. Use batch inference for multiple requests
4. Consider model quantization or distillation
5. Scale horizontally with more replicas

## Support

For issues or questions:

- **Documentation**: `/docs/ml/`
- **GitHub Issues**: [Report bugs](https://github.com/intelgraph/platform/issues)
- **Slack**: #ml-platform channel

## License

Copyright © 2024 IntelGraph. All rights reserved.
