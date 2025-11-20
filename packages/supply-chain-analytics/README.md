# @intelgraph/supply-chain-analytics

Advanced analytics and machine learning capabilities for supply chain intelligence.

## Features

- **Anomaly Detection**: Detect unusual patterns in time series data
- **Pattern Recognition**: Identify seasonal, trend, and cyclic patterns
- **Supplier Clustering**: Segment suppliers using k-means clustering
- **Demand Forecasting**: Predict future demand with confidence intervals
- **Disruption Prediction**: ML-based prediction of supply chain disruptions
- **Scenario Analysis**: What-if analysis for strategic planning

## Installation

```bash
pnpm add @intelgraph/supply-chain-analytics
```

## Usage

### Anomaly Detection

```typescript
import { AnalyticsEngine } from '@intelgraph/supply-chain-analytics';

const engine = new AnalyticsEngine();

const anomalies = engine.detectAnomalies(timeSeriesData, 'high');

anomalies.forEach(anomaly => {
  console.log(`Anomaly at ${anomaly.timestamp}: ${anomaly.value}`);
  console.log(`Expected: ${anomaly.expectedValue}, Deviation: ${anomaly.deviation}`);
  console.log(`Severity: ${anomaly.severity}, Confidence: ${anomaly.confidence}`);
});
```

### Pattern Recognition

```typescript
const patterns = engine.recognizePatterns(timeSeriesData);

patterns.forEach(pattern => {
  console.log(`Pattern: ${pattern.patternType}`);
  console.log(`Description: ${pattern.description}`);
  console.log(`Confidence: ${pattern.confidence}`);

  if (pattern.period) {
    console.log(`Period: ${pattern.period} days`);
  }
});
```

### Supplier Clustering

```typescript
const clusters = engine.clusterSuppliers(nodes, riskScores, spend);

clusters.forEach(cluster => {
  console.log(`Cluster: ${cluster.clusterName}`);
  console.log(`Suppliers: ${cluster.nodeIds.length}`);
  console.log(`Strategy: ${cluster.recommendedStrategy}`);
});
```

### Demand Forecasting

```typescript
const forecast = engine.forecastDemand(componentId, historicalDemand, 90);

console.log(`Seasonality: ${forecast.seasonalityDetected}`);
console.log(`Trend: ${forecast.trendDirection}`);
console.log(`Accuracy: ${forecast.accuracy}`);

forecast.predictions.forEach(pred => {
  console.log(`${pred.date}: ${pred.predictedDemand} (${pred.lowerBound}-${pred.upperBound})`);
});
```

### Disruption Prediction

```typescript
const predictions = engine.predictDisruptions(nodes, historicalIncidents, riskScores);

predictions.forEach(pred => {
  console.log(`Node: ${pred.nodeId}`);
  console.log(`Probability: ${pred.probability}`);
  console.log(`Impact: ${pred.expectedImpact}`);
  console.log(`Timeframe: ${pred.timeframe.start} - ${pred.timeframe.end}`);
});
```

### Scenario Analysis

```typescript
const assumptions = new Map([
  ['supplier_cost', { baseline: 100, scenario: 120 }],
  ['lead_time', { baseline: 30, scenario: 45 }],
]);

const scenario = engine.analyzeScenario(
  'Supplier Price Increase',
  'What if supplier costs increase by 20%?',
  assumptions,
  nodes,
  relationships
);

console.log(`Cost Impact: ${scenario.impacts.costImpact}`);
console.log(`Lead Time Impact: ${scenario.impacts.leadTimeImpact}`);
```

## Algorithms

- **Anomaly Detection**: Statistical deviation detection with moving averages
- **Pattern Recognition**: Autocorrelation and linear regression
- **Clustering**: K-means with Euclidean distance
- **Forecasting**: Exponential smoothing with trend and seasonal components
- **Disruption Prediction**: Risk-based probability modeling

## License

Proprietary - IntelGraph
