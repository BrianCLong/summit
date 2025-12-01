# Approvals SLO Breach Runbook

## Triggers
- `ApprovalsLatencyFastBurn`: p95 latency for approvals endpoints > 1.5s for 15 minutes.
- `ApprovalsErrorRateHigh`: error ratio above 0.5% for 10 minutes.
- `SyntheticApprovalsFailing`: synthetic happy-path failures for 15 minutes.
- `ProvenanceWriteFailures`: provenance writes are returning errors for 5 minutes.

## Immediate Actions
1. Open Grafana dashboard **CompanyOS – Approvals & Provenance**.
   - Identify degraded route (`/approvals` vs `/approvals/:id/decision`).
   - Check provenance error panel and policy decisions for downstream hotspots.
2. Inspect traces filtered by `service="approvals"` and duration >1.5s.
   - Look for slow downstream calls (OPA, DB, provenance, identity adapter).
3. If downstream bottlenecked:
   - Temporarily scale the impacted service or enable bypass/feature flag for non-prod tenants if allowed.
4. If OPA or policy checks are slow:
   - Verify policy bundle size/regressions; roll back to the previous bundle version.
5. If provenance writes are failing:
   - Validate DB/storage health; toggle fail-closed (block approval) per policy and communicate tenant impact.
6. Capture mitigation steps, temporary overrides (with expiry), and root cause for the incident record.

## Validation
- Confirm `service:http_request_duration_seconds:p95{service="approvals"}` < 1.5s and `service:http_requests_error_ratio:5m` < 0.005 for 30 minutes.
- Ensure `synthetic:approvals_error_ratio:5m` returns to 0 across the last 3 windows.

## Post-Incident
- File follow-up tickets for remediation, add regression tests for the failing path, and backfill provenance gaps if needed.
