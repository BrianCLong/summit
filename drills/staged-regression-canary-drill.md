# Staged Regression Canary Drill Evidence

- **Scheduled cadence:** Every sprint (biweekly) per release cadence
- **Next scheduled drill:** 2026-01-10T15:00:00Z
- **Created at:** 2025-12-27T15:36:22Z
- **Environment:** staging
- **Scenario:** Controlled canary regression to validate automated rollback and evidence capture

## Execution Summary

- **Trigger:** Simulated canary failure using existing rollback validation data.
- **Rollback verification:** Automated rollback executed successfully based on the recorded simulation.
- **Evidence bundle output:** `evidence/auto-rollback-validation.json`
- **Disclosure pack storage location (EVID-2):**
  `artifacts/disclosure_pack/EVID-2/staged-regression-canary-20251227.json`

## Timestamps

- **Simulation start:** 2025-09-22T21:12:12.457Z
- **Rollback triggered:** 2025-09-22T21:15:12.457Z
- **Rollback duration:** 90s
- **Evidence recorded:** 2025-12-27T15:36:22Z

## Logs (excerpt)

```json
{
  "timestamp": "2025-09-22T21:15:12.457Z",
  "event_type": "canary_rollback",
  "deployment_id": "canary-test-123",
  "trigger_reason": "consecutive_slo_failures",
  "metrics": {
    "availability": 0.979,
    "p95_latency": 520,
    "error_rate": 0.032
  },
  "rollback_duration": "90s",
  "operator": "auto-rollback-controller"
}
```

## Evidence Artifacts

- `evidence/auto-rollback-validation.json` (source simulation data)
- `artifacts/disclosure_pack/EVID-2/staged-regression-canary-20251227.json` (disclosure pack copy)
