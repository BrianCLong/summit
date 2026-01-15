# Determinism & Repro Playbook

This guide captures the single-source commands to reproduce the CI gates for coverage, API fuzzing, and segmented Turbo tasks. All commands are deterministic, avoid network dependencies, and run from the repository root.

## Coverage Gate (PR #15365)

1. Collect coverage for the changed workspaces (server security tests today):
   ```bash
   pnpm coverage:collect
   ```
2. Enforce the threshold (defaults to `origin/main` for comparisons):
   ```bash
   COVERAGE_SCOPE=changed COVERAGE_BASE_REF=origin/main pnpm coverage:gate
   ```

   - Thresholds: **lines 80%**, **branches 75%**, **functions 70%**, **statements 80%**.
   - Output includes per-workspace failures plus a JUnit file (`coverage-junit.xml`).

## API Fuzzing Contracts (PR #15365)

Run the guardrail fuzzing suite with bounded iterations and a pinned seed:

```bash
GRAPH_GUARDRAIL_FUZZ_SEED=8339 \
GRAPH_GUARDRAIL_FUZZ_ITERATIONS=80 \
GRAPH_GUARDRAIL_FUZZ_MAX_ITERATIONS=120 \
pnpm test:fuzz:graph-guardrails
```

- The test log prints the exact seed and iteration cap: `[graph-guardrail-fuzz] { ... }`.
- Increase iterations for nightly sweeps with `GRAPH_GUARDRAIL_FUZZ_MAX_ITERATIONS=300`.

## Turbo Segmentation (PR #15370)

Turbo tasks are segmented per workspace with stable inputs/outputs. To run the same graph locally as CI:

```bash
pnpm turbo run lint typecheck --filter=...[origin/main]
pnpm turbo run test --filter=...[origin/main] -- --passWithNoTests
pnpm turbo run build --filter=...[origin/main]
```

- Inputs for each task are pinned to workspace-local source, config, and lockfiles to avoid cross-package leakage.
- `globalDependencies` now include `turbo.json`, `pnpm-workspace.yaml`, and `Makefile` to invalidate caches when coordination surfaces change.

## Golden Path Check

The gates above are non-destructive and respect the existing `make smoke` / `make ga` flow. Use them to validate changes before raising PRs.
