# Privacy Purpose & Budget Policies

## Purpose Enumeration

- `investigation`: casework tied to ticket/lead IDs
- `training`: analyst enablement with synthetic/redacted data only
- `demo`: time-boxed showcase with non-sensitive datasets
- `maintenance`: operational checks limited to service owners
- `research`: offline experimentation on approved datasets

Any request hitting sensitive datasets must include `X-Purpose` with one of the above values. Unknown or missing → block (HTTP 412).

## Policy Validation Flow

1. API gateway verifies `X-Purpose` against allow-list and tenant policy.
2. Maps request to dataset sensitivity (PII, SIGINT, HUMINT, finance) using catalog metadata.
3. Determines budget bucket (per-tenant + per-dataset + optional per-user overrides).
4. Emits access event and decrements budget counters atomically; rejects when below zero.

## Budget Thresholds (defaults)

- **Tenant Daily**: 10k sensitive reads per dataset
- **Burst**: 500 requests within 5 minutes
- **Per-User Daily**: 1k sensitive reads
- **Reset**: UTC midnight with rolling checkpoint persisted to Postgres

## Alerting & Block Logic

- `remaining <= 0`: block + PagerDuty + Slack alert with recent request sample
- `remaining < 10%`: warn; continue but mark responses with `X-Privacy-Budget: low`
- Missing/invalid purpose: block with remediation hint

## Audit Shape

```json
{
  "event": "privacy.accessed.v1",
  "who": "user@tenant",
  "tenant": "acme",
  "dataset": "signals.piireport",
  "purpose": "investigation",
  "volume": 42,
  "decision": "allow|block",
  "timestamp": "2025-09-12T12:00:00Z"
}
```

## Tests

- Policy unit tests validate enumeration and block paths.
- Budget integration tests simulate rapid-fire accesses to trip burst and daily thresholds.
