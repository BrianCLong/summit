import { ForecastPoint, TimeSeriesRow } from '../types.js';

export type ArimaOptions = {
  difference?: number;
  movingAverageFactor?: number;
  volatilityPadding?: number;
};

export function arimaForecast(series: number[], horizon: number, options: ArimaOptions = {}): number[] {
  if (!series.length || horizon <= 0) return [];
  const difference = options.difference ?? 1;
  const movingAverageFactor = options.movingAverageFactor ?? 0.4;
  const volatilityPadding = options.volatilityPadding ?? 1.25;

  const differenced = differenceSeries(series, difference);
  const drift = differenced.reduce((acc, value) => acc + value, 0) / Math.max(1, differenced.length);
  const volatility = standardDeviation(differenced) * volatilityPadding;

  const forecast: number[] = [];
  let previous = series[series.length - 1];
  let previousError = 0;

  for (let i = 0; i < horizon; i += 1) {
    const autoregressive = previous + drift;
    const ma = movingAverageFactor * previousError;
    const noise = volatility * 0.1; // keeps the signal from collapsing to a straight line
    const next = autoregressive + ma + noise;
    previousError = next - previous;
    previous = next;
    forecast.push(next);
  }

  return forecast;
}

export type ProphetOptions = {
  seasonality?: number; // expressed in number of points
  growthCap?: number;
  confidence?: number;
};

export function prophetForecast(
  rows: TimeSeriesRow[],
  field: string,
  horizon: number,
  options: ProphetOptions = {},
): ForecastPoint[] {
  if (!rows.length || horizon <= 0) return [];
  const series = rows.map((row) => row.values[field]).filter((value): value is number => typeof value === 'number');
  if (!series.length) return [];

  const seasonality = options.seasonality ?? Math.max(4, Math.floor(series.length / 4));
  const confidence = options.confidence ?? 0.2;
  const growthCap = options.growthCap ?? Number.POSITIVE_INFINITY;

  const timestamps = rows.map((row) => row.timestamp.getTime());
  const { slope, intercept } = linearRegression(timestamps, series);
  const seasonalComponents = computeSeasonality(series, seasonality);
  const lastTimestamp = rows[rows.length - 1].timestamp.getTime();
  const cadence = timestamps.length >= 2 ? timestamps[1] - timestamps[0] : 60_000;

  const forecast: ForecastPoint[] = [];
  for (let i = 1; i <= horizon; i += 1) {
    const time = lastTimestamp + i * cadence;
    const trend = Math.min(intercept + slope * time, growthCap);
    const seasonal = seasonalComponents[i % seasonality];
    const predicted = trend + seasonal;
    const margin = Math.abs(predicted) * confidence;
    forecast.push({
      timestamp: new Date(time),
      predicted,
      lower: predicted - margin,
      upper: predicted + margin,
    });
  }

  return forecast;
}

function differenceSeries(series: number[], order: number) {
  let differenced = [...series];
  for (let i = 0; i < order; i += 1) {
    differenced = differenced.slice(1).map((value, idx) => value - differenced[idx]);
  }
  return differenced;
}

function linearRegression(x: number[], y: number[]) {
  const n = Math.min(x.length, y.length);
  const sumX = x.slice(0, n).reduce((acc, value) => acc + value, 0);
  const sumY = y.slice(0, n).reduce((acc, value) => acc + value, 0);
  const sumXY = x.slice(0, n).reduce((acc, value, idx) => acc + value * y[idx], 0);
  const sumX2 = x.slice(0, n).reduce((acc, value) => acc + value * value, 0);
  const denominator = n * sumX2 - sumX * sumX || 1;
  const slope = (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

function computeSeasonality(series: number[], seasonality: number) {
  const buckets: number[][] = Array.from({ length: seasonality }, () => []);
  series.forEach((value, idx) => {
    buckets[idx % seasonality].push(value);
  });
  return buckets.map((bucket) => {
    if (!bucket.length) return 0;
    return bucket.reduce((acc, value) => acc + value, 0) / bucket.length;
  });
}

function standardDeviation(series: number[]) {
  if (!series.length) return 0;
  const mean = series.reduce((acc, value) => acc + value, 0) / series.length;
  const variance = series.reduce((acc, value) => acc + (value - mean) ** 2, 0) / series.length;
  return Math.sqrt(variance);
}
