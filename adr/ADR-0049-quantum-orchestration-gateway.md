# ADR‑0049: Quantum Orchestration Gateway (QOG)
**Decision**: Introduce a broker that selects among {classical, emulator, QC} backends with policy‑driven routing (residency, cost, latency, correctness) and fail‑closed semantics.
**Why**: Hide provider specifics, enforce guardrails, and preserve determinism via emulation and proofs.
**Consequences**: Slight latency overhead for checks; strong safety/usability gains.