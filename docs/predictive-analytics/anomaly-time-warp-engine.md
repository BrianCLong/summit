# Anomaly Time-Warp Engine™ Specification

> **Version**: 1.0.0
> **Last Updated**: 2025-11-27
> **Status**: Production-Ready
> **Owner**: Predictive Analytics Team

## Executive Summary

The **Anomaly Time-Warp Engine™** is a temporal anomaly prediction system that determines not just *that* anomalies will occur, but *when* they will be detectable and what their precursor signals are. By analyzing time-series patterns with dynamic temporal warping, the engine identifies early warning indicators and provides actionable time windows for preventive intervention.

### Key Capabilities

- **Anomaly Onset Prediction**: Forecasts when anomalies will emerge with confidence intervals
- **Precursor Signal Detection**: Identifies leading indicators that precede anomalies
- **Time-Warped Timeline Analysis**: Compresses/expands temporal patterns to reveal hidden relationships
- **Preventive Intervention Planning**: Recommends actions based on predicted anomaly windows
- **Multi-Scale Temporal Analysis**: Analyzes patterns across seconds, minutes, hours, days, and weeks

---

## Problem Statement

Traditional anomaly detection is **reactive** - it identifies anomalies after they occur. This creates several critical gaps:

1. **Detection Lag**: By the time an anomaly is detected, damage may already be done
2. **Missing Context**: Without understanding precursor signals, root causes remain unclear
3. **No Prevention**: Reactive systems cannot prevent anomalies, only respond to them
4. **Temporal Blindness**: Fixed time windows miss patterns that operate at different scales

### Real-World Scenarios

**Intelligence Analysis**:
- Network intrusion attempts show characteristic precursor patterns (port scanning, authentication probing) hours before the main attack
- Financial fraud exhibits micro-patterns in transaction timing before large-scale theft

**Infrastructure Monitoring**:
- Server failures are often preceded by subtle CPU/memory oscillations 15-30 minutes prior
- Database performance degradation shows query pattern changes before critical slowdowns

**Operational Security**:
- Insider threats demonstrate behavioral shifts (access pattern changes, data download patterns) days before incidents
- Supply chain compromises show communication pattern anomalies weeks before discovery

---

## Solution Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    Anomaly Time-Warp Engine                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐      ┌──────────────┐      ┌──────────────┐ │
│  │   Anomaly    │      │  Precursor   │      │   Timeline   │ │
│  │  Predictor   │─────▶│  Extractor   │─────▶│   Warper     │ │
│  └──────────────┘      └──────────────┘      └──────────────┘ │
│         │                      │                      │        │
│         │                      │                      │        │
│         ▼                      ▼                      ▼        │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │              Intervention Planner                        │ │
│  └──────────────────────────────────────────────────────────┘ │
│                              │                                │
└──────────────────────────────┼────────────────────────────────┘
                               │
                               ▼
                    ┌────────────────────┐
                    │   TimescaleDB      │
                    │  (Time-Series DB)  │
                    └────────────────────┘
```

### Core Components

#### 1. Anomaly Predictor
**Purpose**: Forecasts when anomalies will occur based on historical patterns

**Techniques**:
- **ARIMA/SARIMA**: Seasonal trend analysis for periodic anomalies
- **LSTM Networks**: Deep learning for complex temporal dependencies
- **Prophet**: Facebook's forecasting library for business-critical patterns
- **Ensemble Methods**: Combines multiple predictors for robust forecasts

**Output**: Predicted anomaly onset windows with confidence scores

#### 2. Precursor Extractor
**Purpose**: Identifies leading indicators that precede anomalies

**Techniques**:
- **Granger Causality**: Statistical test for temporal precedence
- **Cross-Correlation Analysis**: Finds lagged correlations between signals
- **Wavelet Transform**: Multi-resolution analysis for different time scales
- **Information Theory**: Mutual information and transfer entropy

**Output**: Ranked list of precursor signals with lead times

#### 3. Timeline Warper
**Purpose**: Dynamically stretches/compresses time to reveal hidden patterns

**Techniques**:
- **Dynamic Time Warping (DTW)**: Aligns similar patterns at different speeds
- **Shapelet Discovery**: Finds characteristic sub-sequences
- **Temporal Attention**: Learns which time segments are most important
- **Multi-Scale Decomposition**: Analyzes patterns at multiple resolutions

**Output**: Time-warped timelines showing aligned patterns

#### 4. Intervention Planner
**Purpose**: Recommends preventive actions based on predictions

**Strategies**:
- **Alert Escalation**: Notify appropriate teams within action windows
- **Automated Mitigation**: Trigger defensive measures (rate limiting, circuit breakers)
- **Resource Preallocation**: Scale systems before predicted load spikes
- **Investigative Actions**: Initiate deep dives into precursor signals

**Output**: Actionable intervention plans with timing requirements

---

## Core Algorithms

### Algorithm 1: Anomaly Onset Prediction

**Input**: Time-series data with historical anomaly labels

**Process**:
```python
1. Extract Features:
   - Statistical moments (mean, variance, skewness, kurtosis)
   - Frequency domain features (FFT, spectral entropy)
   - Temporal features (autocorrelation, partial autocorrelation)
   - Non-linear features (Lyapunov exponent, fractal dimension)

2. Train Prediction Model:
   - Use ensemble of ARIMA, LSTM, and Prophet
   - Train on windows preceding known anomalies
   - Learn characteristic pre-anomaly signatures

3. Generate Predictions:
   - Forecast future values with uncertainty bounds
   - Detect when forecast enters anomaly-prone regions
   - Calculate confidence based on model agreement

4. Determine Onset Window:
   - Lower bound: Earliest possible anomaly time
   - Upper bound: Latest possible anomaly time
   - Confidence: Probability of anomaly in window
```

**Output**:
```typescript
{
  anomalyId: string,
  predictedOnsetTime: Date,
  onsetWindow: {
    earliest: Date,
    latest: Date,
    confidence: number  // 0-1
  },
  expectedSeverity: 'low' | 'medium' | 'high' | 'critical',
  contributingFactors: string[]
}
```

### Algorithm 2: Precursor Signal Extraction

**Input**: Multi-variate time-series with target anomaly events

**Process**:
```python
1. Identify Candidate Signals:
   - All metrics that exist before anomaly onset
   - Filter by temporal coverage and quality

2. Test Temporal Precedence:
   - Granger causality test: Does signal help predict anomaly?
   - Cross-correlation: Find optimal lag between signal and anomaly
   - Information gain: Mutual information between signal and anomaly

3. Rank Precursors:
   - Lead time: How far in advance does signal appear?
   - Reliability: How consistently does signal precede anomaly?
   - Specificity: Does signal precede only this anomaly type?
   - Amplitude: How strong is the precursor signal?

4. Extract Signal Patterns:
   - Characteristic shape (increasing, oscillating, step-change)
   - Threshold values that indicate anomaly risk
   - Duration of precursor activity
```

**Output**:
```typescript
{
  signalId: string,
  signalName: string,
  leadTime: number,  // milliseconds before anomaly
  reliability: number,  // 0-1
  characteristicPattern: {
    shape: 'increasing' | 'decreasing' | 'oscillating' | 'step',
    thresholds: {
      warning: number,
      critical: number
    },
    typicalDuration: number  // milliseconds
  }
}
```

### Algorithm 3: Timeline Warping

**Input**: Multiple time-series to align and compare

**Process**:
```python
1. Normalize Timelines:
   - Z-score normalization for amplitude
   - Min-max scaling for bounded metrics
   - Log transform for skewed distributions

2. Apply Dynamic Time Warping:
   - Compute DTW distance matrix
   - Find optimal alignment path
   - Allow local time stretching/compression

3. Multi-Scale Analysis:
   - Decompose into trend, seasonal, residual
   - Warp each component separately
   - Reconstruct aligned timeline

4. Identify Temporal Landmarks:
   - Key events that align across timelines
   - Anchor points for warping
   - Temporal reference frame
```

**Output**:
```typescript
{
  originalTimeline: TimeSeries,
  warpedTimeline: TimeSeries,
  warpingPath: Array<{
    originalTime: Date,
    warpedTime: Date,
    stretchFactor: number  // >1 = stretched, <1 = compressed
  }>,
  alignmentScore: number,  // 0-1
  temporalLandmarks: Array<{
    time: Date,
    eventType: string,
    significance: number
  }>
}
```

### Algorithm 4: Intervention Planning

**Input**: Anomaly prediction with precursor signals

**Process**:
```python
1. Calculate Action Window:
   - Start: When first precursor crosses warning threshold
   - End: Predicted anomaly onset (earliest bound)
   - Buffer: Safety margin based on intervention latency

2. Determine Intervention Type:
   - If actionWindow > 1 hour: Proactive mitigation
   - If actionWindow > 15 min: Preemptive alerts
   - If actionWindow > 5 min: Automated defensive measures
   - If actionWindow < 5 min: Emergency response protocols

3. Prioritize Actions:
   - Impact: Severity of predicted anomaly
   - Feasibility: Can action be completed in time?
   - Cost: Resources required for intervention
   - Reversibility: Can action be undone if false alarm?

4. Generate Execution Plan:
   - Ordered list of actions with timing
   - Responsible teams/systems
   - Success criteria and rollback procedures
```

**Output**:
```typescript
{
  interventionId: string,
  actionWindow: {
    start: Date,
    end: Date,
    durationMs: number
  },
  recommendedActions: Array<{
    actionType: string,
    priority: number,
    estimatedDuration: number,
    prerequisites: string[],
    successCriteria: string[]
  }>,
  estimatedPreventionProbability: number  // 0-1
}
```

---

## API Design

### GraphQL Schema

```graphql
type AnomalyPrediction {
  id: ID!
  targetEntity: Entity!
  predictedOnsetTime: DateTime!
  onsetWindow: OnsetWindow!
  expectedSeverity: Severity!
  confidence: Float!
  contributingFactors: [String!]!
  precursorSignals: [PrecursorSignal!]!
  createdAt: DateTime!
  updatedAt: DateTime!
}

type OnsetWindow {
  earliest: DateTime!
  latest: DateTime!
  confidence: Float!
  timeUntilOnset: Duration!
}

type PrecursorSignal {
  id: ID!
  signalName: String!
  leadTimeMs: Int!
  reliability: Float!
  currentValue: Float!
  characteristicPattern: SignalPattern!
  thresholds: SignalThresholds!
  detectedAt: DateTime!
}

type SignalPattern {
  shape: PatternShape!
  typicalDuration: Int!
  description: String!
}

type SignalThresholds {
  warning: Float!
  critical: Float!
  currentStatus: ThresholdStatus!
}

type WarpedTimeline {
  id: ID!
  originalTimeline: TimeSeries!
  warpedTimeline: TimeSeries!
  warpingPath: [WarpingPoint!]!
  alignmentScore: Float!
  temporalLandmarks: [TemporalLandmark!]!
}

type WarpingPoint {
  originalTime: DateTime!
  warpedTime: DateTime!
  stretchFactor: Float!
}

type TemporalLandmark {
  time: DateTime!
  eventType: String!
  significance: Float!
  description: String!
}

type PreventiveIntervention {
  id: ID!
  anomalyPrediction: AnomalyPrediction!
  actionWindow: ActionWindow!
  recommendedActions: [InterventionAction!]!
  estimatedPreventionProbability: Float!
  status: InterventionStatus!
  createdAt: DateTime!
  executedAt: DateTime
}

type ActionWindow {
  start: DateTime!
  end: DateTime!
  durationMs: Int!
  remainingTimeMs: Int!
}

type InterventionAction {
  actionType: String!
  priority: Int!
  estimatedDuration: Int!
  prerequisites: [String!]!
  successCriteria: [String!]!
  status: ActionStatus!
}

enum Severity {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}

enum PatternShape {
  INCREASING
  DECREASING
  OSCILLATING
  STEP
  SPIKE
}

enum ThresholdStatus {
  NORMAL
  WARNING
  CRITICAL
}

enum InterventionStatus {
  PENDING
  IN_PROGRESS
  COMPLETED
  FAILED
  CANCELLED
}

enum ActionStatus {
  PENDING
  IN_PROGRESS
  COMPLETED
  FAILED
  SKIPPED
}

type Query {
  """
  Predict upcoming anomalies for an entity within a time window
  """
  predictAnomalies(
    entityId: ID!
    lookaheadMs: Int!
    minConfidence: Float = 0.5
  ): [AnomalyPrediction!]!

  """
  Get precursor signals for a predicted anomaly
  """
  getPrecursors(
    anomalyPredictionId: ID!
    minReliability: Float = 0.6
  ): [PrecursorSignal!]!

  """
  Generate time-warped timeline aligning current pattern with historical anomalies
  """
  getWarpedTimeline(
    entityId: ID!
    referenceAnomalyId: ID!
    timeWindowMs: Int!
  ): WarpedTimeline!

  """
  Get intervention plan for a predicted anomaly
  """
  planIntervention(
    anomalyPredictionId: ID!
  ): PreventiveIntervention!

  """
  Get active interventions requiring attention
  """
  getActiveInterventions(
    status: InterventionStatus
  ): [PreventiveIntervention!]!
}

type Mutation {
  """
  Start monitoring an entity for anomalies
  """
  monitorForAnomalies(
    entityId: ID!
    monitoringConfig: MonitoringConfig!
  ): MonitoringSession!

  """
  Update detection window parameters
  """
  setDetectionWindow(
    sessionId: ID!
    lookaheadMs: Int!
    minConfidence: Float!
  ): MonitoringSession!

  """
  Execute a planned intervention
  """
  executeIntervention(
    interventionId: ID!
    actions: [String!]
  ): InterventionExecution!

  """
  Record intervention outcome for learning
  """
  recordInterventionOutcome(
    interventionId: ID!
    outcome: InterventionOutcome!
  ): PreventiveIntervention!
}

input MonitoringConfig {
  lookaheadMs: Int!
  minConfidence: Float!
  enableAutomaticIntervention: Boolean!
  notificationChannels: [String!]!
}

input InterventionOutcome {
  success: Boolean!
  anomalyPrevented: Boolean!
  actualSeverity: Severity
  notes: String
}

type MonitoringSession {
  id: ID!
  entityId: ID!
  config: MonitoringConfig!
  status: String!
  startedAt: DateTime!
}

type InterventionExecution {
  interventionId: ID!
  executionId: ID!
  status: InterventionStatus!
  startedAt: DateTime!
  completedAt: DateTime
  results: [ActionResult!]!
}

type ActionResult {
  actionType: String!
  status: ActionStatus!
  duration: Int!
  message: String!
}
```

### REST Endpoints (Supplementary)

For high-frequency monitoring and alerting:

```
POST   /api/timewarp/predict          - Generate anomaly predictions
GET    /api/timewarp/precursors/:id   - Get precursor signals
POST   /api/timewarp/warp             - Generate warped timeline
POST   /api/timewarp/intervene        - Plan intervention
GET    /api/timewarp/monitor/:entityId - Stream monitoring events (SSE)
```

---

## TimescaleDB Integration

### Schema Design

```sql
-- Hypertable for time-series metrics
CREATE TABLE time_series_metrics (
  time TIMESTAMPTZ NOT NULL,
  entity_id UUID NOT NULL,
  metric_name TEXT NOT NULL,
  value DOUBLE PRECISION,
  metadata JSONB,
  PRIMARY KEY (time, entity_id, metric_name)
);

SELECT create_hypertable('time_series_metrics', 'time');

-- Index for entity-based queries
CREATE INDEX idx_metrics_entity ON time_series_metrics (entity_id, time DESC);

-- Anomaly predictions table
CREATE TABLE anomaly_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID NOT NULL,
  predicted_onset_time TIMESTAMPTZ NOT NULL,
  onset_earliest TIMESTAMPTZ NOT NULL,
  onset_latest TIMESTAMPTZ NOT NULL,
  confidence DOUBLE PRECISION NOT NULL,
  expected_severity TEXT NOT NULL,
  contributing_factors JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_predictions_entity_time ON anomaly_predictions (entity_id, predicted_onset_time);

-- Precursor signals table
CREATE TABLE precursor_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  anomaly_prediction_id UUID REFERENCES anomaly_predictions(id),
  signal_name TEXT NOT NULL,
  lead_time_ms INTEGER NOT NULL,
  reliability DOUBLE PRECISION NOT NULL,
  characteristic_pattern JSONB,
  thresholds JSONB,
  detected_at TIMESTAMPTZ DEFAULT NOW()
);

-- Interventions table
CREATE TABLE preventive_interventions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  anomaly_prediction_id UUID REFERENCES anomaly_predictions(id),
  action_window_start TIMESTAMPTZ NOT NULL,
  action_window_end TIMESTAMPTZ NOT NULL,
  recommended_actions JSONB,
  prevention_probability DOUBLE PRECISION,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  executed_at TIMESTAMPTZ
);

-- Continuous aggregates for performance
CREATE MATERIALIZED VIEW hourly_metric_aggregates
WITH (timescaledb.continuous) AS
SELECT
  time_bucket('1 hour', time) AS bucket,
  entity_id,
  metric_name,
  AVG(value) AS avg_value,
  STDDEV(value) AS stddev_value,
  MIN(value) AS min_value,
  MAX(value) AS max_value
FROM time_series_metrics
GROUP BY bucket, entity_id, metric_name;

-- Retention policy (keep raw data for 90 days, aggregates for 1 year)
SELECT add_retention_policy('time_series_metrics', INTERVAL '90 days');
SELECT add_retention_policy('hourly_metric_aggregates', INTERVAL '1 year');
```

### Query Patterns

**1. Recent Predictions**:
```sql
SELECT * FROM anomaly_predictions
WHERE entity_id = $1
  AND predicted_onset_time > NOW()
  AND confidence > $2
ORDER BY predicted_onset_time ASC
LIMIT 10;
```

**2. Precursor Signals**:
```sql
SELECT ps.*
FROM precursor_signals ps
JOIN anomaly_predictions ap ON ps.anomaly_prediction_id = ap.id
WHERE ap.entity_id = $1
  AND ps.reliability > $2
ORDER BY ps.lead_time_ms DESC;
```

**3. Time-Series Window**:
```sql
SELECT * FROM time_series_metrics
WHERE entity_id = $1
  AND metric_name = $2
  AND time >= NOW() - INTERVAL '24 hours'
ORDER BY time DESC;
```

---

## Performance Considerations

### Optimization Strategies

1. **Incremental Prediction**:
   - Don't recompute entire forecasts on every update
   - Use sliding window approach with overlapping predictions
   - Cache intermediate results (FFT, autocorrelation)

2. **Parallel Processing**:
   - Process multiple entities concurrently
   - Distribute precursor extraction across workers
   - Use GPU acceleration for LSTM/neural network inference

3. **Smart Sampling**:
   - Adaptive sampling based on signal volatility
   - Higher frequency for fast-changing metrics
   - Lower frequency for stable baselines

4. **Materialized Views**:
   - Pre-compute statistical summaries (hourly_metric_aggregates)
   - Refresh on schedule or triggered by data volume thresholds

### Scalability Targets

- **Prediction Latency**: < 5 seconds for 95th percentile
- **Throughput**: 1000+ entities monitored concurrently
- **Data Retention**: 90 days raw, 1 year aggregated
- **Update Frequency**: Per-entity predictions every 5 minutes
- **Precursor Detection**: < 30 seconds for new signals

---

## Monitoring & Observability

### Key Metrics

```javascript
// Prediction accuracy
timewarp_prediction_accuracy_ratio{severity}
timewarp_false_positive_rate{severity}
timewarp_lead_time_seconds{percentile}

// Performance
timewarp_prediction_duration_seconds{algorithm}
timewarp_precursor_extraction_duration_seconds
timewarp_timeline_warp_duration_seconds

// Operational
timewarp_active_monitoring_sessions
timewarp_predictions_generated_total
timewarp_interventions_executed_total{status}
timewarp_anomalies_prevented_total
```

### Health Checks

```javascript
GET /health/timewarp
{
  "status": "healthy",
  "checks": {
    "timescaledb": "up",
    "prediction_models": "loaded",
    "last_prediction": "2025-11-27T10:45:00Z",
    "active_sessions": 42,
    "pending_interventions": 3
  }
}
```

---

## Use Cases & Examples

### Use Case 1: Network Intrusion Detection

**Scenario**: Predict DDoS attack 15 minutes before traffic spike

**Precursor Signals**:
- Gradual increase in connection rate (10 min lead)
- Geographic diversity of source IPs (12 min lead)
- Unusual port scanning patterns (15 min lead)

**Intervention**:
- Activate rate limiting at network edge
- Scale up load balancers
- Alert security operations center

### Use Case 2: Database Performance Degradation

**Scenario**: Predict query timeout cascade 20 minutes before critical slowdown

**Precursor Signals**:
- Increasing query execution time variance (25 min lead)
- Connection pool saturation rising (20 min lead)
- Lock wait time trending upward (18 min lead)

**Intervention**:
- Preemptively scale read replicas
- Activate query result caching
- Notify DBA team for investigation

### Use Case 3: Insider Threat Detection

**Scenario**: Predict data exfiltration attempt 48 hours before execution

**Precursor Signals**:
- Gradual increase in after-hours access (72 hours lead)
- Unusual file access patterns (60 hours lead)
- Network traffic to external storage sites (48 hours lead)

**Intervention**:
- Increase audit logging for user
- Require additional authentication factors
- Alert security team for investigation

---

## Future Enhancements

### Phase 2: Adaptive Learning
- Continuously update models based on intervention outcomes
- Learn entity-specific anomaly signatures
- Personalized lead time predictions

### Phase 3: Causal Analysis
- Identify root causes from precursor graph
- Simulate intervention outcomes before execution
- Generate explanations for predictions

### Phase 4: Cross-Entity Correlation
- Detect anomaly propagation across related entities
- Predict cascading failures
- Global intervention orchestration

---

## References

- Dynamic Time Warping: Sakoe & Chiba (1978)
- Granger Causality: Granger (1969)
- Facebook Prophet: Taylor & Letham (2017)
- TimescaleDB Documentation: https://docs.timescale.com/
- ARIMA/SARIMA: Box & Jenkins (1970)

---

## Appendix A: Mathematical Foundations

### Dynamic Time Warping Distance

```
DTW(X, Y) = min { Σ d(x_i, y_j) × w_k }
            path

where:
- X, Y are time series
- d(x_i, y_j) is point-to-point distance
- w_k is weight of step k in warping path
```

### Granger Causality Test

```
H0: Y does not Granger-cause X

Test: F-statistic comparing:
- X(t) = α + Σ β_i X(t-i) + ε_t
- X(t) = α + Σ β_i X(t-i) + Σ γ_j Y(t-j) + ε_t

If γ coefficients are jointly significant, reject H0
```

### Transfer Entropy

```
TE(Y→X) = Σ p(x_t+1, x_t, y_t) × log( p(x_t+1 | x_t, y_t) / p(x_t+1 | x_t) )

Measures information flow from Y to X
```

---

**End of Specification**
