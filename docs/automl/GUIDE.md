# AutoML Platform User Guide

## Overview

The Summit AutoML Platform provides comprehensive automated machine learning capabilities for intelligence operations, offering enterprise-grade automation, interpretability, and advanced features that surpass specialized tools like H2O.ai and DataRobot.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Core Features](#core-features)
3. [API Reference](#api-reference)
4. [Examples](#examples)
5. [Advanced Usage](#advanced-usage)

## Getting Started

### Installation

```bash
# Install dependencies
pnpm install

# Build packages
pnpm run build

# Start AutoML service
cd services/automl-service
pnpm run dev
```

### Quick Start

```typescript
import { AutoMLOrchestrator } from '@intelgraph/automl';

const orchestrator = new AutoMLOrchestrator();

// Create an AutoML job
const job = await orchestrator.createJob({
  id: 'my-first-job',
  name: 'Customer Classification',
  dataset: {
    id: 'dataset-1',
    name: 'customers',
    features: [
      { name: 'age', type: 'numeric', missing: 0, unique: 50 },
      { name: 'income', type: 'numeric', missing: 5, unique: 100 },
      { name: 'region', type: 'categorical', missing: 0, unique: 4 },
    ],
    target: 'churn',
    rows: 10000,
    columns: 3,
  },
  algorithmType: AlgorithmType.CLASSIFICATION,
  optimizationMetric: 'f1Score',
  optimizationDirection: 'maximize',
  timeLimit: 3600,
  maxModels: 10,
  crossValidation: {
    method: 'stratified',
    folds: 5,
  },
  ensemble: {
    enabled: true,
    method: 'stacking',
    maxModels: 5,
  },
});

// Monitor job progress
const status = orchestrator.getJob(job.id);
console.log(`Progress: ${status.progress}%`);
console.log(`Best model: ${status.bestModel?.modelConfig.algorithm}`);
```

## Core Features

### 1. Automated Model Selection

The platform automatically evaluates and selects the best machine learning algorithms for your data:

```typescript
import { ModelSelector } from '@intelgraph/automl';

const selector = new ModelSelector();

// Get algorithm recommendations
const recommendations = await selector.recommendAlgorithms(
  dataset,
  config,
  topK: 5
);

// Explain why an algorithm was selected
const explanation = selector.explainSelection(
  'xgboost',
  dataset,
  config
);
console.log(explanation.reasons);
```

**Supported Algorithms:**
- Random Forest
- Gradient Boosting
- XGBoost
- LightGBM
- Logistic Regression
- Support Vector Machines
- Neural Networks
- And more...

### 2. Hyperparameter Optimization

Advanced optimization strategies for finding optimal hyperparameters:

```typescript
import { StudyManager } from '@intelgraph/hyperopt';

const studyManager = new StudyManager();

// Create optimization study
const study = studyManager.createStudy(
  'my-study',
  {
    searchSpace: {
      parameters: [
        {
          name: 'n_estimators',
          type: 'int',
          min: 50,
          max: 500,
        },
        {
          name: 'learning_rate',
          type: 'float',
          min: 0.001,
          max: 0.3,
          logScale: true,
        },
      ],
    },
    objective: 'maximize',
    metric: 'accuracy',
    maxEvaluations: 100,
  },
  'bayesian' // or 'random', 'grid', 'genetic'
);

// Get next suggestion
const params = await studyManager.suggest(study.id);

// Report results
studyManager.reportTrial(
  study.id,
  params,
  { accuracy: 0.92, f1Score: 0.91 }
);
```

**Optimization Methods:**
- Bayesian Optimization (Gaussian Processes)
- Random Search
- Grid Search
- Genetic Algorithms
- Population-Based Training
- Hyperband
- Successive Halving

### 3. Automated Feature Engineering

Intelligent feature generation, selection, and transformation:

```typescript
import { FeatureGenerator, FeatureSelector } from '@intelgraph/auto-feature-engineering';

const generator = new FeatureGenerator();

// Generate new features
const newFeatures = await generator.generate(features, {
  polynomialDegree: 2,
  interactions: true,
  statistical: true,
  maxFeatures: 100,
});

// Select best features
const selector = new FeatureSelector();
const selected = selector.selectByImportance(
  newFeatures,
  topK: 50,
  threshold: 0.01
);
```

**Feature Engineering Capabilities:**
- Polynomial features
- Interaction features
- Time-based feature extraction
- Statistical feature synthesis
- Domain-specific feature templates
- Automated feature selection
- Feature importance ranking

### 4. Neural Architecture Search (NAS)

Automated design of neural network architectures:

```typescript
import { NASSearcher, HardwareAwareNAS } from '@intelgraph/nas';

// Define search space
const searchSpace = {
  layers: [
    {
      type: 'conv',
      paramRanges: {
        filters: { min: 16, max: 256 },
        kernelSize: [3, 5, 7],
      },
    },
    {
      type: 'dense',
      paramRanges: {
        units: { min: 32, max: 512 },
      },
    },
  ],
  maxLayers: 10,
  minLayers: 3,
};

// Search for best architecture
const searcher = new NASSearcher(searchSpace, 'evolutionary');
const bestArchitecture = await searcher.search(100);

// Hardware-aware NAS
const hwSearcher = new HardwareAwareNAS(
  searchSpace,
  'mobile',
  100 // max latency in ms
);
const efficientArchitecture = await hwSearcher.search(100);
```

### 5. Meta-Learning

Learn from past experiments to accelerate future ML tasks:

```typescript
import { MetaLearningEngine } from '@intelgraph/meta-learning';

const metaLearning = new MetaLearningEngine();

// Extract meta-features
const metaFeatures = metaLearning.extractMetaFeatures({
  numSamples: 10000,
  numFeatures: 50,
  numClasses: 2,
});

// Get algorithm recommendation
const recommendation = metaLearning.recommendAlgorithm(metaFeatures);
console.log(`Recommended: ${recommendation.algorithm}`);
console.log(`Expected performance: ${recommendation.expectedPerformance}`);

// Get warm start suggestions
const warmStart = metaLearning.suggestWarmStart(metaFeatures);
```

### 6. AutoML Pipeline Orchestration

Build and execute end-to-end ML pipelines:

```typescript
import { PipelineBuilder, PipelineExecutor } from '@intelgraph/automl';

// Build pipeline
const pipeline = new PipelineBuilder('my-pipeline')
  .addPreprocessing({
    scaling: 'standard',
    encoding: 'onehot',
    imputation: 'mean',
  })
  .addFeatureEngineering({
    polynomialDegree: 2,
    interactions: true,
  })
  .addModelTraining({
    algorithm: 'xgboost',
    hyperparameters: { n_estimators: 100 },
    crossValidation: { method: 'kfold', folds: 5 },
  })
  .addDeployment({
    target: 'rest_api',
    scaling: { minInstances: 1, maxInstances: 10 },
  })
  .build();

// Execute pipeline
const executor = new PipelineExecutor();
const result = await executor.execute(pipeline);
```

### 7. Experiment Tracking

Track and manage ML experiments:

```typescript
import { ExperimentTracker } from '@intelgraph/automl';

const tracker = new ExperimentTracker();

// Create experiment
const experiment = tracker.createExperiment({
  name: 'Customer Churn Prediction',
  description: 'Testing different algorithms',
  tags: ['classification', 'production'],
});

// Log run
const run = tracker.logRun(experiment.id, {
  parameters: { algorithm: 'xgboost', n_estimators: 100 },
  metrics: { accuracy: 0.92, f1Score: 0.91 },
});

// Compare runs
const comparison = tracker.compareRuns([run1.id, run2.id, run3.id]);

// Get best run
const bestRun = tracker.getBestRun(experiment.id, 'accuracy', 'maximize');
```

### 8. Model Deployment

Automated deployment with monitoring and A/B testing:

```typescript
import { ModelDeployer } from '@intelgraph/automl';

const deployer = new ModelDeployer();

// Deploy model
const deployment = await deployer.deploy(modelId, {
  target: 'rest_api',
  scaling: {
    minInstances: 2,
    maxInstances: 20,
    targetCPU: 70,
    targetMemory: 80,
  },
  monitoring: {
    enabled: true,
    metrics: ['latency', 'errorRate', 'throughput'],
    alertThresholds: {
      errorRate: 0.05,
      latency: 1000,
    },
  },
  abTesting: {
    enabled: true,
    trafficSplit: 0.1,
    baselineModelId: 'model-v1',
  },
});

// Get endpoints
const endpoints = deployer.generateEndpoint(deployment);
console.log(`REST API: ${endpoints.restAPI}`);

// Monitor health
const health = deployer.getHealthStatus(deployment.id);
```

## API Reference

### REST API Endpoints

#### AutoML Jobs

```bash
# Create job
POST /api/v1/automl/jobs
Content-Type: application/json

{
  "id": "job-1",
  "name": "My AutoML Job",
  "dataset": {...},
  "algorithmType": "classification",
  "optimizationMetric": "accuracy",
  "optimizationDirection": "maximize"
}

# Get job status
GET /api/v1/automl/jobs/{jobId}

# Cancel job
POST /api/v1/automl/jobs/{jobId}/cancel

# List all jobs
GET /api/v1/automl/jobs
```

#### Hyperparameter Optimization

```bash
# Create study
POST /api/v1/hyperopt/studies
{
  "name": "study-1",
  "config": {...},
  "optimizer": "bayesian"
}

# Get suggestion
POST /api/v1/hyperopt/studies/{studyId}/suggest

# Report trial
POST /api/v1/hyperopt/studies/{studyId}/trials
{
  "parameters": {...},
  "metrics": {...},
  "status": "completed"
}

# Get history
GET /api/v1/hyperopt/studies/{studyId}/history
```

#### Neural Architecture Search

```bash
# Start search
POST /api/v1/nas/search
{
  "searchSpace": {...},
  "method": "evolutionary",
  "maxIterations": 100
}

# Get search status
GET /api/v1/nas/search/{searchId}

# List searches
GET /api/v1/nas/search
```

## Examples

### Example 1: Classification Pipeline

```typescript
import { AutoMLOrchestrator, AlgorithmType } from '@intelgraph/automl';

const orchestrator = new AutoMLOrchestrator();

const job = await orchestrator.createJob({
  id: 'classification-demo',
  name: 'Fraud Detection',
  dataset: {
    id: 'fraud-data',
    name: 'transactions',
    features: [
      { name: 'amount', type: 'numeric', missing: 0, unique: 5000 },
      { name: 'merchant_category', type: 'categorical', missing: 0, unique: 20 },
      { name: 'transaction_time', type: 'datetime', missing: 0, unique: 10000 },
    ],
    target: 'is_fraud',
    rows: 100000,
    columns: 3,
  },
  algorithmType: AlgorithmType.CLASSIFICATION,
  optimizationMetric: 'auc',
  optimizationDirection: 'maximize',
  maxModels: 15,
  crossValidation: {
    method: 'stratified',
    folds: 10,
  },
  ensemble: {
    enabled: true,
    method: 'stacking',
  },
  preprocessing: {
    autoScale: true,
    autoEncode: true,
    autoImpute: true,
    handleOutliers: true,
    balanceClasses: true,
  },
  featureEngineering: {
    enabled: true,
    maxFeatures: 50,
    interactions: true,
  },
});

// Wait for completion
while (job.status !== 'completed') {
  await new Promise(resolve => setTimeout(resolve, 5000));
  const updated = orchestrator.getJob(job.id);
  console.log(`Progress: ${updated.progress}% - ${updated.modelsEvaluated} models evaluated`);
}

console.log(`Best model: ${job.bestModel?.modelConfig.algorithm}`);
console.log(`Performance: AUC = ${job.bestModel?.performance.auc}`);
```

### Example 2: Hyperparameter Optimization

```typescript
import { StudyManager } from '@intelgraph/hyperopt';

const manager = new StudyManager();

const study = manager.createStudy('xgboost-tuning', {
  searchSpace: {
    parameters: [
      { name: 'n_estimators', type: 'int', min: 50, max: 500 },
      { name: 'max_depth', type: 'int', min: 3, max: 10 },
      { name: 'learning_rate', type: 'float', min: 0.001, max: 0.3, logScale: true },
      { name: 'subsample', type: 'float', min: 0.5, max: 1.0 },
      { name: 'colsample_bytree', type: 'float', min: 0.5, max: 1.0 },
    ],
  },
  objective: 'maximize',
  metric: 'accuracy',
  maxEvaluations: 50,
  earlyStoppingRounds: 10,
}, 'bayesian');

// Optimization loop
for (let i = 0; i < 50; i++) {
  const params = await manager.suggest(study.id);

  // Train model with suggested parameters
  const model = trainModel(params);
  const accuracy = evaluateModel(model);

  // Report results
  manager.reportTrial(study.id, params, { accuracy });

  const currentStudy = manager.getStudy(study.id);
  if (currentStudy?.status === 'completed') break;
}

const bestStudy = manager.getStudy(study.id);
console.log('Best parameters:', bestStudy?.bestTrial?.parameters);
console.log('Best accuracy:', bestStudy?.bestTrial?.score);
```

## Advanced Usage

### Custom Optimizers

```typescript
import { Optimizer, OptimizationStudy } from '@intelgraph/hyperopt';

class MyCustomOptimizer implements Optimizer {
  getName(): string {
    return 'MyOptimizer';
  }

  async suggest(study: OptimizationStudy): Promise<Record<string, any>> {
    // Your custom logic here
    return {};
  }

  update(study: OptimizationStudy, trial: TrialResult): void {
    // Update internal state
  }
}
```

### Pipeline Templates

```typescript
import { PipelineBuilder } from '@intelgraph/automl';

// Create reusable templates
const quickPipeline = PipelineBuilder.fromTemplate('quick', 'classification');
const standardPipeline = PipelineBuilder.fromTemplate('standard', 'regression');
const thoroughPipeline = PipelineBuilder.fromTemplate('thorough', 'classification');
```

## Performance Tips

1. **Use appropriate cross-validation**: More folds = better estimates but slower
2. **Set time limits**: Prevent runaway experiments
3. **Enable early stopping**: Stop unpromising trials early
4. **Use warm starts**: Leverage meta-learning for faster convergence
5. **Parallelize when possible**: Run multiple trials concurrently
6. **Cache preprocessed data**: Avoid redundant preprocessing
7. **Use hardware-aware NAS**: Optimize for your deployment target

## Troubleshooting

### Job Stuck in "Preprocessing"

- Check dataset size and complexity
- Verify all features have valid types
- Review logs for errors

### Poor Model Performance

- Increase `maxModels` to try more algorithms
- Enable feature engineering
- Check class balance for classification
- Verify data quality

### Out of Memory

- Reduce `maxModels` or `maxFeatures`
- Use sampling for large datasets
- Enable incremental training

## Support

- Documentation: `/docs/automl/`
- API Reference: `/docs/automl/api-reference.md`
- Examples: `/examples/automl/`
- Issues: GitHub Issues

## What's Next?

- [Best Practices Guide](./BEST_PRACTICES.md)
- [Algorithm Reference](./ALGORITHMS.md)
- [API Documentation](./api-reference.md)
- [Integration Guide](./integration.md)
