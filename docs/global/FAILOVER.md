# Failover Strategy

## Automated Failover

- **Health detection**: Multi-signal (synthetic checks, saturation metrics, dependency probes) feeding quorum-based failover controller. Requires consecutive failures beyond regional SLO thresholds before initiating traffic shift.
- **Traffic shift**: Edge routing updates Anycast/DNS weights to the nearest healthy region. New writes require residency and fencing validation; ineligible tenants receive controlled deny with guidance.
- **Back-pressure**: During instability, gateways enforce rate limits and circuit breaking to prevent cascading failure. Replication relays pause on conflicting states.

## Safety Controls

- **Write fencing**: Failover controller issues fencing tokens per tenant; target region accepts writes only with valid tokens and matching control-plane commit index.
- **Data integrity**: Before promoting replicas, run consistency and replication-lag checks; promotion is blocked if divergence exceeds thresholds.
- **Rollback**: If health recovers before full promotion, rollback shifts traffic back after stability window and reconciliation.

## Observability

- Emit events: `failover.triggered`, `failover.completed`, `failover.blocked` with region, tenant, reason, and control-plane version.
- Dashboards show replication lag, error budgets, and active failover state per tenant.
