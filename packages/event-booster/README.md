# Event Booster Framework

`@intelgraph/event-booster` provides a TypeScript-first toolkit for amplifying synthetic
event streams. It includes a configurable `EventBooster` orchestrator, reusable boost
patterns, high fidelity synthetic data generators, and lightweight benchmarking utilities.
The package ships in strict TypeScript mode and is fully covered by unit tests.

## Features

- **EventBooster orchestration** – register custom boost patterns and execute them with
  built-in telemetry and history tracking.
- **Synthetic data generators** – quickly produce uniform, bursty, seasonal, and anomaly
  heavy event series with reproducible randomness.
- **Performance benchmarks** – measure per-pattern latency, throughput, and percentile
  timings with optional warmup iterations.
- **Strict TypeScript** – compiler options enable full strictness, ensuring the API is safe
  for downstream projects.
- **Tested and documented** – >80% Jest coverage with narrative documentation and
  runnable examples.

## Getting started

```bash
pnpm install
pnpm --filter @intelgraph/event-booster build
```

The build step compiles the TypeScript sources into `dist/`.

### Running tests

```bash
pnpm --filter @intelgraph/event-booster test
```

Tests enforce strict runtime behaviour and maintain the coverage threshold above 80%.

### Usage overview

```ts
import {
  createDefaultEventBooster,
  generateUniformEvents,
  runPatternBenchmark,
} from '@intelgraph/event-booster';

const booster = createDefaultEventBooster();
const baseline = generateUniformEvents(5, { signal: 3 });
const result = booster.boost(baseline, 'amplify-signal');

console.log(`Generated ${result.outputCount} boosted events`);

const metrics = runPatternBenchmark(booster, 'amplify-signal', baseline, {
  iterations: 25,
});
console.table(metrics);
```

More examples are available in [`examples/`](./examples) and a detailed API reference is
published under [`docs/API.md`](./docs/API.md).
