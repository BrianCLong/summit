# MC v0.4.3 — Quantum‑Enhanced Cognitive Networks

**Goal**: Safely integrate quantum backends into the Cognitive Synthesis Engine (CSE) for query‑time acceleration and federated training—under strict cost, residency, privacy, and provenance guardrails.

**Non‑Goals**: New autonomy levels; generalized AGI claims; unbounded egress.

**Constraints**: Persisted‑only API; OPA/ABAC; PQ dual‑sign; zk fairness; HITL for scope; residency locks per quantum region; QC budget ceilings per tenant.

**Risks**: Cloud‑provider drift; QC queue unpredictability; cost spikes; mixed‑mode correctness gaps.

**Done**: All epics meet AC; rollout gates pass (p95 ≤350ms; QC cost/tenant ≤ ceiling); evidence bundle signed; error‑budget burn <20% during canaries.

---
## Epics
- **E1 Quantum Orchestration Gateway (QOG)** — Broker for quantum/classical/emu backends with deterministic fallbacks and correctness checks.
- **E2 Residency & Sovereignty for QC** — Region‑pinned job routing; per‑tenant residency proofs; export controls.
- **E3 QC Budget Guard v3** — Per‑tenant QC minute ceilings, surge protection, and composite cost score.
- **E4 Mixed‑Mode Correctness** — Differential tests (classical vs emu vs QC) + zk‑bounded‑error attestations.
- **E5 Federated Quantum Learning (FQL) Hooks** — Privacy‑preserving updates with DP budgets and post‑quantum secure aggregation.
- **E6 Sovereign Console v3** — UI: quantum job queue, budgets, residency map, correctness tiles, attestor status.