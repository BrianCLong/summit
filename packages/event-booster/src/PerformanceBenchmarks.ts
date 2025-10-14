import { performance } from 'node:perf_hooks';
import EventBooster from './EventBooster.js';
import { BoostRunResult, EventRecord } from './types.js';

export interface BenchmarkConfig {
  iterations?: number;
  warmupIterations?: number;
  patternOptions?: Record<string, unknown>;
  now?: () => number;
}

export interface BenchmarkResult {
  patternName: string;
  iterations: number;
  sampleSize: number;
  averageMs: number;
  minMs: number;
  maxMs: number;
  p95Ms: number;
  throughputPerSecond: number;
}

const computePercentile = (samples: number[], percentile: number): number => {
  if (samples.length === 0) {
    return 0;
  }
  const sorted = [...samples].sort((a, b) => a - b);
  const position = (percentile / 100) * (sorted.length - 1);
  const lowerIndex = Math.floor(position);
  const upperIndex = Math.ceil(position);
  if (lowerIndex === upperIndex) {
    return sorted[lowerIndex];
  }
  const weight = position - lowerIndex;
  return sorted[lowerIndex] * (1 - weight) + sorted[upperIndex] * weight;
};

const ensureIterations = (value: number | undefined): number => {
  const iterations = value ?? 10;
  if (!Number.isFinite(iterations) || iterations <= 0) {
    throw new Error('Benchmark iterations must be greater than zero.');
  }
  return Math.floor(iterations);
};

/**
 * Measures execution characteristics of a pattern within an {@link EventBooster} instance.
 */
export const runPatternBenchmark = (
  booster: EventBooster,
  patternName: string,
  events: readonly EventRecord[],
  config: BenchmarkConfig = {},
): BenchmarkResult => {
  const iterations = ensureIterations(config.iterations);
  const warmupIterations = Math.max(0, Math.floor(config.warmupIterations ?? Math.min(2, iterations)));
  const now = config.now ?? (() => performance.now());
  const options = config.patternOptions ?? {};

  for (let i = 0; i < warmupIterations; i += 1) {
    booster.boost(events, patternName, options);
  }

  const durations: number[] = [];
  for (let i = 0; i < iterations; i += 1) {
    const start = now();
    const result: BoostRunResult = booster.boost(events, patternName, options);
    const end = now();
    durations.push(Math.max(0, end - start));
    // Ensure we do not keep references to large arrays unnecessarily.
    result.events.length = 0;
  }

  const total = durations.reduce((sum, value) => sum + value, 0);
  const averageMs = durations.length > 0 ? total / durations.length : 0;
  const minMs = durations.length > 0 ? Math.min(...durations) : 0;
  const maxMs = durations.length > 0 ? Math.max(...durations) : 0;
  const p95Ms = computePercentile(durations, 95);
  const throughputPerSecond = averageMs > 0 ? (events.length * 1000) / averageMs : 0;

  return {
    patternName,
    iterations,
    sampleSize: events.length,
    averageMs,
    minMs,
    maxMs,
    p95Ms,
    throughputPerSecond,
  };
};

/**
 * Runs {@link runPatternBenchmark} across several patterns for comparative analysis.
 */
export const benchmarkPatterns = (
  booster: EventBooster,
  events: readonly EventRecord[],
  patternNames: readonly string[],
  config: BenchmarkConfig = {},
): BenchmarkResult[] => {
  return patternNames.map((patternName) => runPatternBenchmark(booster, patternName, events, config));
};
