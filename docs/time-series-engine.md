# Time-Series Analysis Engine

This module provides a unified interface for ingesting, aggregating, downsampling, and analyzing time-series data across InfluxDB and TimescaleDB.

## Capabilities

- **Dual storage**: InfluxDB line protocol writes and Flux queries, plus TimescaleDB hypertable support with JSONB field storage.
- **Aggregation**: Windowed aggregation functions (`avg`, `sum`, `min`, `max`, `median`, `p95`, `p99`) via database queries or in-process pipelines.
- **Downsampling**: Deterministic LTTB sampling for visualization and fixed-bucket averaging for coarse retention tiers.
- **Anomaly detection**: Z-score (MAD) detection and seasonal EWMA.
- **Forecasting**: Lightweight ARIMA-like autoregression and Prophet-inspired trend/seasonality projection.
- **Dashboards**: Composable panel specs that pair observed series, anomalies, and forecast envelopes.

## Storage

TimescaleDB uses the `time_series_points` hypertable created by `server/migrations/20260314000000-time-series-engine.sql`, with JSONB tags and fields plus GIN indexes for flexible filters.

InfluxDB expects an existing org/bucket and uses line protocol writes along with Flux queries for range and aggregation operations.

## Usage

```ts
import {
  InfluxConnector,
  TimescaleConnector,
  TimeSeriesEngine,
} from '../src/time-series/index.js';

const engine = new TimeSeriesEngine(
  {
    influx: new InfluxConnector({ url, org, bucket, token }),
    timescale: new TimescaleConnector({ connectionString }),
  },
  'timescale',
);

const result = await engine.analyze({
  query: { measurement: 'metrics', start, end },
  aggregation: { every: '5m', function: 'avg' },
  downsample: { strategy: 'lttb', targetPoints: 100 },
  anomaly: { field: 'cpu', threshold: 3.5 },
  forecast: { field: 'cpu', model: 'prophet', horizon: 24 },
  dashboardName: 'SLOs',
});
```

Dashboards returned by `analyze` can be fed directly into existing visualization layers (Grafana, custom UI) because they expose normalized `series` and `annotations` data.
