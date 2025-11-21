# Ambient Governance Synthetic Monitoring (AGSM)

AGSM continuously executes synthetic governance scenarios to ensure access policies, data residency rules, and data lifecycle controls remain compliant. It ships with a Go-based probe runner and a TypeScript dashboard that renders persisted service level insights.

## Features

- **Synthetic probes** for denied query, consent change, geo routing, deletion, and legal hold governance flows.
- **Seeded canary profile** (`profile.canary.yaml`) that deterministically injects regressions so detection logic can be validated during CI.
- **SLO aware aggregation** with configurable success-rate thresholds and rolling window trimming.
- **JSON metrics output** under `state/metrics.json` for downstream dashboards and alerting integrations.

## Running probes

```bash
cd services/agsm
# production profile, exits 2 if any probe fails
go run ./cmd/agsm --profile=production --iterations=1 --exit-on-failure

# execute continuously until interrupted
go run ./cmd/agsm --profile=production

# validate seeded canaries trip alarms
go run ./cmd/agsm --profile=canary --iterations=1
```

Metrics are stored at `state/metrics.json` by default (override with `--output`). The file is trimmed to the configured alert window and includes probe-level details, aggregate SLI calculations, and generated alerts.

## Dashboard

A TypeScript CLI dashboard that consumes the metrics file lives in `tools/agsm-dashboard`. Install dependencies and render the dashboard:

```bash
cd tools/agsm-dashboard
pnpm install
pnpm start -- --state ../../services/agsm/state/metrics.json --once
```

Pass `--watch` to stream updates as the Go runner writes new data.

## CI enforcement

`.github/workflows/agsm-probes.yml` runs the probe unit tests (which load the canary profile to guarantee failures are detected) and executes the production profile with `--exit-on-failure`. Any regression immediately blocks the associated pull request.
