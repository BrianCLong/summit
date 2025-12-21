# Multi-Region Active/Active v1 Strategy

## Traffic Steering
- Global DNS steering via health-checked records; failover policy prefers Region A → Region B with 30s TTL.
- Health probes: `/healthz` (liveness) and `/readyz` (readiness) endpoints; traffic drained when readiness fails.

## Consistency & Data
- **Write locality:** tenant-affined writes to primary region; cross-region replication via logical replication.
- **Consistency:** Strong within region; eventual across regions using last-write-wins with vector-clock metadata for conflict resolution.
- **Anti-entropy:** Periodic reconciliation job every 5 minutes with audit trail in `replication_conflicts` table.

## Regional Policy Enforcement
- Data residency tagging per tenant; router rejects requests if region violates residency.
- Tenant routing map maintained in `tools/security/active-active/tenant-routing.yaml`.

## Game-Day Plan
- Simulate region outage monthly via `tools/security/active-active/failover-plan.md` checklist.
- Measure RTO: target < 2 minutes; record timestamps in failover report template `tools/security/active-active/failover-report.md`.

## Acceptance Test
- During game-day, inject failure in Region A load balancer; confirm traffic steers to Region B and API health remains 2xx.
- Capture report in `test-results/security/failover-report-sample.md`.
