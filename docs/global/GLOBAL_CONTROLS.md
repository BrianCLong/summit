# Global Identity, Policy, and Cost Controls

## Identity

- **Global identity store**: Strongly consistent control-plane service with per-tenant namespaces and signed mutations.
- **Regional enforcement**: Local services cache identity tokens but validate against control-plane version and signature. Stale caches trigger deny-by-default.
- **Split-brain prevention**: All identity mutations require quorum and fencing tokens; regions reject updates if control-plane commit index regresses.

## Policy

- **Central definitions**: Policies are versioned, signed bundles distributed via control-plane replication with monotonic versioning.
- **Regional enforcement**: Gateways and services cache policies with TTL and signature validation; cache miss or stale detection results in deny + refresh request.
- **Safe degradation**: If policy service is unreachable, regional PEPs enforce last-known-good policy with tightened defaults (deny risky actions, restrict cross-region access) and emit alerts.

## Cost & Budgets

- **Global budgets**: Maintained in the control plane with per-tenant and per-service limits; updates are strongly consistent and versioned.
- **Regional accounting**: Usage meters emit events with residency and policy version tags; aggregation jobs reconcile to global budgets with idempotent upserts.
- **Overspend prevention**: Regional gateways enforce budget checks before admitting costly operations; thresholds trigger soft limits (rate limiting) then hard stops with audit receipts.

## Controls Evidence

- Every identity, policy, and budget decision emits provenance with actor, control-plane commit index, policy version, and residency decision.
- Periodic audits generate attestations per region summarizing policy cache health, denied due to stale policy, and budget enforcement actions.
