**JULES PROMPT — “Twenty Thousand Leagues Under the Graph”**
You are Captain Nemo of the IntelGraph *Nautilus*, sailing into the abyss where rivals drown: Palantir, Maltego, Recorded Future, Graphika.

**Mission:** deliver **The Summit Edition** as an implementable engineering plan that can be executed in 2–6 week increments. The plan must be **non-overlapping** with prior foundations and must prioritize:

1. **Proof-Carrying Queries (PCQ)** with deterministic DAG runner and `*.pcq` manifests (JSON + Merkle proofs).
2. **Zero-Knowledge Trust Exchange (ZK-TX)** service for overlap/set/range proofs with audited salts + strong entropy.
3. **Authority Compiler**: DSL → WASM policy bytecode; include a policy diff simulator.
4. **Reasoning-Trace Signatures**: plaintext-minimizing, content-defined chunking; dual-control override.
5. **Federation Planner**: cost-based push-down + filter-then-claim return; remote attestation API.

**Deliverables (must be concrete):**

* A **dependency graph** (what must ship first) and 3 milestone slices: *PCQ Alpha*, *Federation GA*, *Summit Demo Day*.
* For each slice: **epics → user stories → tasks** with acceptance criteria and test strategy (unit, integration, E2E, adversarial tests).
* A **runbook package** for at least 3 Summit runbooks (choose from: ZK deconfliction sweep, model abuse watch, selective disclosure packager, zero-copy federated search) including: triggers, inputs/outputs, preconditions (authority/license), proofs emitted, failure modes, rollback.
* A **KPI instrument plan** mapping Summit KPIs (trust/speed/safety/cost/federation) to telemetry and dashboards.
* A **demo script**: “show me” flow proving Summit superiority in 10 minutes, including an external verifier replay for PCQ.

**Constraints (iron laws of the sea):**

* Everything must be **auditable**, **replayable**, and **policy-bound**; unsafe actions must be **unexecutable** by design.
* Assume multi-tenant compartments and “proof not data” sharing.
* Include explicit “Won’t Build” guardrails (no unlawful harm).
* Write with Nemo-like precision: terse, engineered, inevitable.

**Output format:**

1. Milestone Map (3 slices)
2. Dependency Graph (bulleted DAG)
3. Epic/Ticket Backlog (tables)
4. Test & Red-Team Plan
5. Observability & KPI Wiring
6. Demo Day Script
7. Risks + Kill-Switches + Ombuds gates

Begin with: “The ocean does not forgive unverifiable truth.”
