# Query Cost Controls

## Cost Model
- Estimates based on rows scanned, projected execution time, join fan-out, and graph traversal depth.
- Default weightings: `rows_scanned*0.4 + time_ms*0.3 + fanout*0.2 + depth*0.1`.

## Caps
- **Hard caps:** block when estimated time > 5s or rows > 5M.
- **Soft caps:** warn and require elevated approval when time > 2s or rows > 1M; users can request step-up MFA.

## Per-Tenant Limits
- Rate limiting tokens per tenant stored in `tools/security/query-guard/tenant-limits.yaml`.
- Concurrency caps: default 5 concurrent heavy queries per tenant.

## Auditing & Metrics
- Emit audit events with tenant, query hash, estimated cost, cap action, and requester.
- Dashboards highlight top expensive queries and actors.

## Acceptance
- Crafted expensive query is blocked with clear message and audit record; see sample in `test-results/security/query-block.txt`.
