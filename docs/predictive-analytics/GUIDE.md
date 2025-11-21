# Predictive Analytics and Forecasting Platform Guide

## Overview

The Predictive Analytics and Forecasting Platform provides enterprise-grade capabilities for time-series forecasting, predictive modeling, risk scoring, causal inference, and comprehensive model lifecycle management.

## Table of Contents

1. [Architecture](#architecture)
2. [Core Packages](#core-packages)
3. [Services](#services)
4. [Quick Start](#quick-start)
5. [Use Cases](#use-cases)
6. [Advanced Topics](#advanced-topics)
7. [API Reference](#api-reference)

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Client Applications                       │
└───────────────────┬─────────────────────────────────────────┘
                    │
        ┌───────────┴───────────┐
        │                       │
┌───────▼────────┐    ┌────────▼─────────┐
│  Prediction    │    │  Model Training  │
│   Service      │    │     Service      │
└───────┬────────┘    └────────┬─────────┘
        │                      │
        └──────────┬───────────┘
                   │
        ┌──────────▼──────────┐
        │   Core Packages     │
        ├─────────────────────┤
        │ • forecasting       │
        │ • predictive-models │
        │ • time-series       │
        │ • risk-scoring      │
        │ • causal-inference  │
        │ • feature-engine    │
        └─────────────────────┘
```

## Core Packages

### 1. @summit/forecasting

Time-series forecasting with state-of-the-art models.

**Features:**
- ARIMA and SARIMA models
- Exponential smoothing (Holt-Winters)
- Prophet-style forecasting with seasonality and holidays
- Ensemble forecasting
- Anomaly forecasting
- Monte Carlo simulation
- Backtesting framework

**Example:**
```typescript
import { ARIMAForecaster, AutoARIMA } from '@summit/forecasting';

// Automatic parameter selection
const autoArima = new AutoARIMA();
const { params, performance } = autoArima.selectBestModel(trainingData);

// Create forecaster with optimal parameters
const forecaster = new ARIMAForecaster(params);
forecaster.fit(trainingData);

// Generate forecasts
const forecasts = forecaster.forecast(30, 0.95);

forecasts.forEach(f => {
  console.log(`${f.timestamp}: ${f.forecast} [${f.lowerBound}, ${f.upperBound}]`);
});
```

### 2. @summit/predictive-models

Classification and regression models with explainability.

**Features:**
- Random Forests
- Gradient Boosting (XGBoost-style)
- Linear/Ridge/Lasso regression
- Hyperparameter optimization (Grid/Random search)
- SHAP explainability
- Cross-validation

**Example:**
```typescript
import { RandomForestClassifier, GridSearchCV, ShapExplainer } from '@summit/predictive-models';

// Train model
const model = new RandomForestClassifier({
  nEstimators: 100,
  maxDepth: 10,
});

model.fit(trainingData);

// Get predictions
const predictions = model.predict(testFeatures);

// Feature importance
const importance = model.getFeatureImportances(['age', 'income', 'tenure']);

// Explain predictions with SHAP
const explainer = new ShapExplainer(model, backgroundData);
const explanation = explainer.explainInstance(testInstance);
```

### 3. @summit/time-series

Time series utilities and decomposition.

**Features:**
- STL decomposition (Seasonal-Trend-Loess)
- Stationarity tests (ADF, KPSS)
- Autocorrelation analysis
- Trend extraction

**Example:**
```typescript
import { STLDecomposer, StationarityTester } from '@summit/time-series';

// Decompose time series
const decomposer = new STLDecomposer(12); // 12-month seasonality
const { trend, seasonal, residual } = decomposer.decompose(timeSeriesData);

// Test stationarity
const tester = new StationarityTester();
const adfResult = tester.adfTest(timeSeriesData);
console.log(`Stationary: ${adfResult.isStationary}, p-value: ${adfResult.pValue}`);
```

### 4. @summit/risk-scoring

Risk scoring and model monitoring.

**Features:**
- Logistic risk models
- Scorecard development
- Population Stability Index (PSI)
- Model calibration
- Risk stratification

**Example:**
```typescript
import { LogisticRiskScorer, PSICalculator } from '@summit/risk-scoring';

// Train risk model
const scorer = new LogisticRiskScorer();
scorer.fit(features, labels, featureNames);

// Score entities
const riskScore = scorer.score('entity_123', entityFeatures);

console.log(`Risk Score: ${riskScore.score}`);
console.log(`Risk Level: ${riskScore.riskLevel}`);
console.log(`Top Risk Factors:`, riskScore.factors.slice(0, 3));

// Monitor model stability
const psi = new PSICalculator();
const psiResult = psi.calculatePSI(baselineScores, currentScores);
console.log(`PSI: ${psiResult.psi}, Status: ${psiResult.status}`);
```

### 5. @summit/causal-inference

Causal inference and treatment effect estimation.

**Features:**
- Propensity score matching
- Difference-in-differences
- Instrumental variables
- Regression discontinuity
- Causal impact analysis

**Example:**
```typescript
import { PropensityScoreMatcher, DifferenceInDifferences } from '@summit/causal-inference';

// Estimate treatment effect with propensity matching
const matcher = new PropensityScoreMatcher();
const effect = matcher.estimateEffect(covariates, treatment, outcomes);

console.log(`Average Treatment Effect: ${effect.ate}`);
console.log(`95% CI: [${effect.confidence[0]}, ${effect.confidence[1]}]`);
console.log(`p-value: ${effect.pValue}`);

// Difference-in-differences
const did = new DifferenceInDifferences();
const didEffect = did.estimate(
  treatmentGroupPre,
  treatmentGroupPost,
  controlGroupPre,
  controlGroupPost
);
```

### 6. @summit/feature-engineering

Automated feature generation and transformation.

**Features:**
- Polynomial feature generation
- Time-based features (cyclic encoding)
- Lag features
- Rolling statistics
- Standard/MinMax scaling

**Example:**
```typescript
import { AutomatedFeatureGenerator, StandardScaler } from '@summit/feature-engineering';

const generator = new AutomatedFeatureGenerator();

// Generate polynomial features
const polyFeatures = generator.generatePolynomialFeatures(data, 2);

// Generate time features
const timeFeatures = generator.generateTimeFeatures(timestamps);

// Generate lag features for time series
const lagFeatures = generator.generateLagFeatures(values, [1, 7, 30]);

// Scale features
const scaler = new StandardScaler();
const scaledData = scaler.fitTransform(features);
```

## Services

### Prediction Service

REST API for making predictions with deployed models.

**Endpoints:**

```
POST   /api/v1/predict          - Make predictions
GET    /api/v1/models           - List all models
GET    /api/v1/models/:id       - Get model details
POST   /api/v1/models/:id/promote - Promote model version
GET    /api/v1/health           - Health check
```

**Example Request:**
```bash
curl -X POST http://localhost:3000/api/v1/predict \
  -H "Content-Type: application/json" \
  -d '{
    "modelId": "default-arima",
    "modelType": "forecast",
    "features": [
      {"timestamp": "2025-01-01", "value": 100},
      {"timestamp": "2025-01-02", "value": 105}
    ],
    "options": {
      "horizon": 7,
      "confidenceLevel": 0.95
    }
  }'
```

### Model Training Service

Automated model training with hyperparameter tuning.

**Endpoints:**

```
POST   /api/v1/train            - Train new model
GET    /api/v1/health           - Health check
```

**Example Request:**
```bash
curl -X POST http://localhost:3001/api/v1/train \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "features": [[1, 2], [3, 4]],
      "labels": [0, 1]
    },
    "config": {
      "modelType": "classification",
      "hyperparameterTuning": true,
      "featureEngineering": true,
      "crossValidation": 5,
      "testSize": 0.2
    }
  }'
```

## Quick Start

### 1. Install Dependencies

```bash
# From root directory
pnpm install
```

### 2. Build Packages

```bash
# Build all packages
pnpm -r build

# Or build specific package
pnpm --filter @summit/forecasting build
```

### 3. Start Services

```bash
# Prediction Service
cd services/prediction-service
pnpm start

# Model Training Service
cd services/model-training
pnpm start
```

### 4. Make Your First Prediction

```typescript
import { ARIMAForecaster } from '@summit/forecasting';

// Prepare data
const data = [
  { timestamp: new Date('2025-01-01'), value: 100 },
  { timestamp: new Date('2025-01-02'), value: 105 },
  { timestamp: new Date('2025-01-03'), value: 110 },
  // ... more data
];

// Create and fit model
const forecaster = new ARIMAForecaster({ p: 1, d: 1, q: 1 });
forecaster.fit(data);

// Forecast
const predictions = forecaster.forecast(7, 0.95);

predictions.forEach(p => {
  console.log(`${p.timestamp.toISOString()}: ${p.forecast.toFixed(2)}`);
});
```

## Use Cases

### 1. Threat Intelligence Forecasting

Forecast future cyber threats and attack patterns.

```typescript
import { ProphetForecaster } from '@summit/forecasting';

const forecaster = new ProphetForecaster({
  horizon: 30,
  confidenceLevel: 0.95,
  seasonality: { period: 7, mode: 'multiplicative' },
  holidays: [
    { name: 'blackhat', dates: [new Date('2025-08-01')] },
  ],
});

forecaster.fit(threatData);
const threatForecast = forecaster.forecast();
```

### 2. Risk Scoring for Entities

Score entities for threat risk.

```typescript
import { LogisticRiskScorer } from '@summit/risk-scoring';

const scorer = new LogisticRiskScorer();
scorer.fit(historicalFeatures, historicalLabels, [
  'reputation_score',
  'connection_count',
  'anomaly_score',
]);

const riskScore = scorer.score('entity_456', [0.3, 15, 0.7]);
```

### 3. Causal Impact of Intelligence Operations

Measure the causal impact of interventions.

```typescript
import { DifferenceInDifferences } from '@summit/causal-inference';

const did = new DifferenceInDifferences();
const impact = did.estimate(
  operationAreaBefore,
  operationAreaAfter,
  controlAreaBefore,
  controlAreaAfter
);

console.log(`Causal Impact: ${impact.ate}`);
```

### 4. Churn Prediction for Intelligence Sources

Predict which intelligence sources are at risk of becoming inactive.

```typescript
import { ChurnPredictor } from '../models/prediction-models/churn/churn-predictor.js';

const predictor = new ChurnPredictor();
predictor.fit(trainingFeatures, trainingLabels);

const churnPrediction = predictor.predict('source_789', {
  tenure: 12,
  monthlyReports: 5,
  totalReports: 60,
  reliability: 0.85,
  lastActivity: 30,
});
```

## Advanced Topics

### Model Lifecycle Management

```typescript
import { ModelRegistry } from '../services/prediction-service/src/core/model-registry.js';

const registry = new ModelRegistry();

// Register new version
registry.registerVersion('model-1', {
  version: '2.0.0',
  model: newModel,
  metadata: {...},
  deployedAt: new Date(),
  performance: { accuracy: 0.92 },
});

// A/B testing
const champion = registry.getChampion('model-1');
const challenger = registry.getVersion('model-1', '2.0.0');

// Promote if better
if (challenger.performance.accuracy > champion.performance.accuracy) {
  registry.promoteToChampion('model-1', '2.0.0');
}

// Monitor drift
registry.recordDrift('model-1', {
  dataDrift: 0.15,
  conceptDrift: 0.10,
  performanceDrift: 0.05,
  timestamp: new Date(),
});

if (registry.needsRetraining('model-1')) {
  console.log('Model needs retraining!');
}
```

### Ensemble Forecasting

```typescript
import { EnsembleForecaster } from '@summit/forecasting';

const ensemble = new EnsembleForecaster({
  models: [
    { type: 'arima', params: { p: 1, d: 1, q: 1 } },
    { type: 'exponential', params: { alpha: 0.2 } },
    { type: 'prophet', params: { horizon: 30, confidenceLevel: 0.95 } },
  ],
  weights: [0.4, 0.3, 0.3],
  method: 'weighted',
});

ensemble.fit(data);
const forecasts = ensemble.forecast(30);
```

### Hyperparameter Optimization

```typescript
import { GridSearchCV, RandomForestClassifier } from '@summit/predictive-models';

const gridSearch = new GridSearchCV({
  nFolds: 5,
  scoringMetric: 'accuracy',
});

const paramSpace = {
  nEstimators: [50, 100, 200],
  maxDepth: [5, 10, 20],
  minSamplesSplit: [2, 5, 10],
};

const result = gridSearch.search(
  paramSpace,
  (params) => new RandomForestClassifier(params),
  trainingData
);

console.log('Best parameters:', result.bestParams);
console.log('Best score:', result.bestScore);
```

## API Reference

### Forecasting API

#### ARIMAForecaster

```typescript
class ARIMAForecaster {
  constructor(params: ARIMAParams)
  fit(data: TimeSeriesData[]): void
  forecast(horizon: number, confidenceLevel: number): ForecastResult[]
  evaluate(testData: TimeSeriesData[]): ModelPerformance
}
```

#### ProphetForecaster

```typescript
class ProphetForecaster {
  constructor(config: ForecastConfig)
  fit(data: TimeSeriesData[]): void
  forecast(horizon?: number, confidenceLevel?: number): ForecastResult[]
  decompose(): TrendDecomposition
}
```

### Predictive Models API

#### RandomForestClassifier

```typescript
class RandomForestClassifier {
  constructor(config: RandomForestConfig)
  fit(dataset: Dataset): void
  predict(features: number[][]): PredictionResult[]
  predictProba(features: number[][]): number[][]
  getFeatureImportances(featureNames?: string[]): FeatureImportance[]
  evaluate(testDataset: Dataset): ModelPerformance
}
```

#### GradientBoostingClassifier

```typescript
class GradientBoostingClassifier {
  constructor(config: GradientBoostingConfig)
  fit(dataset: Dataset, validationData?: Dataset): void
  predict(features: number[][]): PredictionResult[]
  evaluate(testDataset: Dataset): ModelPerformance
}
```

### Risk Scoring API

#### LogisticRiskScorer

```typescript
class LogisticRiskScorer {
  fit(features: number[][], labels: number[], featureNames?: string[]): void
  score(entityId: string, features: number[]): RiskScore
  scoreBatch(entityIds: string[], features: number[][]): RiskScore[]
}
```

## Performance Benchmarks

| Model Type | Training Time (10K samples) | Prediction Time (1K samples) | Memory Usage |
|------------|----------------------------|------------------------------|--------------|
| ARIMA      | ~2s                        | ~100ms                       | ~50MB        |
| Random Forest | ~5s                     | ~50ms                        | ~100MB       |
| XGBoost    | ~8s                        | ~30ms                        | ~150MB       |
| Risk Scorer | ~3s                       | ~20ms                        | ~40MB        |

## Troubleshooting

### Common Issues

1. **Model not fitted**: Always call `fit()` before `predict()` or `forecast()`
2. **Data format**: Ensure time series data includes `timestamp` and `value` fields
3. **Missing features**: Check feature names match between training and prediction
4. **Memory issues**: Use batch processing for large datasets

### Support

For issues and questions:
- GitHub Issues: https://github.com/your-org/summit/issues
- Documentation: https://docs.summit.ai
- Email: support@summit.ai

## License

Copyright © 2025 Summit Intelligence Platform
