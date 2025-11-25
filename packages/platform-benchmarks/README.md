# @summit/platform-benchmarks

Cross-language benchmark harness for the Summit/IntelGraph platform.

**Implements:** Prompt 17 - Cross-subsystem Performance Benchmark Suite

## Features

- 🚀 **Deterministic Benchmarks** - Statistical analysis with reproducible results
- 🌐 **Multi-language Support** - TypeScript, Python, Go via subprocess
- 📊 **Multiple Output Formats** - Console, JSON, Markdown, CSV
- 📈 **Baseline Comparison** - Regression detection with configurable thresholds
- 🔧 **CI Integration** - GitHub Actions ready with artifact output

## Installation

```bash
pnpm add @summit/platform-benchmarks
```

## Quick Start

### Define Benchmarks

Create a `benchmarks/api.bench.ts` file:

```typescript
import type { BenchmarkSuite } from '@summit/platform-benchmarks';

export default function registerBenchmarks(suite: BenchmarkSuite) {
  suite.add({
    name: 'entity-serialization',
    config: {
      subsystem: 'api',
      workloadType: 'cpu',
      iterations: 10000,
    },
    fn: () => {
      const entity = { id: '123', name: 'Test', type: 'Person' };
      JSON.stringify(entity);
    },
  });

  suite.add({
    name: 'entity-parsing',
    config: {
      subsystem: 'api',
      workloadType: 'cpu',
      iterations: 10000,
    },
    fn: () => {
      const json = '{"id":"123","name":"Test","type":"Person"}';
      JSON.parse(json);
    },
  });
}
```

### Run Benchmarks

```bash
# Console output
pnpm benchmark

# JSON output for CI
pnpm benchmark --format json --output results.json

# Compare with baseline
pnpm benchmark --baseline baseline.json --fail-on-regression

# Markdown report
pnpm benchmark --format markdown --output BENCHMARK.md
```

## API

### BenchmarkHarness

Low-level harness for running individual benchmarks:

```typescript
import { BenchmarkHarness } from '@summit/platform-benchmarks';

const harness = new BenchmarkHarness({
  name: 'my-benchmark',
  subsystem: 'api',
  language: 'typescript',
  workloadType: 'cpu',
  iterations: 1000,
  warmupIterations: 100,
  timeout: 30000,
  tags: ['serialization'],
});

harness.add('serialize', () => {
  JSON.stringify({ test: true });
});

const result = await harness.run();
console.log(result.stats.mean); // Mean time in nanoseconds
```

### BenchmarkSuite

High-level suite for organizing multiple benchmarks:

```typescript
import { createBenchmarkSuite } from '@summit/platform-benchmarks';
import { JsonReporter } from '@summit/platform-benchmarks/reporters';

const suite = createBenchmarkSuite({
  name: 'API Benchmarks',
  defaultIterations: 1000,
  thresholds: {
    maxMean: 1_000_000, // 1ms
    maxP99: 5_000_000,  // 5ms
    maxRegression: 10,  // 10%
  },
});

suite.clearReporters();
suite.addReporter(new JsonReporter('results.json'));

suite.add({
  name: 'benchmark-1',
  setup: async () => { /* prepare */ },
  teardown: async () => { /* cleanup */ },
  fn: () => { /* benchmark */ },
});

const results = await suite.run();
```

### BaselineComparator

Compare results against a baseline:

```typescript
import { BaselineComparator } from '@summit/platform-benchmarks';

const comparator = new BaselineComparator(10); // 10% threshold
await comparator.loadBaseline('baseline.json');

const regressions = comparator.getRegressions(results);
if (regressions.length > 0) {
  console.log('Regressions detected!');
  for (const r of regressions) {
    console.log(comparator.formatComparison(r));
  }
}
```

## Output Formats

### Console

```
Summit Platform Benchmarks

  ✓ entity-serialization: 1.23 µs/op (813,008.13 ops/sec)
  ✓ entity-parsing: 2.45 µs/op (408,163.27 ops/sec)

┌─────────────────────┬────────┬────────┬───────────┬────────┬────────┐
│ Benchmark           │ Mean   │ p99    │ Ops/sec   │ RME    │ Status │
├─────────────────────┼────────┼────────┼───────────┼────────┼────────┤
│ entity-serialization│ 1.23 µs│ 5.67 µs│ 813008.13 │ ±0.45% │ PASS   │
│ entity-parsing      │ 2.45 µs│ 8.90 µs│ 408163.27 │ ±0.67% │ PASS   │
└─────────────────────┴────────┴────────┴───────────┴────────┴────────┘

2 passed, 0 failed
```

### JSON

```json
{
  "suite": { "name": "Summit Platform Benchmarks" },
  "timestamp": "2024-01-15T10:00:00.000Z",
  "results": [
    {
      "config": { "name": "entity-serialization", ... },
      "stats": { "mean": 1230, "p99": 5670, ... },
      "passed": true
    }
  ],
  "summary": { "total": 2, "passed": 2, "failed": 0 }
}
```

## CI Integration

### GitHub Actions

```yaml
- name: Run Benchmarks
  run: pnpm benchmark --format json --output benchmark-results.json --ci

- name: Compare with Baseline
  run: |
    pnpm benchmark \
      --format markdown \
      --output benchmark-report.md \
      --baseline benchmarks/baseline.json \
      --fail-on-regression \
      --regression-threshold 15

- name: Upload Results
  uses: actions/upload-artifact@v4
  with:
    name: benchmark-results
    path: |
      benchmark-results.json
      benchmark-report.md
```

## Thresholds

Configure performance thresholds:

```typescript
const suite = createBenchmarkSuite({
  name: 'Suite',
  thresholds: {
    maxMean: 1_000_000,     // Max mean time (ns)
    maxP99: 5_000_000,      // Max p99 time (ns)
    minOpsPerSecond: 1000,  // Min ops/sec
    maxRsd: 10,             // Max relative std dev (%)
    maxRegression: 10,      // Max regression from baseline (%)
  },
});
```

## License

MIT
