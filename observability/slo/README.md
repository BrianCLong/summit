# CompanyOS SLOs and rollout gating

This directory holds service SLO definitions consumed by Prometheus rules and the canary gate script. The `companyos-api.slo.yaml` file is the source of truth for availability, latency, error-budget policies, and canary thresholds.

## Usage

- Prometheus rule files under `observability/prometheus/` consume the metrics defined here for recording/alerting.
- The canary SLO gate (`companyos/scripts/check-canary-slo.mjs`) reads this config to derive canary windows, factor/absolute guardrails, and the availability objective.
- Update the SLO file first; workflows referencing it will pick up changes without code edits.

## Adding a new service

1. Copy `companyos-api.slo.yaml` to `<service>.slo.yaml` and adjust ownership, objectives, and thresholds.
2. Add matching Prometheus recording and alert rules for the service.
3. Wire the CI/CD canary gate to the new SLO config path via `SLO_CONFIG_PATH`.
