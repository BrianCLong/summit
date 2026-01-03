# Policy Simulation CLI

Run deterministic policy simulations against the security evaluation pack and anomaly fixtures.

```bash
pnpm security:policy-sim \
  --proposal out/proposals/<id>/proposal.json \
  --baseline server/src/policy/fixtures/tenant-baseline.json \
  --baseline-ref origin/main \
  --output ./policy-simulation-report.json
```

## Flags

- `--proposal <path>`: Policy change proposal (overlay patches). Optional; if omitted the proposed bundle is the working tree.
- `--baseline <path>`: Baseline tenant policy bundle (default: `server/src/policy/fixtures/tenant-baseline.json`).
- `--proposed <path>`: Proposed bundle to compare (defaults to baseline path, using working tree contents).
- `--baseline-ref <git ref>`: Load the baseline bundle content from the ref (e.g., `origin/main`).
- `--output <path>`: Where to emit the JSON report.
- `--changed-only`: Skip execution when git diff shows no policy/proposal changes.

## Exit codes

- `0` — approve
- `1` — needs_review (warn)
- `2` — reject (fail CI)
- `3` — internal error

## Outputs

- Human-readable summary on stdout (decision + report path)
- Machine-readable JSON report at `--output` (defaults to `policy-simulation-report.json`)

## Determinism

- All scenarios are local fixtures; no network calls.
- Uses `@intelgraph/anomaly-detection` with static baselines for anomaly deltas.
