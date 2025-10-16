/** @jest-environment node */
import EventBooster, { createAmplifyPattern } from '../src/index.js';
import {
  benchmarkPatterns,
  runPatternBenchmark,
} from '../src/PerformanceBenchmarks.js';
import { generateUniformEvents } from '../src/SyntheticGenerators.js';

const incrementalNow = () => {
  let value = 0;
  return () => {
    value += 2;
    return value;
  };
};

describe('PerformanceBenchmarks', () => {
  it('computes aggregate metrics for a pattern', () => {
    const booster = new EventBooster();
    booster.registerPattern(
      createAmplifyPattern({ name: 'amp', intensities: [1.2] }),
    );
    const events = generateUniformEvents(3, { signal: 2, random: () => 0.5 });
    const now = incrementalNow();

    const result = runPatternBenchmark(booster, 'amp', events, {
      iterations: 3,
      warmupIterations: 1,
      now,
    });

    expect(result.patternName).toBe('amp');
    expect(result.iterations).toBe(3);
    expect(result.averageMs).toBeGreaterThan(0);
    expect(result.throughputPerSecond).toBeGreaterThan(0);
    expect(result.p95Ms).toBeGreaterThanOrEqual(result.minMs);
  });

  it('handles single-iteration percentile calculation', () => {
    const booster = new EventBooster();
    booster.registerPattern(
      createAmplifyPattern({ name: 'amp', intensities: [1.1] }),
    );
    const events = generateUniformEvents(1, { signal: 2, random: () => 0.4 });
    const now = incrementalNow();

    const result = runPatternBenchmark(booster, 'amp', events, {
      iterations: 1,
      warmupIterations: 0,
      now,
    });

    expect(result.p95Ms).toBe(result.minMs);
  });

  it('benchmarks multiple patterns', () => {
    const booster = new EventBooster();
    booster.registerPattern(
      createAmplifyPattern({ name: 'amp', intensities: [1.1] }),
    );
    booster.registerPattern(
      createAmplifyPattern({ name: 'amp2', intensities: [1.2] }),
    );
    const events = generateUniformEvents(2, { signal: 3, random: () => 0.6 });
    const now = incrementalNow();

    const results = benchmarkPatterns(booster, events, ['amp', 'amp2'], {
      iterations: 2,
      warmupIterations: 0,
      now,
    });

    expect(results).toHaveLength(2);
    expect(results[0].patternName).toBe('amp');
    expect(results[1].patternName).toBe('amp2');
  });

  it('validates the iteration count', () => {
    const booster = new EventBooster();
    booster.registerPattern(
      createAmplifyPattern({ name: 'amp', intensities: [1.05] }),
    );
    const events = generateUniformEvents(1, { signal: 1, random: () => 0.5 });
    expect(() =>
      runPatternBenchmark(booster, 'amp', events, {
        iterations: 0,
      }),
    ).toThrow('greater than zero');
  });
});
