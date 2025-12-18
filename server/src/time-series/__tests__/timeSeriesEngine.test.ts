import { __private__ as influxPrivate } from '../connectors/influx-connector.js';
import { TimeSeriesEngine } from '../engine.js';
import { prophetForecast } from '../analysis/forecast.js';
import { largestTriangleThreeBuckets } from '../pipelines/downsampling.js';
import { TimeSeriesConnector, TimeSeriesRow } from '../types.js';

describe('time-series engine', () => {
  it('formats Influx line protocol with tags and timestamp', () => {
    const point: TimeSeriesRow = {
      timestamp: new Date('2024-01-01T00:00:00Z'),
      values: { cpu: 0.5 },
      tags: { host: 'edge-1' },
    };
    const line = influxPrivate.toLineProtocol({
      measurement: 'metrics',
      fields: point.values,
      tags: point.tags,
      timestamp: point.timestamp,
    });
    expect(line).toContain('metrics,host=edge-1 cpu=0.5');
    expect(line).toContain('000000000');
  });

  it('runs anomaly detection, forecasting, downsampling, and dashboard composition', async () => {
    const now = Date.now();
    const series: TimeSeriesRow[] = Array.from({ length: 60 }, (_, idx) => ({
      timestamp: new Date(now + idx * 60_000),
      values: { cpu: idx === 40 ? 50 : idx + 1 },
    }));

    const connector = new MemoryConnector(series);
    const engine = new TimeSeriesEngine({ timescale: connector }, 'timescale');
    const result = await engine.analyze({
      query: {
        measurement: 'metrics',
        start: new Date(now),
        end: new Date(now + 60 * 60_000),
      },
      downsample: { strategy: 'lttb', targetPoints: 10 },
      anomaly: { field: 'cpu', strategy: 'zscore', threshold: 3 },
      forecast: { field: 'cpu', model: 'arima', horizon: 3 },
      dashboardName: 'operations',
    });

    expect(result.series.length).toBeLessThan(series.length);
    expect(result.anomalies.length).toBeGreaterThan(0);
    expect(result.forecast).toHaveLength(3);
    expect(result.dashboard?.panels).toHaveLength(2);
  });

  it('supports prophet-style forecasting with seasonal components', () => {
    const now = Date.now();
    const series: TimeSeriesRow[] = Array.from({ length: 24 }, (_, idx) => ({
      timestamp: new Date(now + idx * 3_600_000),
      values: { demand: Math.sin(idx / 3) * 10 + 50 },
    }));

    const forecast = prophetForecast(series, 'demand', 5, { confidence: 0.1 });
    expect(forecast).toHaveLength(5);
    forecast.forEach((point) => {
      expect(point.upper).toBeGreaterThan(point.lower);
    });
  });

  it('applies Largest Triangle Three Buckets downsampling deterministically', () => {
    const now = Date.now();
    const series: TimeSeriesRow[] = Array.from({ length: 100 }, (_, idx) => ({
      timestamp: new Date(now + idx * 1000),
      values: { metric: idx },
    }));

    const sampled = largestTriangleThreeBuckets(series, 20);
    expect(sampled[0]).toEqual(series[0]);
    expect(sampled[sampled.length - 1]).toEqual(series[series.length - 1]);
    expect(sampled.length).toBe(20);
  });
});

class MemoryConnector implements TimeSeriesConnector {
  private series: TimeSeriesRow[];

  constructor(series: TimeSeriesRow[]) {
    this.series = series;
  }

  async writePoints() {
    return Promise.resolve();
  }

  async queryRange(): Promise<TimeSeriesRow[]> {
    return this.series;
  }

  async aggregate(): Promise<TimeSeriesRow[]> {
    return this.series;
  }
}
