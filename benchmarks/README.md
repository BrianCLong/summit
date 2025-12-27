# Benchmarks

This directory contains performance benchmarks and fixtures.

## Microbenchmarks

Located in `micro/`.
Run with:

```bash
node benchmarks/micro/serialization.js
```

## Structure

- `shootout/`: Cross-language benchmarks (Legacy).
- `micro/`: Node.js specific microbenchmarks.
- `fixtures/`: Deterministic test data.

## Budgets

We enforce soft budgets. If a benchmark exceeds its threshold, it will exit with code 1.

## Environment runner

Use the environment-aware runner in `runner/environment-benchmarks.mjs` to exercise the staging and production-like stacks with a
consistent workload mix. Configuration lives in `runner/environments.json`, and results (including Pareto front data) are written to
`runner/report-data/`.

```bash
node benchmarks/runner/environment-benchmarks.mjs
cat benchmarks/runner/report-data/environment-metrics.json
```
