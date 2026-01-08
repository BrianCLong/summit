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
