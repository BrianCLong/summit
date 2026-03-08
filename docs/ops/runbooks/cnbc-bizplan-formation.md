# Runbook — CNBC Business Plan and Formation Readiness

## SLO

- 99% deterministic validation success for scheduled runs.

## Alerts

- Trigger investigation when schema failure rate exceeds 10%.

## Rollback

1. Disable the module feature flag.
2. Re-run baseline pipeline to confirm default posture.
3. Publish rollback evidence with report, metrics, and stamp artifacts.
