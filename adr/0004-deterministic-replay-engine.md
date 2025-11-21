# ADR-0004: Deterministic Replay Engine for MCP Sessions

**Date:** 2025-09-30
**Status:** Proposed
**Area:** Observability
**Owner:** Observability Guild
**Tags:** observability, compliance, dx, replay, debugging

## Context

Debugging and compliance teams lack guaranteed replay of MCP sessions; current logs are lossy and Metorial advertises session replay, leaving us without verifiable evidence for audits or regressions.

## Decision

Build a deterministic replay engine that records MCP I/O, tool side effects, random seeds, and environment hashes, storing recordings in an immutable ledger and enabling time-travel visualization with causal diffs across agent/tool versions.

### Key Components
- **Recording Layer**: Captures all I/O, side effects, seeds, environment state
- **Immutable Ledger Storage**: Append-only storage with content-addressed retrieval
- **Replay Runtime**: Deterministic re-execution with stubbed external calls
- **Time-Travel UI**: Visualization with causal diffs and version comparison
- **Redaction Pipeline**: PII/sensitive data removal before storage

## Alternatives Considered

### Alternative 1: Enhanced Logging
- **Pros:** Low implementation cost, familiar tooling
- **Cons:** Lossy, no determinism, no replay capability
- **Cost/Complexity:** Low cost, inadequate for compliance

### Alternative 2: Third-party APM Recording
- **Pros:** Off-the-shelf solution, existing vendor relationships
- **Cons:** Not deterministic, high storage costs, vendor lock-in
- **Cost/Complexity:** High recurring cost, limited control

## Consequences

### Positive
- Unlocks ≥95% replay fidelity for debugging
- SOC2-ready evidence for compliance audits
- Clear differentiation vs. Metorial
- Regression detection via version diff visualization

### Negative
- Storage/compute costs for recordings (~$0.02/session)
- Requires stub interfaces for external API calls
- Redaction pipeline adds ingestion latency (~50ms)
- Complexity in maintaining determinism guarantees

### Operational Impact
- **Monitoring**: Track replay success rate, storage growth, redaction effectiveness
- **Compliance**: Retention policies, audit access logging
- **Performance**: Optimize recording overhead (<5% latency impact)

## Code References

### Core Implementation
- `services/replay-engine/` - Core replay service
- `server/src/middleware/recording.ts` - Recording instrumentation
- `packages/replay-viewer/` - Time-travel visualization UI

### Data Models
- `server/src/db/schema/recordings.ts` - Recording metadata schema
- `proto/replay.proto` - Recording wire format

## References

### Related ADRs
- ADR-0003: Firecracker Micro-VM Pooler (enables deterministic sandboxing)
- ADR-0011: Provenance Ledger Schema (immutable storage backend)

---

## Revision History

| Date | Author | Change |
|------|--------|--------|
| 2025-09-30 | Observability Guild | Initial proposal |
