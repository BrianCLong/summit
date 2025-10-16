# ADR-2025-09-30 — Firecracker Micro-VM Pooler for MCP Runtime

- Context: Current MCP runtime relies on container autoscaling with minute-scale cold starts, coarse-grained tenancy, and no deterministic sandboxing, limiting our ability to beat Metorial's performance/SLO targets.
- Decision: Adopt Firecracker micro-VMs orchestrated by a pooler that maintains warm workers per tool class, supports autoscale-to-zero, injects scoped capability tokens, and enforces deterministic sandboxes via snapshot/seed capture.
- Consequences: Requires new pooler service (Rust) integrating with K8s, upfront investment in snapshot management and attestation pipelines, but delivers ≤300 ms cold start, ≤150 ms platform overhead, and auditable isolation.
- Status: Proposed
- Owner: Runtime Guild
- Tags: runtime, performance, security
