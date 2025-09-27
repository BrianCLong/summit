# @summit/sdpwa

TypeScript bindings for the [`sdpwa`](../..) streaming differential privacy window aggregator. The bindings are designed for use with `wasm-pack` builds of the Rust crate and provide a simple ergonomic API for ingesting events, releasing windowed metrics, and interrogating the on-device privacy ledger.

## Getting Started

1. Build the Rust crate for WebAssembly output:

```bash
wasm-pack build ../../ --features wasm --target bundler --out-dir pkg
```

2. Install the bindings:

```bash
npm install @summit/sdpwa
```

3. Instantiate the aggregator inside your application:

```ts
import init from './pkg/sdpwa.js'
import { StreamingDpWindowAggregator } from '@summit/sdpwa'

const aggregator = await StreamingDpWindowAggregator.create(
  init as any,
  {
    dp: {
      epsilonCount: 0.5,
      epsilonSum: 1.0,
      deltaPerWindow: 1e-6,
      ledgerDeltaTolerance: 1e-5
    },
    bounds: {
      maxContributionsPerWindow: 2,
      minValue: -5,
      maxValue: 5
    },
    window: {
      windowSizeMs: 60_000,
      windowStrideMs: 30_000
    }
  },
  new TextEncoder().encode('deterministic-seed')
)

aggregator.ingest({ identity: 'alice', value: 1.2, timestampMs: Date.now() })
const releases = aggregator.release(Date.now())
console.log(releases[0].privacy.cumulativeEpsilon)
```

### Auditor Support

The aggregator maintains an internal ledger that the Rust `Auditor` can independently recompute. The `ledger()` method on the binding exposes the ledger snapshot so that privacy tooling in TypeScript can compare cumulative epsilon values with the Rust auditor output.

## Reproducible Noise

All noise draws are seeded via deterministic ChaCha20 streams derived from the provided seed, window start time, and metric name. By supplying the same seed to both Rust and TypeScript environments, identical noisy releases can be reproduced across devices for audit and drift-detection workflows.
