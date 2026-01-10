# Policy Drift CI Verification

The `security:policy-drift:test` script runs deterministic, fixture-driven checks that validate:

1. Snapshot normalization for repository baselines and runtime environment variables.
2. Comparator classification rules for risky/critical drift.
3. End-to-end alert + proposal generation through the monitor loop.

## Running locally

```bash
pnpm security:policy-drift:test
```

The command delegates to `pnpm --filter intelgraph-server policy-drift:test` and uses Jest fixtures (no network calls).

## CI integration

A dedicated workflow (`.github/workflows/policy-drift.yml`) executes the same command on pushes and pull requests. The job is defensive-only and fails fast on comparator or redaction regressions.
