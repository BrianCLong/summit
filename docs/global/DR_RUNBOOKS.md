# Disaster Recovery Runbooks

## Region Loss

1. Declare incident; freeze risky deployments.
2. Verify health signals and confirm outage across AZs.
3. Activate failover controller; issue fencing tokens for eligible tenants.
4. Promote replicas after integrity checks; block tenants lacking residency clearance.
5. Shift traffic via edge routing updates; monitor error budgets and replication lag.
6. Post-failover: run reconciliation, emit provenance receipts, and schedule backfill for delayed queues.

## Partial Dependency Loss (DB/IdP/Queue)

1. Detect via dependency probes; isolate failing dependency.
2. Engage circuit breakers and degrade features that depend on the component.
3. If DB partial: route read-only traffic where safe; queue writes locally with durability until dependency recovers or controlled failover is approved.
4. If IdP partial: enforce cached tokens within TTL and require step-up auth for sensitive actions; deny if TTL expired.
5. If queue partial: buffer to local durable store; replay when healthy with idempotent consumers.
6. Document timelines, affected tenants, and policy decisions.

## Data Repair

1. Identify divergence via reconciliation jobs; quarantine inconsistent records.
2. Run replay from immutable logs/CDC with idempotent apply; use deterministic conflict resolver.
3. Generate reconciliation receipts summarizing repaired records and residual drift.
4. If manual intervention required, capture operator approvals and attach to provenance ledger.

## Game Days

- Schedule quarterly region-loss and dependency-failure simulations.
- Predefine success metrics: RTO/RPO per tier, residency violation count, failover completion time.
- Capture evidence: metrics snapshots, logs, provenance receipts, and operator timeline.
