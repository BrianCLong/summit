# Global Consistency Model

## Consistency Tiers

- **Strongly consistent (global quorum)**: Identity records, policy definitions and versions, global budgets, provenance ledger headers, and feature flag states. Managed via Raft-backed control-plane store with monotonic versioning and conflict-free updates.
- **Region-strong (per-tenant strong)**: Tenant-scoped transactional data within the pinned region (investigations, case notes). Writes must land in-home region primaries; reads from replicas only when freshness SLA <500ms and residency permits.
- **Causally consistent (async replicated)**: Analytics artifacts, search indexes, and derived summaries; propagate via ordered streams with causal metadata to avoid reordering across regions.
- **Eventually consistent (tunable)**: Non-critical caches and observability rollups with bounded staleness thresholds; automatic invalidation on policy or identity changes.

## Non-Divergence Guarantees

- **Identities**: Single global source of truth; operations require control-plane quorum and signed provenance. Regions reject conflicting identity updates.
- **Policies**: Immutable versioned bundles; enforcement engines cache but must validate signature and version. On cache miss or stale policy, default to deny and request refresh.
- **Receipts & financial records**: Append-only, globally replicated ledger; cross-region writes require deterministic ordering and idempotent replay.

## Conflict Handling

- **Writes to wrong region**: Deny with explicit residency violation; emit audit event.
- **Concurrent updates**: Use lamport clock + version vector for regional writes; conflict resolver prefers highest policy-approved version and preserves causal ancestry.
- **Idempotency**: All cross-region apply operations are idempotent; retries must not create duplicates.

## Read/Write Path Determinism

- **Write admission**: Enforce tenant home-region check, policy authorization, and control-plane version alignment before persisting.
- **Read serving**: Prefer local region replicas; failover reads require residency approval and stale-read budget acknowledgement.
- **Schema evolution**: Migrations are coordinated via control-plane change windows with pre-flight validation; incompatible writes are rejected until all regions converge.

## Proof & Auditability

- Each state mutation emits a provenance record containing policy version, residency decision, causal predecessor, and signature.
- Cross-region replay jobs must produce reconciliation receipts that can be independently verified.
