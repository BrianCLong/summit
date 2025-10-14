# Event Booster API Reference

This document summarises the primary exports of `@intelgraph/event-booster`. All modules
are compiled with strict TypeScript settings, so the signatures below map directly to the
published type definitions.

## EventBooster

```ts
class EventBooster {
  constructor(options?: EventBoosterOptions)

  registerPattern(pattern: BoostPattern): void
  unregisterPattern(name: string): boolean
  listPatterns(): Array<{ name: string; description: string }>
  hasPattern(name: string): boolean
  getPattern(name: string): BoostPattern | undefined
  boost(events: readonly EventRecord[], patternName: string, options?: Record<string, unknown>): BoostRunResult
  boostFromGenerator(factory: () => readonly EventRecord[], patternName: string, options?: Record<string, unknown>): BoostRunResult
  getHistory(limit?: number): HistoryEntry[]
  clearHistory(): void
}
```

### Options

| Option | Description | Default |
| --- | --- | --- |
| `performanceBudgetMs` | Latency budget for a single `boost` call. The result payload indicates when the budget is exceeded. | `5` |
| `maxHistory` | Number of run summaries retained in memory. | `50` |
| `now` | Clock override for deterministic testing. | `performance.now` |
| `random` | RNG used by boost contexts. | `Math.random` |
| `initialPatterns` | Patterns to register during construction. | `[]` |

`createDefaultEventBooster(options)` instantiates the class with the packaged default
patterns pre-registered. Duplicate pattern names are filtered out automatically.

## Built-in patterns

The framework ships with three composable patterns:

| Pattern | Behaviour | Primary use case |
| --- | --- | --- |
| `createAmplifyPattern` | Scales a numeric payload field by one or more intensity factors. | Simulating multi-sensor reinforcement or correlation boosts. |
| `createTemporalShiftPattern` | Clones events forward/backward in time, tagging them with offset metadata. | Stress testing chronological clustering logic. |
| `createNoisePattern` | Applies bounded random noise to a numeric field, emitting a boost score tied to the magnitude. | Validating downstream robustness to jitter and noise. |

Patterns can be supplied custom names and configuration values, enabling a consistent
naming scheme across multiple booster instances.

## Synthetic data generators

| Function | Description |
| --- | --- |
| `generateUniformEvents(count, options)` | Produces evenly spaced events with slight jitter and a stable signal. |
| `generateBurstEvents(options)` | Emits high-intensity bursts separated by idle gaps. |
| `generateSeasonalEvents(options)` | Generates a sine-wave seasonal pattern with configurable amplitude and phase. |
| `generateAnomalyEvents(options)` | Inserts anomalies into a baseline signal based on a probability rate. |

All generators accept deterministic `random` overrides to support reproducible tests and
benchmarks.

## Benchmark utilities

`runPatternBenchmark` and `benchmarkPatterns` execute patterns multiple times while
recording latency statistics. Returned metrics include:

- `averageMs`, `minMs`, `maxMs` – primary latency aggregations.
- `p95Ms` – 95th percentile latency, interpolated from collected samples.
- `throughputPerSecond` – Derived throughput based on sample size and average latency.

Warmup iterations can be configured to amortise JIT overhead before measurements begin.

## Example workflow

```ts
import {
  createDefaultEventBooster,
  generateBurstEvents,
  runPatternBenchmark,
} from '@intelgraph/event-booster';

const booster = createDefaultEventBooster();
const baseline = generateBurstEvents({ bursts: 3, burstSize: 10 });
const { events, outputCount } = booster.boost(baseline, 'amplify-signal');
console.log(`Boosted ${outputCount} events`);

const metrics = runPatternBenchmark(booster, 'amplify-signal', baseline, {
  iterations: 15,
  warmupIterations: 3,
});
console.table(metrics);
```
