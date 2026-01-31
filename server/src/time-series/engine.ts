import { seasonalEwmaAnomalies, zScoreAnomalies } from './analysis/anomaly.js';
import { arimaForecast, prophetForecast } from './analysis/forecast.js';
import { buildDashboard, DashboardSpec } from './dashboard/dashboard.js';
import { downsampleAverage, largestTriangleThreeBuckets } from './pipelines/downsampling.js';
import {
  AggregationParams,
  AggregationWindow,
  Anomaly,
  ForecastPoint,
  QueryRangeParams,
  TimeSeriesConnector,
  TimeSeriesRow,
} from './types.js';

export type DownsampleConfig = {
  strategy: 'average' | 'lttb';
  bucketSize?: number;
  targetPoints?: number;
};

export type AnomalyConfig = {
  field: string;
  strategy?: 'zscore' | 'seasonal';
  window?: number;
  threshold?: number;
  seasonality?: number;
};

export type ForecastConfig = {
  field: string;
  model: 'arima' | 'prophet';
  horizon: number;
};

export type AnalyzeOptions = {
  connector?: string;
  query: QueryRangeParams;
  aggregation?: AggregationWindow;
  downsample?: DownsampleConfig;
  anomaly?: AnomalyConfig;
  forecast?: ForecastConfig;
  dashboardName?: string;
  dashboardDescription?: string;
};

export class TimeSeriesEngine {
  private connectors: Record<string, TimeSeriesConnector>;
  private defaultConnector: string;

  constructor(connectors: Record<string, TimeSeriesConnector>, defaultConnector: string) {
    this.connectors = connectors;
    this.defaultConnector = defaultConnector;
  }

  async ingest(points: TimeSeriesRow[], connectorName?: string) {
    const connector = this.requireConnector(connectorName);
    const formatted = points.map((point) => ({
      measurement: 'default',
      fields: point.values,
      tags: point.tags,
      timestamp: point.timestamp,
    }));
    await connector.writePoints(formatted);
  }

  async fetch(params: QueryRangeParams, connectorName?: string, aggregation?: AggregationWindow) {
    const connector = this.requireConnector(connectorName);
    if (aggregation) {
      const aggParams: AggregationParams = { ...params, window: aggregation };
      return connector.aggregate(aggParams);
    }
    return connector.queryRange(params);
  }

  async analyze(options: AnalyzeOptions): Promise<{
    series: TimeSeriesRow[];
    anomalies: Anomaly[];
    forecast: ForecastPoint[];
    dashboard?: DashboardSpec;
  }> {
    const connector = options.connector ?? this.defaultConnector;
    const raw = await this.fetch(options.query, connector, options.aggregation);
    const series = this.applyDownsampling(raw, options.downsample);

    const anomalies = options.anomaly
      ? this.detectAnomalies(series, options.anomaly)
      : [];
    const forecast = options.forecast
      ? this.runForecast(series, options.forecast)
      : [];

    const dashboard = options.dashboardName
      ? buildDashboard(options.dashboardName, series, anomalies, forecast, options.dashboardDescription)
      : undefined;

    return { series, anomalies, forecast, dashboard };
  }

  private detectAnomalies(series: TimeSeriesRow[], config: AnomalyConfig) {
    if (!series.length) return [];
    const strategy = config.strategy ?? 'zscore';
    if (strategy === 'seasonal') {
      return seasonalEwmaAnomalies(series, config.field, config.seasonality ?? 24, 0.3, config.threshold ?? 3.0);
    }
    return zScoreAnomalies(series, config.field, config.window ?? 30, config.threshold ?? 3.5);
  }

  private runForecast(series: TimeSeriesRow[], config: ForecastConfig) {
    const values = series.map((row) => row.values[config.field]).filter((value): value is number => typeof value === 'number');
    if (!values.length) return [];
    if (config.model === 'prophet') {
      return prophetForecast(series, config.field, config.horizon);
    }
    const predictions = arimaForecast(values, config.horizon);
    const cadence = series.length >= 2
      ? series[1].timestamp.getTime() - series[0].timestamp.getTime()
      : 60_000;
    const lastTimestamp = series[series.length - 1].timestamp.getTime();
    return predictions.map((prediction, idx) => {
      const timestamp = new Date(lastTimestamp + (idx + 1) * cadence);
      return { timestamp, predicted: prediction, lower: prediction * 0.9, upper: prediction * 1.1 } satisfies ForecastPoint;
    });
  }

  private applyDownsampling(series: TimeSeriesRow[], config?: DownsampleConfig) {
    if (!config || !series.length) return series;
    if (config.strategy === 'average' && config.bucketSize) {
      return downsampleAverage(series, config.bucketSize);
    }
    if (config.strategy === 'lttb' && config.targetPoints) {
      return largestTriangleThreeBuckets(series, config.targetPoints);
    }
    return series;
  }

  private requireConnector(name?: string) {
    const connector = this.connectors[name ?? this.defaultConnector];
    if (!connector) {
      throw new Error(`Connector ${name ?? this.defaultConnector} not configured`);
    }
    return connector;
  }
}

export const __private__ = {
  durationToMs,
};

function durationToMs(window: AggregationWindow) {
  const match = window.every.match(/^(\d+)(ms|s|m|h|d)$/);
  if (!match) {
    throw new Error(`Invalid duration: ${window.every}`);
  }
  const value = Number(match[1]);
  const unit = match[2];
  switch (unit) {
    case 'ms':
      return value;
    case 's':
      return value * 1000;
    case 'm':
      return value * 60_000;
    case 'h':
      return value * 3_600_000;
    case 'd':
      return value * 86_400_000;
    default:
      throw new Error(`Unsupported duration unit: ${unit}`);
  }
}
