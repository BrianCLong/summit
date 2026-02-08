# Claim Lifetimes Runbook

## Scope
Operate and monitor claim lifecycle enforcement for scoped GraphRAG inference.

## Lifecycle States
1. **Active**: claim is valid and within TTL.
2. **Expiring**: `valid_to` approaching; queued for revalidation.
3. **Expired**: claim is invalid and removed from active inference use.
4. **Promoted**: derived claim promoted to fact through governance workflow.

## Sweeper Schedule
- Run TTL sweeper every 15 minutes.
- Backoff on load spikes to avoid query saturation.

## Failure Modes
- **Sweeper lag**: claims remain active past `valid_to`.
- **Revalidation failure**: claims expire without refresh.
- **Promotion backlog**: approved claims not promoted in time.

## Alerts
- TTL sweeper failure rate > 1% over 1h.
- Expired claims reused in inference > 0.
- Promotion queue age > 24h.

## Rollback Plan
1. Disable inference traversal (`allow_inference = false`).
2. Pause promotion jobs.
3. Run cleanup of derived nodes with `valid_to < now`.

## Data Retention
- Derived claims: 30-day retention (configurable via policy).
- Scope metadata: 90-day retention for audit replay.

## Evidence Artifacts
Each run must include:
- `report.json` with counts and state transitions.
- `metrics.json` with `expired_claim_reuse` and `ttl_lag_ms`.
- `stamp.json` with `scope_id` and `policy_id`.
