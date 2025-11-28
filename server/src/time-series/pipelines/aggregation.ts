import { AggregationWindow, TimeSeriesRow } from '../types.js';

export type AggregationReducer = AggregationWindow['function'];

export function aggregateRows(rows: TimeSeriesRow[], windowMs: number, reducer: AggregationReducer): TimeSeriesRow[] {
  if (!rows.length || windowMs <= 0) return [];
  const buckets = new Map<number, Record<string, number[]>>();

  rows.forEach((row) => {
    const bucketKey = Math.floor(row.timestamp.getTime() / windowMs) * windowMs;
    const bucket = buckets.get(bucketKey) ?? {};
    Object.entries(row.values).forEach(([field, value]) => {
      const series = bucket[field] ?? [];
      series.push(value as number);
      bucket[field] = series;
    });
    buckets.set(bucketKey, bucket);
  });

  return Array.from(buckets.entries())
    .sort(([a], [b]) => a - b)
    .map(([bucketKey, values]) => ({
      timestamp: new Date(bucketKey),
      values: reduceBucket(values, reducer),
    }));
}

function reduceBucket(bucket: Record<string, number[]>, reducer: AggregationReducer) {
  const reduced: Record<string, number> = {};
  Object.entries(bucket).forEach(([field, values]) => {
    switch (reducer) {
      case 'sum':
        reduced[field] = values.reduce((acc, value) => acc + value, 0);
        break;
      case 'min':
        reduced[field] = Math.min(...values);
        break;
      case 'max':
        reduced[field] = Math.max(...values);
        break;
      case 'median':
        reduced[field] = median(values);
        break;
      case 'p95':
        reduced[field] = percentile(values, 0.95);
        break;
      case 'p99':
        reduced[field] = percentile(values, 0.99);
        break;
      case 'avg':
      default:
        reduced[field] = values.reduce((acc, value) => acc + value, 0) / Math.max(values.length, 1);
    }
  });
  return reduced;
}

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (!sorted.length) return 0;
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function percentile(values: number[], p: number) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor(p * sorted.length)));
  return sorted[idx];
}
