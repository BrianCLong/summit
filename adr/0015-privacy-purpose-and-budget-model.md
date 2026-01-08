# 0015 - Privacy Purpose Enforcement & Budget Model

## Status

Accepted

## Context

Sensitive datasets require strict purpose limitation and access accounting. Prior logs lacked enforced purpose declarations and offered no automatic throttling when usage spiked, risking policy violations.

## Decision

- Require `X-Purpose` header on sensitive queries validated against allow-list per tenant.
- Track access budgets per tenant/dataset/user with Redis counters and Postgres checkpoints.
- Emit structured audit events (`privacy.accessed.v1`) to ledger + stream for analytics.
- Block and alert when budgets are exhausted or purpose missing.

## Alternatives Considered

1. **Soft enforcement (log-only)**: low friction but no protection; rejected.
2. **Static quotas only**: simpler but ignores burst detection and purpose context; rejected.
3. **Per-user only budgets**: ignores tenant-level constraints; rejected.

## Consequences

- - Enforced purpose and quantitative budgets reduce misuse risk.
- - Auditable trail for compliance.
- - Slight latency overhead (counter checks); - need to tune defaults per tenant.

## Validation

- Unit tests for purpose allow-list; integration tests for burst/daily budget exhaustion.
- Dashboards track remaining budget and violations.

## References

- `docs/wave13/privacy-policies.md`
- `docs/wave13/observability-dashboards.md`
