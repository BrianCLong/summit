# Cost Guardrails & Budgets

## Defaults

- Prod budget: ≤ $18,000/mo infra with LLM ≤ $5,000/mo (alert at 80%).
- CI budget: ≤ $5,000/mo (alert at 80%).
- Unit targets: ≤ $0.10 / 1k ingested events, ≤ $2 / 1M GraphQL calls.

## Enforcement

- `.github/workflows/ci-cost-guardrails.yml` estimates run and monthly cost by summing run durations × runner rate; fails if run>$30 or month>$5,000 (or ≥80% alert).
- GHCR image size budget: each image ≤ 350MB; CI fails if exceeded.
- `artifact-retention.yml` reduces storage spend by pruning large artifacts to 7 days.

## Playbooks

- If CI spend >80% mid-month: introduce `--since` and test matrix reduction; disable redundant jobs on forks; turn on Turbo remote cache; spot-check flakey tests.
- If unit costs breach targets: profile hottest endpoints; lower log verbosity; adjust resources/limits; enable gzip/br; adopt incremental data loads.

## Reporting

- Run `unit-cost-report` with inputs from Prometheus/Grafana billing dashboards to snapshot current unit costs into `unit-cost.json`.
