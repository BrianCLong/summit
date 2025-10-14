# ADR-2025-09-30 — Deterministic Replay Engine for MCP Sessions
- Context: Debugging and compliance teams lack guaranteed replay of MCP sessions; current logs are lossy and Metorial advertises session replay, leaving us without verifiable evidence for audits or regressions.
- Decision: Build a deterministic replay engine that records MCP I/O, tool side effects, random seeds, and environment hashes, storing recordings in an immutable ledger and enabling time-travel visualization with causal diffs across agent/tool versions.
- Consequences: Imposes storage/compute costs for recordings, demands stub interfaces for external calls, and adds ingestion redaction, but unlocks ≥95% replay fidelity, SOC2-ready evidence, and clear differentiation vs Metorial.
- Status: Proposed
- Owner: Observability Guild
- Tags: observability, compliance, dx
