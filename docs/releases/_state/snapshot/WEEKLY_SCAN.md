# Early-Week Signal Scan

**Date:** 2026-01-26
**Operator:** Jules

## Signal Status

| Signal | Baseline Expectation | Current Observation | Classification | Notes |
|---|---|---|---|---|
| Required Checks | Green (Pass) | UNAVAILABLE | UNAVAILABLE | Cannot verify CI status (gh tool missing). |
| Merge Queue | Healthy (Empty/Green) | 2 Open, 1 Blocked (Fail) | DEGRADED | PR #1025 blocked/failing. |
| Governance Drift | None | None | NO CHANGE | Clean drift check. |
| Evidence Freshness | Green (Pass) | Pending | DEGRADED | Metric badge shows 'pending', though state file shows pass. |
| Security Alerts | None | UNAVAILABLE | UNAVAILABLE | Cannot verify alerts (gh tool missing). |

## Deviations

*   **Merge Queue**: PR #1025 is blocked and failing checks.
*   **Evidence Freshness**: Metric status is 'pending', creating ambiguity vs state file.
*   **Availability**: CI and Security signals are unavailable due to tooling constraints.
