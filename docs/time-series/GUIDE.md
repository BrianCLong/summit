# IntelGraph Time Series Analytics Platform - Complete Guide

## Overview

The IntelGraph Time Series Analytics Platform is an enterprise-grade solution for time series data storage, analysis, forecasting, and anomaly detection designed specifically for intelligence operations. It surpasses specialized tools like InfluxDB, Prometheus, and traditional forecasting platforms by providing integrated analytics, ML-powered predictions, and intelligence-focused features.

## Architecture

### Core Components

1. **Time Series Storage** (`@intelgraph/time-series`)
   - TimescaleDB integration with hypertables
   - Advanced compression algorithms
   - Retention policies and data lifecycle management
   - Multi-resolution storage
   - Fast time-range queries with indexing

2. **Forecasting Engine** (`@intelgraph/forecasting`)
   - ARIMA and SARIMA models
   - Exponential Smoothing (Holt-Winters)
   - Ensemble forecasting
   - Automated model selection
   - Backtesting and evaluation

3. **Anomaly Detection** (`@intelgraph/anomaly-detection`)
   - Statistical methods (Z-score, IQR, MAD, Grubbs)
   - Change point detection (CUSUM, Bayesian)
   - Real-time streaming detection
   - Contextual anomaly detection

4. **Seasonal Decomposition** (`@intelgraph/seasonal-decomposition`)
   - STL (Seasonal-Trend decomposition using Loess)
   - Classical additive/multiplicative decomposition
   - Seasonality strength metrics

5. **Feature Engineering** (`@intelgraph/ts-feature-engineering`)
   - Statistical features (mean, std, skewness, kurtosis)
   - Lag features and rolling windows
   - Trend analysis
   - Autocorrelation features
   - Entropy and complexity measures

### Services

1. **Time Series Service** (Port 3010)
   - REST API for data ingestion
   - Query and aggregation endpoints
   - Compression management
   - Real-time anomaly detection

2. **Forecasting Service** (Port 3011)
   - Forecasting endpoints (ARIMA, Exponential Smoothing)
   - Seasonal decomposition
   - Feature extraction
   - Auto model selection

## Quick Start

### Installation

```bash
# Install dependencies
pnpm install

# Build packages
pnpm -F @intelgraph/time-series build
pnpm -F @intelgraph/forecasting build
pnpm -F @intelgraph/anomaly-detection build
pnpm -F @intelgraph/seasonal-decomposition build
pnpm -F @intelgraph/ts-feature-engineering build

# Start services
pnpm -F @intelgraph/time-series-service dev
pnpm -F @intelgraph/forecasting-service dev
```

### Database Setup

```sql
-- Enable TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

-- Create time series metrics table
CREATE TABLE ts_metrics (
  time TIMESTAMPTZ NOT NULL,
  metric_name TEXT NOT NULL,
  entity_id TEXT,
  entity_type TEXT,
  value DOUBLE PRECISION NOT NULL,
  unit TEXT,
  tags JSONB,
  labels JSONB,
  dimensions JSONB,
  quality DOUBLE PRECISION DEFAULT 1.0,
  PRIMARY KEY (time, metric_name, entity_id)
);

-- Create hypertable
SELECT create_hypertable('ts_metrics', 'time',
  chunk_time_interval => INTERVAL '7 days'
);

-- Enable compression
ALTER TABLE ts_metrics SET (
  timescaledb.compress,
  timescaledb.compress_segmentby = 'metric_name, entity_id',
  timescaledb.compress_orderby = 'time DESC'
);

-- Add compression policy (compress data older than 7 days)
SELECT add_compression_policy('ts_metrics', INTERVAL '7 days');

-- Add retention policy (drop data older than 90 days)
SELECT add_retention_policy('ts_metrics', INTERVAL '90 days');

-- Create indexes
CREATE INDEX idx_ts_metrics_entity ON ts_metrics (entity_id, entity_type, time DESC);
CREATE INDEX idx_ts_metrics_name ON ts_metrics (metric_name, time DESC);
CREATE INDEX idx_ts_metrics_tags ON ts_metrics USING GIN (tags);
```

## Usage Examples

### 1. Storing Time Series Data

```typescript
import { TimescaleStorage } from '@intelgraph/time-series';
import { Pool } from 'pg';

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'intelgraph',
  user: 'intelgraph',
  password: 'password'
});

const storage = new TimescaleStorage(pool);
await storage.initialize();

// Insert metrics
await storage.insertMetrics([
  {
    timestamp: new Date(),
    metric_name: 'api_latency',
    entity_id: 'server-01',
    entity_type: 'server',
    value: 125.5,
    unit: 'ms',
    tags: { region: 'us-east-1', environment: 'production' }
  }
]);
```

### 2. Querying Time Series Data

```typescript
import { query } from '@intelgraph/time-series';

// Build query using fluent API
const tsQuery = query()
  .metric('api_latency')
  .entity('server-01')
  .last('24h')
  .interval('5m')
  .aggregate('avg')
  .build();

const results = await storage.queryAggregated(tsQuery);
```

### 3. Forecasting

```typescript
import { ARIMA } from '@intelgraph/forecasting';

// Fetch historical data
const data = await storage.query({
  start_time: new Date('2025-01-01'),
  end_time: new Date('2025-01-20'),
  metric_name: 'user_signups'
});

// Train ARIMA model
const model = new ARIMA({ p: 1, d: 1, q: 1 });
await model.fit(data.map(d => d.value));

// Generate 7-day forecast
const forecast = await model.forecast(7 * 24, 0.95);

console.log('Forecast:', forecast);
// Output: Array of ForecastPoints with predicted values and confidence intervals
```

### 4. Anomaly Detection

```typescript
import { StatisticalDetector } from '@intelgraph/anomaly-detection';

// Fetch data
const data = await storage.query({
  start_time: new Date('2025-01-01'),
  end_time: new Date('2025-01-20'),
  metric_name: 'transaction_volume'
});

// Detect anomalies using Z-score
const detector = new StatisticalDetector({
  method: 'zscore',
  threshold: 3.0,
  window_size: 50
});

const anomalies = detector.detect(
  data.map(d => d.value),
  data.map(d => new Date(d.timestamp))
);

console.log(`Found ${anomalies.length} anomalies`);
```

### 5. Real-time Streaming Anomaly Detection

```typescript
import { StreamingAnomalyDetector } from '@intelgraph/anomaly-detection';

const streamDetector = new StreamingAnomalyDetector(100, 3.0);

// Register callback for anomaly alerts
streamDetector.onAnomaly(async (anomaly) => {
  console.log('ALERT:', anomaly);
  // Send notification, update dashboard, etc.
});

// Process incoming data points
streamDetector.processPoint(value, new Date());
```

### 6. Seasonal Decomposition

```typescript
import { SeasonalDecomposition } from '@intelgraph/seasonal-decomposition';

// Fetch data
const data = await storage.query({
  start_time: new Date('2024-01-01'),
  end_time: new Date('2025-01-01'),
  metric_name: 'daily_sales'
});

// Perform STL decomposition
const decomposition = SeasonalDecomposition.stlDecomposition(
  data.map(d => d.value),
  data.map(d => new Date(d.timestamp)),
  { period: 7 } // Weekly seasonality
);

console.log('Seasonality strength:', decomposition.seasonality_strength);
console.log('Trend strength:', decomposition.trend_strength);
```

### 7. Feature Engineering

```typescript
import { FeatureExtractor } from '@intelgraph/ts-feature-engineering';

// Extract features from time series
const features = FeatureExtractor.extractFeatures(
  data.map(d => d.value),
  data.map(d => new Date(d.timestamp))
);

console.log('Features:', {
  mean: features.mean,
  trend_slope: features.trend_slope,
  num_peaks: features.num_peaks,
  entropy: features.entropy
});
```

## REST API Reference

### Time Series Service (Port 3010)

#### Health Check
```
GET /health
```

#### Initialize Storage
```
POST /api/v1/timeseries/initialize
```

#### Insert Metrics
```
POST /api/v1/timeseries/metrics
Content-Type: application/json

{
  "metrics": [
    {
      "timestamp": "2025-01-20T10:00:00Z",
      "metric_name": "cpu_usage",
      "entity_id": "server-01",
      "value": 75.5,
      "tags": { "region": "us-east-1" }
    }
  ]
}
```

#### Query Metrics
```
POST /api/v1/timeseries/query
Content-Type: application/json

{
  "start_time": "2025-01-01T00:00:00Z",
  "end_time": "2025-01-20T00:00:00Z",
  "metric_name": "cpu_usage",
  "entity_id": "server-01",
  "limit": 1000
}
```

#### Query Aggregated Metrics
```
POST /api/v1/timeseries/query/aggregate
Content-Type: application/json

{
  "start_time": "2025-01-01T00:00:00Z",
  "end_time": "2025-01-20T00:00:00Z",
  "metric_name": "cpu_usage",
  "interval": "1 hour",
  "aggregation": "avg"
}
```

#### Detect Anomalies
```
POST /api/v1/timeseries/anomalies/detect
Content-Type: application/json

{
  "start_time": "2025-01-01T00:00:00Z",
  "end_time": "2025-01-20T00:00:00Z",
  "metric_name": "transaction_volume",
  "method": "zscore",
  "threshold": 3.0
}
```

### Forecasting Service (Port 3011)

#### ARIMA Forecast
```
POST /api/v1/forecast/arima
Content-Type: application/json

{
  "metric_name": "user_signups",
  "start_time": "2025-01-01T00:00:00Z",
  "end_time": "2025-01-20T00:00:00Z",
  "horizon": 168,
  "config": {
    "p": 1,
    "d": 1,
    "q": 1
  }
}
```

#### Exponential Smoothing Forecast
```
POST /api/v1/forecast/exponential-smoothing
Content-Type: application/json

{
  "metric_name": "daily_sales",
  "start_time": "2024-01-01T00:00:00Z",
  "end_time": "2025-01-01T00:00:00Z",
  "horizon": 30,
  "config": {
    "trend": "add",
    "seasonal": "add",
    "seasonal_periods": 7
  }
}
```

#### Seasonal Decomposition
```
POST /api/v1/decompose/seasonal
Content-Type: application/json

{
  "metric_name": "website_traffic",
  "start_time": "2024-01-01T00:00:00Z",
  "end_time": "2025-01-01T00:00:00Z",
  "period": 24,
  "method": "stl"
}
```

#### Extract Features
```
POST /api/v1/features/extract
Content-Type: application/json

{
  "metric_name": "sensor_readings",
  "start_time": "2025-01-01T00:00:00Z",
  "end_time": "2025-01-20T00:00:00Z"
}
```

## Performance Optimization

### Compression

Time series data is automatically compressed using TimescaleDB compression:

```typescript
// Configure compression
await storage.enableCompression('ts_metrics', '7 days');

// Check compression stats
const stats = await storage.getCompressionStats('ts_metrics');
console.log(`Compression ratio: ${stats.compression_ratio}x`);
```

### Continuous Aggregates

Create pre-aggregated views for faster queries:

```typescript
await storage.createContinuousAggregate({
  view_name: 'ts_metrics_hourly',
  source_table: 'ts_metrics',
  time_bucket: '1 hour',
  refresh_interval: '1 hour',
  materialized: true
});
```

### Retention Policies

Automatically drop old data:

```typescript
await storage.addRetentionPolicy({
  policy_name: 'drop_old_metrics',
  table_name: 'ts_metrics',
  drop_after: '90 days'
});
```

## Best Practices

1. **Data Ingestion**
   - Batch insert metrics for better performance
   - Use appropriate tags for filtering
   - Set quality scores for data validation

2. **Querying**
   - Use time-range indexes for fast queries
   - Leverage continuous aggregates for repeated queries
   - Use appropriate aggregation intervals

3. **Forecasting**
   - Ensure sufficient training data (minimum 2-3 seasonal cycles)
   - Validate forecasts using backtesting
   - Monitor forecast accuracy over time

4. **Anomaly Detection**
   - Choose appropriate detection method for your data
   - Tune sensitivity thresholds based on use case
   - Use contextual detection for complex patterns

5. **Storage Optimization**
   - Enable compression for old data
   - Set retention policies based on requirements
   - Monitor chunk sizes and compression ratios

## Troubleshooting

### Common Issues

**Issue**: Slow queries
- **Solution**: Check indexes, use continuous aggregates, reduce query time ranges

**Issue**: High storage usage
- **Solution**: Enable compression, set retention policies, optimize chunk intervals

**Issue**: Poor forecast accuracy
- **Solution**: Increase training data, try different models, handle seasonality

**Issue**: Too many false positive anomalies
- **Solution**: Increase detection threshold, use rolling window statistics

## Advanced Topics

See additional documentation:
- [FORECASTING.md](./FORECASTING.md) - Advanced forecasting techniques
- [ANOMALIES.md](./ANOMALIES.md) - Comprehensive anomaly detection guide

## Support

For issues and questions:
- GitHub Issues: https://github.com/intelgraph/summit/issues
- Documentation: https://docs.intelgraph.com/time-series
- Team: intelligence-platform@intelgraph.com
