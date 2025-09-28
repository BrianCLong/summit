---
id: canary-rollback
sidebar_position: 6
title: Canary Rollback
---

This runbook covers the automated and manual steps required when a canary deployment violates
SLO policy or synthetic probes trigger an abort. It aligns with the MVP objective of maintaining
median rollback durations below five minutes and limiting false aborts to <2% per quarter.

## Trigger Conditions

- Alertmanager fires `CanarySLOBurn` or `SyntheticProbeFailure` routed to reliability-oncall.
- Adaptive canary controller emits a `ROLLBACK` webhook event (captured in CI logs).
- Cosign admission policy blocks an unsigned manifest (`UnsignedArtifactBlocked`).

## Immediate Actions (T+0)

1. Acknowledge PagerDuty page and join the dedicated Slack incident channel.
2. Confirm cosign verification status by checking the CI `verify-provenance` job artifact.
3. Capture Grafana snapshots for `Canary Release Overview` and `Rollback Operations` dashboards.

## Automated Rollback Path

1. Adaptive controller issues rollout abort and scales stable ReplicaSet back to 100% traffic.
2. Synthetic probe suite enters heightened sampling (cron `*/1 * * * *`) to verify recovery.
3. Admission policy audit ensures no unsigned images remain scheduled.

## Manual Fallback (if automation fails)

1. Run `kubectl argo rollouts rollback maestro-api-canary`.
2. Disable adaptive feature flags using `adaptive-canary.py --disable-feature`.
3. Apply previous signed manifest from artifact store (`cosign verify-blob` prior to apply).

## Post-Incident Tasks (T+30m)

1. Update `.evidence/` with timeline, Grafana PNG, webhook payload, and signed manifest digest.
2. Open Friday evidence review issue linking to `.prbodies/` entry for traceability.
3. Re-enable feature flags gradually once synthetic availability > 99.9% for 15m.

## References

- `rollouts.yaml`
- `controllers/adaptive-canary.py`
- `alertmanager/canary-routes.yaml`
- `.github/workflows/verify-provenance.yml`
- `synthetics/maestro-api-canary.yaml`
