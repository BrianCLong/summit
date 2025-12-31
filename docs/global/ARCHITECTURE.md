# Global Active/Active Architecture

## Overview

The platform operates in an active/active posture across at least two regions with deterministic control-plane coordination and regionally isolated data planes. Traffic is routed to the nearest healthy region with safety guardrails that prevent policy drift or residency violations.

## Traffic Routing

- **Edge layer**: Dual approach with Anycast for health-based steering and DNS geo-routing as a deterministic fallback. Health signals feed both layers.
- **L7 ingress**: Regional gateways terminate TLS, enforce WAF/Rate limits, and apply per-tenant residency admission checks before dispatching to services.
- **Session affinity**: Sticky routing is enabled only when transactional consistency requires it (e.g., interactive investigations) and is scoped by tenant residency.
- **Back-pressure**: During instability, edge responds with 429/503 and shifts new traffic to healthy regions after quorum-based health validation.

## Control Plane vs Data Plane

- **Control Plane (Global quorum)**: Identity, policy distribution, budget/cost controls, topology/feature flags, and provenance ledger headers. Implemented as a globally replicated, strongly consistent service with Raft/etcd semantics and per-tenant namespaces.
- **Data Plane (Regional isolation)**: Compute, storage, and streaming remain region-local. Cross-region data movement occurs only through approved replication channels with residency-aware routing.
- **Change propagation**: Control updates are rolled out via signed deltas with monotonic versioning and audit receipts. Regions reject stale or unsigned control updates.

## Regional Isolation Boundaries

- **Blast radius**: Each region has isolated data stores, message buses, and secrets. Shared dependencies (IdP, DNS, object storage) are configured per-region endpoints with failover-aware credentials.
- **Tenant pinning**: Tenants are pinned to a home region; write paths enforce residency before admission. Read replicas are allowed only where policy explicitly permits.
- **Feature toggles**: Safety features default to conservative behavior (deny on uncertainty). Overrides require signed control-plane approval with provenance.

## Failure Domains

- **Region**: Full regional outage triggers automatic failover for eligible tenants with per-tenant residency checks and write-safety fencing.
- **Availability Zone (AZ)**: Zonal failures are absorbed by regional redundancy; no cross-region spillover unless residency allows.
- **Dependencies**: IdP, databases, queues, object stores are treated as independent failure domains. Health is monitored individually and used to gate routing decisions.

## Determinism & Ordering

- Control-plane updates use logical clocks (Lamport) and are committed through Raft quorum to prevent split-brain.
- Data-plane replication channels carry monotonic sequence numbers with idempotent apply semantics.
- Recovery actions (replays, repairs) must emit provenance receipts describing ordering and causal chain.

## Security & Governance Hooks

- All cross-region calls attach signed provenance headers including tenant, residency scope, policy version, and control-plane commit index.
- Policy enforcement points are collocated with ingress and critical write services; defaults are fail-closed.
- Audit events are double-written to regional append-only logs and a tamper-evident global ledger.
