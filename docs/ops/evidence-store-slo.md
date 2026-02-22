# Evidence Store SLOs

## Summit Readiness Assertion
This SLO set aligns with `docs/SUMMIT_READINESS_ASSERTION.md`.

## Service Level Objectives
- **Ingest Latency p95**: ≤ 5 seconds per bundle.
- **Verification Latency p95**: ≤ 10 seconds per bundle.
- **Availability**: 99.9% monthly.

## Error Budget Policy
- Freeze new policy rollouts if error budget burns > 20% in a week.

## Dashboards
- Ingest latency + error rate.
- Verification latency + policy decision counts.
