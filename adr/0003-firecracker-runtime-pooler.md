# ADR-0003: Firecracker Micro-VM Pooler for MCP Runtime

**Date:** 2025-09-30
**Status:** Proposed
**Area:** Infrastructure
**Owner:** Runtime Guild
**Tags:** runtime, performance, security, firecracker, micro-vm

## Context

Current MCP runtime relies on container autoscaling with minute-scale cold starts, coarse-grained tenancy, and no deterministic sandboxing, limiting our ability to beat Metorial's performance/SLO targets.

## Decision

Adopt Firecracker micro-VMs orchestrated by a pooler that maintains warm workers per tool class, supports autoscale-to-zero, injects scoped capability tokens, and enforces deterministic sandboxes via snapshot/seed capture.

### Key Components
- **Firecracker Pooler Service**: Rust-based orchestrator managing VM lifecycle
- **Warm Pool**: Pre-warmed VMs per tool class for instant allocation
- **Snapshot Management**: Deterministic VM state capture for reproducibility
- **Capability Injection**: Scoped tokens for secure tool execution
- **K8s Integration**: Custom controller for pod-to-microVM mapping

## Alternatives Considered

### Alternative 1: Container-based isolation
- **Pros:** Familiar tooling, existing infrastructure
- **Cons:** Minute-scale cold starts, weaker isolation, no determinism
- **Cost/Complexity:** Lower complexity, inadequate performance

### Alternative 2: gVisor/Kata Containers
- **Pros:** Better isolation than containers, existing K8s support
- **Cons:** Higher overhead than Firecracker, limited determinism
- **Cost/Complexity:** Moderate improvement, not sufficient for SLOs

## Consequences

### Positive
- Delivers ≤300ms cold start (vs. 60s+ for containers)
- ≤150ms platform overhead per invocation
- Auditable isolation with attestation
- Deterministic execution via snapshot/seed

### Negative
- Requires new pooler service (Rust expertise needed)
- Upfront investment in snapshot management pipelines
- K8s integration complexity
- New operational runbooks

### Operational Impact
- **Monitoring**: Track warm pool utilization, cold start latency, VM churn
- **Security**: Attestation pipelines for VM integrity verification
- **Compliance**: Auditable isolation boundaries for SOC2

## Code References

### Core Implementation
- `services/mcp-pooler/` - Firecracker pooler service (Rust)
- `k8s/controllers/microvm-controller/` - Custom K8s controller
- `infra/terraform/firecracker/` - Infrastructure provisioning

## References

### Related ADRs
- ADR-0004: Deterministic Replay Engine (depends on deterministic sandboxing)
- ADR-0010: Multi-Tenant Compartment Model (isolation boundaries)

### External Resources
- [Firecracker Documentation](https://firecracker-microvm.github.io/)
- [MicroVM Design Patterns](https://aws.amazon.com/blogs/opensource/firecracker-open-source-secure-fast-microvm-serverless/)

---

## Revision History

| Date | Author | Change |
|------|--------|--------|
| 2025-09-30 | Runtime Guild | Initial proposal |
