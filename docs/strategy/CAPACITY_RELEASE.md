# Capacity Release & SLA Safety

## Released Headroom

| Domain            | Baseline Capacity | Current Headroom                 | Notes                               |
| ----------------- | ----------------- | -------------------------------- | ----------------------------------- |
| Copilot QPS       | 30 RPS            | +20% (elastic to 36 RPS)         | Enabled via concurrency tuning      |
| Ingestion Workers | 24 workers        | -                                | Pending dynamic autoscaling rollout |
| Storage           | 2 TB provisioned  | +15% effective after compression | Vector + audit log combined         |

## SLA Re-validation Plan

1. Run golden-path smoke tests (`make smoke`).
2. Run latency validation against p95/p99 guardrails using `scripts/verify_cost_perf_guardrails.sh`.
3. Validate error budgets remain >=90% remaining against 99% availability SLO.
4. Perform rollback drill for each optimization kill switch.

## Evidence Capture

- Store measurement artifacts in `artifacts/cost_perf/latest.json` with timestamp and workload descriptors.
- Document validation in PRs and link to guardrail run.

## Owners & Cadence

- Reliability owner: SRE lead
- Validation cadence: per-optimization and pre-release freeze
