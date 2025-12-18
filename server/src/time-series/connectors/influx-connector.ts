import fetch from 'node-fetch';
import { AggregationParams, QueryRangeParams, Tags, TimeSeriesConnector, TimeSeriesPoint, TimeSeriesRow } from '../types.js';

function encodeTags(tags?: Tags) {
  if (!tags || !Object.keys(tags).length) {
    return '';
  }
  return Object.entries(tags)
    .map(([key, value]) => `${key}=${value.replace(/ /g, '\\ ')}`)
    .join(',');
}

function encodeFields(fields: Record<string, number>) {
  return Object.entries(fields)
    .map(([key, value]) => `${key}=${value}`)
    .join(',');
}

function toLineProtocol(point: TimeSeriesPoint) {
  const tagPart = encodeTags(point.tags);
  const measurement = tagPart ? `${point.measurement},${tagPart}` : point.measurement;
  const fields = encodeFields(point.fields);
  const nanos = point.timestamp.getTime() * 1_000_000;
  return `${measurement} ${fields} ${nanos}`;
}

function toFluxFilter(tags?: Tags) {
  if (!tags) return '';
  return Object.entries(tags)
    .map(([key, value]) => `  |> filter(fn: (r) => r["${key}"] == "${value}")`)
    .join('\n');
}

function fluxAggregation(aggregation: AggregationParams['window']) {
  const fnMap: Record<typeof aggregation.function, string> = {
    avg: 'mean',
    sum: 'sum',
    min: 'min',
    max: 'max',
    median: 'median',
    p95: 'quantile(q: 0.95)',
    p99: 'quantile(q: 0.99)',
  } as const;
  return `  |> aggregateWindow(every: ${aggregation.every}, fn: ${fnMap[aggregation.function]}, createEmpty: false)`;
}

function parseFluxCsv(csv: string): TimeSeriesRow[] {
  const lines = csv.split('\n').filter((line) => line && !line.startsWith('#'));
  const rows: TimeSeriesRow[] = [];
  for (const line of lines) {
    const columns = line.split(',');
    const timeIdx = columns.findIndex((value) => value === '_time');
    const valueIdx = columns.findIndex((value) => value === '_value');
    if (timeIdx === -1 || valueIdx === -1) continue;
    const timestamp = new Date(columns[timeIdx]);
    const value = Number(columns[valueIdx]);
    rows.push({ timestamp, values: { value } });
  }
  return rows;
}

export type InfluxConfig = {
  url: string;
  org: string;
  bucket: string;
  token: string;
};

export class InfluxConnector implements TimeSeriesConnector {
  private config: InfluxConfig;

  constructor(config: InfluxConfig) {
    this.config = config;
  }

  async writePoints(points: TimeSeriesPoint[]): Promise<void> {
    if (!points.length) return;
    const payload = points.map(toLineProtocol).join('\n');
    const url = new URL('/api/v2/write', this.config.url);
    url.searchParams.set('org', this.config.org);
    url.searchParams.set('bucket', this.config.bucket);

    const res = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        Authorization: `Token ${this.config.token}`,
        'Content-Type': 'text/plain',
      },
      body: payload,
    });

    if (!res.ok) {
      const message = await res.text();
      throw new Error(`Failed to write points to InfluxDB: ${res.status} ${message}`);
    }
  }

  async queryRange(params: QueryRangeParams): Promise<TimeSeriesRow[]> {
    const flux = this.buildFluxQuery(params);
    const res = await this.executeQuery(flux);
    const text = await res.text();
    return parseFluxCsv(text);
  }

  async aggregate(params: AggregationParams): Promise<TimeSeriesRow[]> {
    const flux = this.buildFluxQuery(params, params.window);
    const res = await this.executeQuery(flux);
    const text = await res.text();
    return parseFluxCsv(text);
  }

  private buildFluxQuery(params: QueryRangeParams, aggregation?: AggregationParams['window']) {
    const fields = params.fields?.length ? params.fields : ['*'];
    const fluxFields = fields.map((field) => `  |> filter(fn: (r) => r._field == "${field}")`).join('\n');
    const filters = toFluxFilter(params.tags);
    const window = aggregation ? `${fluxAggregation(aggregation)}\n` : '';

    return [
      `from(bucket: "${this.config.bucket}")`,
      `  |> range(start: ${params.start.toISOString()}, stop: ${params.end.toISOString()})`,
      `  |> filter(fn: (r) => r._measurement == "${params.measurement}")`,
      fluxFields,
      filters,
      window,
      '  |> yield(name: "results")',
    ]
      .filter(Boolean)
      .join('\n');
  }

  private async executeQuery(flux: string) {
    const url = new URL('/api/v2/query', this.config.url);
    url.searchParams.set('org', this.config.org);
    const res = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        Authorization: `Token ${this.config.token}`,
        'Content-Type': 'application/vnd.flux',
      },
      body: flux,
    });
    if (!res.ok) {
      const message = await res.text();
      throw new Error(`Influx query failed: ${res.status} ${message}`);
    }
    return res;
  }
}

export const __private__ = {
  toLineProtocol,
  toFluxFilter,
  fluxAggregation,
  parseFluxCsv,
};
