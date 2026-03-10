# Epistemic Assurance Plane Runbooks

## Scenarios
*   Policy threshold misconfiguration
*   Evidence bundle validation failures
*   Drift spike in blocked-vs-approved ratio
*   Provenance write failures
*   Stale-source outbreak
*   Emergency feature-flag rollback

## Alerts
*   Publication approvals with missing provenance > 0
*   Independent-source validator error rate
*   Drift detector threshold breach
*   Decision latency p95 budget exceeded

## SLO/SLA Assumptions
*   Decision service availability 99.9%
*   Zero publish decisions without evidence bundle
*   24h max to investigate policy drift alert
