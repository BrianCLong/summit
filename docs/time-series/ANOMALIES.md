# Time Series Anomaly Detection Guide

## Overview

The IntelGraph Anomaly Detection system provides comprehensive anomaly detection capabilities for intelligence operations, including statistical methods, change point detection, real-time streaming detection, and contextual analysis.

## Anomaly Types

### 1. Point Anomalies

Individual data points significantly different from the rest.

**Example**: A single spike in network traffic

```typescript
import { StatisticalDetector } from '@intelgraph/anomaly-detection';

const detector = new StatisticalDetector({
  method: 'zscore',
  threshold: 3.0
});

const anomalies = detector.detectZScore(data, timestamps);
```

### 2. Contextual Anomalies

Points anomalous in specific context (e.g., time of day, season).

**Example**: High temperature in winter, normal in summer

```typescript
const detector = new StatisticalDetector({
  method: 'zscore',
  window_size: 50  // Use rolling window
});

const anomalies = detector.detectRollingZScore(data, timestamps);
```

### 3. Collective Anomalies

Sequences of points collectively anomalous.

**Example**: Gradual drift in sensor readings

```typescript
import { ChangePointDetector } from '@intelgraph/anomaly-detection';

const cpDetector = new ChangePointDetector();
const changePoints = cpDetector.detectCUSUM(data, timestamps, 5.0, 0.5);
```

## Detection Methods

### Statistical Methods

#### Z-Score Detection

Identifies points beyond N standard deviations from mean.

```typescript
const detector = new StatisticalDetector({
  method: 'zscore',
  threshold: 3.0,  // 3 standard deviations
  min_samples: 30
});

const anomalies = detector.detectZScore(data, timestamps);

anomalies.forEach(anomaly => {
  console.log(`Anomaly at ${anomaly.timestamp}`);
  console.log(`  Value: ${anomaly.value}`);
  console.log(`  Expected: ${anomaly.expected_value}`);
  console.log(`  Severity: ${anomaly.severity}`);
  console.log(`  Score: ${anomaly.anomaly_score}`);
});
```

**When to use:**
- Normally distributed data
- Need simple, interpretable method
- Have sufficient historical data

**Limitations:**
- Assumes normal distribution
- Sensitive to outliers in mean/std calculation
- May miss local anomalies

#### Rolling Z-Score

Uses sliding window for local context.

```typescript
const detector = new StatisticalDetector({
  method: 'zscore',
  threshold: 3.0,
  window_size: 50  // Last 50 points
});

const anomalies = detector.detectRollingZScore(data, timestamps);
```

**Advantages:**
- Adapts to concept drift
- Detects local anomalies
- Better for non-stationary data

#### IQR (Interquartile Range) Method

Uses quartiles, robust to outliers.

```typescript
const detector = new StatisticalDetector({
  method: 'iqr',
  threshold: 1.5  // IQR multiplier
});

const anomalies = detector.detectIQR(data, timestamps);
```

**Formula:**
- Lower bound = Q1 - 1.5 × IQR
- Upper bound = Q3 + 1.5 × IQR
- IQR = Q3 - Q1

**When to use:**
- Skewed distributions
- Presence of outliers
- Need robust method

#### MAD (Median Absolute Deviation)

Most robust to outliers.

```typescript
const detector = new StatisticalDetector({
  method: 'mad',
  threshold: 3.5
});

const anomalies = detector.detectMAD(data, timestamps);
```

**Formula:**
- MAD = median(|Xi - median(X)|)
- Modified Z-score = 0.6745 × (Xi - median(X)) / MAD

**When to use:**
- Heavily skewed data
- Many outliers
- Need maximum robustness

#### Grubbs' Test

Statistical hypothesis test for outliers.

```typescript
const detector = new StatisticalDetector({
  method: 'grubbs',
  threshold: 3.0
});

const anomalies = detector.detectGrubbs(data, timestamps);
```

**When to use:**
- Small datasets
- Single outlier detection
- Need statistical significance

### Change Point Detection

Identifies significant changes in time series behavior.

#### CUSUM (Cumulative Sum)

Detects changes in mean.

```typescript
import { ChangePointDetector } from '@intelgraph/anomaly-detection';

const detector = new ChangePointDetector();

const changePoints = detector.detectCUSUM(
  data,
  timestamps,
  5.0,  // threshold
  0.5   // drift (allowable deviation)
);

changePoints.forEach(cp => {
  console.log(`Change point at ${cp.timestamp}`);
  console.log(`  Confidence: ${cp.confidence}`);
  console.log(`  Change magnitude: ${cp.change_magnitude}`);
  console.log(`  Before mean: ${cp.before_stats.mean}`);
  console.log(`  After mean: ${cp.after_stats.mean}`);
});
```

**When to use:**
- Detect shifts in process mean
- Quality control applications
- Monitoring system performance

#### Bayesian Change Point Detection

Probabilistic approach to change detection.

```typescript
const changePoints = detector.detectBayesian(
  data,
  timestamps,
  0.01,  // hazard rate (prior probability of change)
  0.5    // detection threshold
);
```

**Advantages:**
- Online detection (sequential)
- Probabilistic interpretation
- Handles uncertainty well

#### Variance Change Detection

Detects changes in variability.

```typescript
const changePoints = detector.detectVarianceChange(
  data,
  timestamps,
  30,  // window size
  2.0  // F-statistic threshold
);
```

**When to use:**
- Monitor process stability
- Detect regime changes
- Quality assurance

#### Trend Change Detection

Identifies shifts in trend direction or magnitude.

```typescript
const changePoints = detector.detectTrendChange(
  data,
  timestamps,
  30,   // window size
  0.1   // threshold for trend difference
);
```

**When to use:**
- Long-term monitoring
- Detect policy changes
- Business intelligence

### Real-Time Streaming Detection

Process data points as they arrive.

```typescript
import { StreamingAnomalyDetector } from '@intelgraph/anomaly-detection';

const detector = new StreamingAnomalyDetector(
  100,  // buffer size
  3.0   // threshold
);

// Register callback for alerts
detector.onAnomaly(async (anomaly) => {
  console.log('REAL-TIME ANOMALY DETECTED!');
  console.log(anomaly);

  // Send alert
  await sendAlert(anomaly);

  // Log to database
  await logAnomaly(anomaly);
});

// Process incoming data
for await (const dataPoint of dataStream) {
  const anomaly = await detector.processPoint(
    dataPoint.value,
    dataPoint.timestamp
  );

  if (anomaly) {
    // Anomaly detected
  }
}
```

#### Contextual Streaming Detection

```typescript
const anomaly = await detector.detectContextual(
  value,
  timestamp,
  20  // window size
);
```

#### Rate of Change Detection

```typescript
const anomaly = await detector.detectRateChange(value, timestamp);
```

**Features:**
- Low latency (milliseconds)
- Minimal memory footprint
- Welford's online algorithm for statistics
- Automatic alert throttling

## Anomaly Severity Classification

Anomalies are automatically classified by severity:

```typescript
type Severity = 'low' | 'medium' | 'high' | 'critical';

// Based on anomaly score
if (score >= 3.0) return 'critical';    // >3 std dev
if (score >= 2.0) return 'high';        // 2-3 std dev
if (score >= 1.5) return 'medium';      // 1.5-2 std dev
return 'low';                           // <1.5 std dev
```

## Advanced Techniques

### Ensemble Anomaly Detection

Combine multiple detection methods:

```typescript
function ensembleDetection(
  data: number[],
  timestamps: Date[]
): Anomaly[] {
  const detectors = [
    new StatisticalDetector({ method: 'zscore', threshold: 3.0 }),
    new StatisticalDetector({ method: 'iqr', threshold: 1.5 }),
    new StatisticalDetector({ method: 'mad', threshold: 3.5 })
  ];

  const allAnomalies = detectors.map(d => d.detect(data, timestamps));

  // Combine using voting
  const anomalyMap = new Map<string, number>();

  for (const anomalies of allAnomalies) {
    for (const anomaly of anomalies) {
      const key = anomaly.timestamp.toISOString();
      anomalyMap.set(key, (anomalyMap.get(key) || 0) + 1);
    }
  }

  // Return points detected by majority
  return allAnomalies
    .flat()
    .filter(a => (anomalyMap.get(a.timestamp.toISOString()) || 0) >= 2);
}
```

### Seasonal Anomaly Detection

Account for seasonality:

```typescript
import { SeasonalDecomposition } from '@intelgraph/seasonal-decomposition';

// Decompose time series
const decomp = SeasonalDecomposition.additiveDecomposition(
  data,
  timestamps,
  24  // hourly data, daily seasonality
);

// Detect anomalies in residuals
const detector = new StatisticalDetector({ method: 'zscore', threshold: 3.0 });
const anomalies = detector.detect(decomp.residual, timestamps);
```

### Multivariate Anomaly Detection

Detect anomalies across multiple related metrics:

```typescript
function detectMultivariateAnomalies(
  metrics: Record<string, number[]>,
  timestamps: Date[]
): Anomaly[] {
  // Calculate Mahalanobis distance
  const means = Object.values(metrics).map(m => mean(m));
  const stds = Object.values(metrics).map(m => std(m));

  const anomalies: Anomaly[] = [];

  for (let i = 0; i < timestamps.length; i++) {
    // Standardize
    const standardized = Object.values(metrics).map((m, idx) =>
      (m[i] - means[idx]) / stds[idx]
    );

    // Calculate distance
    const distance = Math.sqrt(
      standardized.reduce((sum, val) => sum + val * val, 0)
    );

    if (distance > 3.0) {
      anomalies.push({
        timestamp: timestamps[i],
        value: distance,
        anomaly_score: distance / 3.0,
        severity: calculateSeverity(distance / 3.0),
        type: 'point',
        detector: 'multivariate',
        explanation: `Multivariate anomaly: distance ${distance.toFixed(2)}`
      });
    }
  }

  return anomalies;
}
```

## Anomaly Explanation

Provide context for detected anomalies:

```typescript
interface AnomalyExplanation {
  anomaly: Anomaly;
  contributing_factors: ContributingFactor[];
  similar_historical_anomalies?: Anomaly[];
  recommended_actions?: string[];
  root_cause_analysis?: string;
}

async function explainAnomaly(anomaly: Anomaly): Promise<AnomalyExplanation> {
  // Analyze contributing factors
  const factors: ContributingFactor[] = [];

  // Check for correlated metrics
  const correlatedMetrics = await findCorrelatedMetrics(anomaly);
  if (correlatedMetrics.length > 0) {
    factors.push({
      factor: 'Correlated metrics',
      contribution: 0.7,
      description: `Metrics ${correlatedMetrics.join(', ')} also anomalous`
    });
  }

  // Check for external events
  const externalEvents = await findExternalEvents(anomaly.timestamp);
  if (externalEvents.length > 0) {
    factors.push({
      factor: 'External event',
      contribution: 0.8,
      description: `Event: ${externalEvents[0].description}`
    });
  }

  // Find similar historical anomalies
  const similarAnomalies = await findSimilarAnomalies(anomaly);

  return {
    anomaly,
    contributing_factors: factors,
    similar_historical_anomalies: similarAnomalies,
    recommended_actions: generateRecommendations(factors)
  };
}
```

## Alerting and Notifications

### Alert Configuration

```typescript
interface AlertConfig {
  severity_threshold: 'low' | 'medium' | 'high' | 'critical';
  notification_channels: ('email' | 'slack' | 'pagerduty')[];
  throttle_minutes: number;
  aggregation_window: number;
}

const config: AlertConfig = {
  severity_threshold: 'high',
  notification_channels: ['slack', 'pagerduty'],
  throttle_minutes: 15,
  aggregation_window: 5
};
```

### Alert Handler

```typescript
async function handleAnomaly(anomaly: Anomaly, config: AlertConfig) {
  // Check severity threshold
  const severityLevel = ['low', 'medium', 'high', 'critical'];
  if (severityLevel.indexOf(anomaly.severity) <
      severityLevel.indexOf(config.severity_threshold)) {
    return; // Below threshold
  }

  // Get explanation
  const explanation = await explainAnomaly(anomaly);

  // Send notifications
  for (const channel of config.notification_channels) {
    switch (channel) {
      case 'email':
        await sendEmail({
          subject: `Anomaly Detected: ${anomaly.detector}`,
          body: formatAnomalyEmail(anomaly, explanation)
        });
        break;

      case 'slack':
        await sendSlackMessage({
          channel: '#anomalies',
          text: formatAnomalySlack(anomaly, explanation)
        });
        break;

      case 'pagerduty':
        await createPagerDutyIncident({
          severity: anomaly.severity,
          summary: `Anomaly: ${anomaly.explanation}`,
          details: explanation
        });
        break;
    }
  }
}
```

## Performance Optimization

### Batch Processing

```typescript
// Process in batches for efficiency
async function detectAnomaliesBatch(
  data: number[],
  timestamps: Date[],
  batchSize: number = 1000
): Promise<Anomaly[]> {
  const allAnomalies: Anomaly[] = [];

  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    const batchTimestamps = timestamps.slice(i, i + batchSize);

    const detector = new StatisticalDetector({ method: 'zscore', threshold: 3.0 });
    const anomalies = detector.detect(batch, batchTimestamps);

    allAnomalies.push(...anomalies);
  }

  return allAnomalies;
}
```

### Sampling for Large Datasets

```typescript
function detectWithSampling(
  data: number[],
  timestamps: Date[],
  sampleRate: number = 0.1
): Anomaly[] {
  const sampledIndices = [];
  for (let i = 0; i < data.length; i++) {
    if (Math.random() < sampleRate) {
      sampledIndices.push(i);
    }
  }

  const sampledData = sampledIndices.map(i => data[i]);
  const sampledTimestamps = sampledIndices.map(i => timestamps[i]);

  const detector = new StatisticalDetector({ method: 'zscore', threshold: 3.0 });
  return detector.detect(sampledData, sampledTimestamps);
}
```

## Best Practices

1. **Method Selection**
   - Start with Z-score for normally distributed data
   - Use IQR/MAD for skewed or outlier-prone data
   - Apply seasonal decomposition for seasonal data
   - Use ensemble for critical applications

2. **Threshold Tuning**
   - Start conservative (higher threshold)
   - Monitor false positive rate
   - Adjust based on domain knowledge
   - Consider business impact

3. **Real-Time Detection**
   - Use streaming detector for low latency
   - Implement alert throttling
   - Set appropriate buffer sizes
   - Monitor detector performance

4. **Validation**
   - Label historical anomalies
   - Calculate precision/recall
   - Use confusion matrix
   - Iterate on thresholds

5. **Production Deployment**
   - Implement comprehensive logging
   - Monitor detector performance
   - Set up alerting escalation
   - Plan for false positives

## Common Pitfalls

1. **Over-sensitivity**: Too many false positives
   - Solution: Increase threshold, use ensemble

2. **Under-sensitivity**: Missing real anomalies
   - Solution: Decrease threshold, try different methods

3. **Ignoring seasonality**: False positives from regular patterns
   - Solution: Decompose time series first

4. **Alert fatigue**: Too many notifications
   - Solution: Implement throttling, aggregate alerts

5. **Context ignorance**: Not considering business context
   - Solution: Add domain knowledge, external events

## Further Reading

- [IntelGraph Time Series Guide](./GUIDE.md)
- [IntelGraph Forecasting Guide](./FORECASTING.md)
- Chandola, V., Banerjee, A., & Kumar, V. (2009). Anomaly detection: A survey
- Aggarwal, C. C. (2017). Outlier Analysis
