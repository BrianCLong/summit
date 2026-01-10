# Receipt Performance Budget

This harness measures the validation and normalization path for adapter receipts. It validates incoming payloads with Ajv, normalizes them into a canonical receipt shape, and emits a deterministic digest for each run.

## Running the benchmark

Use the smoke preset (<5 seconds) in CI and local loops:

```bash
node perf/bench-receipt.js --smoke
```

For a denser sample on a developer machine:

```bash
node perf/bench-receipt.js --iterations=2500
```

The script prints a JSON report with runtime, throughput (ops/sec), and environment metadata (node, platform, CPU count, git commit, package version when available).

## Baseline budgets (v2.0.0 @ git 59d2748a)

| Mode     | Iterations | Runtime budget | Throughput budget |
| -------- | ---------- | -------------- | ----------------- |
| Smoke    | 250        | ≤ 5 seconds    | ≥ 10,000 ops/sec  |
| Standard | 2,500      | ≤ 5 seconds    | ≥ 20,000 ops/sec  |

> Baselines were captured on the current CI image (Node v22.21.0, 3 vCPUs). The smoke run completed in ~15 ms (~17k ops/sec) and the standard run in ~73 ms (~34k ops/sec).

## Updating the budget

1. Run `node perf/bench-receipt.js --smoke` on CI-equivalent hardware.
2. If runtime exceeds the budget, investigate regressions before bumping limits.
3. If throughput improves materially, update the table above with the new measured values and cite the command/output in the PR description.
