# Route Optimization Runbook

## Feature Flag Enablement

1. Set `ROUTE_OPT_AGENT_ENABLED=true` in environment configuration.
2. Run `python scripts/ci/check_determinism_hash.py`.
3. Run `python scripts/ci/check_route_schema.py`.

## Rollback

1. Set `ROUTE_OPT_AGENT_ENABLED=false`.
2. Re-run CI checks to confirm deterministic baseline remains stable.

## SLO

- 99% successful deterministic runs for fixture replay workflow.

## Alerts

- Trigger alert when `artifacts/route_plan/drift_report.json` shows `hash_drift=true`.
