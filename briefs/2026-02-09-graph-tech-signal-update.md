# Daily Graph Tech & Neo4j Automation — Incremental Signal Update (2026-02-09)

**Mode:** Sensing

## UEF Evidence Bundle (Raw Signals)

1. **GraphRAG evidence arbitration layers are now inserted between retrieval and generation.**
   * Retrieved subgraphs pass through arbitration before LLM access.
   * Arbitration resolves conflicts, ranks evidence strength, and suppresses weaker proofs.
   * Arbitration is rule-based or graph-metric-driven, not LLM-driven.

2. **Cypher is being structured as deterministic reasoning primitives.**
   * Queries are named and versioned (e.g., `prove_employment_relation_v3`).
   * Each primitive has a fixed semantic contract and bounded output shape.
   * LLMs orchestrate primitives; they do not author graph logic.

3. **Knowledge graph–LLM fusion is formalizing claim dependency graphs.**
   * Claims are linked by dependency edges (supports/refutes/refines).
   * LLMs are prompted with a claim graph rather than flat lists.

4. **GNNs are predicting retrieval yield before traversal.**
   * Predictive scoring skips low-yield traversals or replaces them.
   * This stabilizes latency and increases evidence quality in dense graphs.

## Summit Readiness Assertion Alignment

This update is aligned with the Summit Readiness Assertion and the governing constitution. The present guidance is anchored in the authoritative files below to ensure consistency and auditability.

* `docs/SUMMIT_READINESS_ASSERTION.md`
* `docs/governance/CONSTITUTION.md`
* `docs/ga/TESTING-STRATEGY.md`

## Deterministic Actions (Governed)

1. **Evidence Arbitration Gate**
   * Insert a deterministic arbitration step between retrieval and generation.
   * Arbitration rules are encoded as graph-metric policies and applied before LLM access.

2. **Reasoning Primitive Catalog**
   * Define Cypher primitives as versioned, named contracts.
   * Enforce bounded outputs and deterministic ordering for every primitive.

3. **Claim Dependency Graph Input**
   * Normalize claims into a dependency graph with supports/refutes/refines edges.
   * Use the claim graph as the sole LLM prompt substrate for reasoning chains.

4. **Predictive Retrieval Yield**
   * Pre-score traversals with GNN predictors.
   * Skip low-yield traversals and route to alternates by policy.

## MAESTRO Threat Modeling Alignment

* **MAESTRO Layers:** Data, Agents, Tools, Observability, Security.
* **Threats Considered:** Contradictory evidence injection, prompt manipulation, traversal abuse, non-deterministic query drift.
* **Mitigations:** Arbitration gate, deterministic primitives, claim dependency graphs, traversal yield prediction and policy enforcement.

## Summit-Relevant Experiments (Governed)

1. **Arbitration Impact Test**
   * Compare contradiction rate with arbitration enabled vs disabled.

2. **Primitive vs Ad-hoc Cypher Reproducibility**
   * Run multiple LLM versions against the same primitive catalog.

3. **Predictive Retrieval Skipping**
   * Compare latency and evidence quality with GNN routing enabled.

## Final Directive

Evidence governs reasoning. Deterministic primitives govern graph logic. Claim dependency graphs govern propagation. The update is sealed and execution-ready.
