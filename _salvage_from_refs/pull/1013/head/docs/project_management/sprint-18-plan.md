# Sprint 18 Plan

## Goals
- Harden subscription and query paths for 10× scale.
- Ship Federated Clean Rooms v1 with signed manifests and residency/DLP gates.
- Validate cache coherency under load.

## Scope
- Backpressure and metrics for subscriptions.
- Subgraph cache with event invalidation.
- Clean room manifest handling and guard.
- Perf dashboards and index packs.

## Timeline
- **Week 1:** implement features, initial tests.
- **Week 2:** soak tests, documentation, release candidate.

## Definition of Done
- `make sprint18` passes.
- Subscriptions persisted-only with metrics.
- Clean room policies enforced and tested.
- Cache coherency e2e green.

## Backlog
| Item | Acceptance Criteria |
| --- | --- |
| Subscription backpressure | drops <0.5%, p95 ≤300ms |
| Clean room guard | manifest required, only allowed queries run |
| Cache coherency | invalidation triggers fresh reads |
| Perf report | cost/1k ops and latency recorded |
