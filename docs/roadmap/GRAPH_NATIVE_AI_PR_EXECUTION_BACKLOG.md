# Graph-Native AI PR Execution Backlog (Clean Merge Train)

## Summit Readiness Assertion
This backlog is the authoritative merge-train contract for landing graph-native AI capabilities cleanly and green against Golden Path gates.

## Operating Rules
- One primary zone per PR where possible (docs/config exceptions allowed).
- No policy bypass; all deviations filed as Governed Exceptions.
- Every PR includes rollback trigger + rollback steps + evidence artifacts.

## PR Stack (24 PRs)

### Phase 0 — Contracts and Gates
1. **contracts/evidence-artifact-v1**
   - Scope: artifact JSON schemas and validators.
   - Checks: schema unit tests, determinism fixture tests.
2. **contracts/deterministic-id-lib**
   - Scope: deterministic ID primitives shared package.
   - Checks: property tests for collision resistance.
3. **ci/determinism-gate**
   - Scope: CI job for artifact replay + hash equivalence.
   - Checks: replay on golden fixtures.
4. **ci/lineage-verify-gate**
   - Scope: signature verification gate.
   - Checks: attest/verify integration.

### Phase 1 — Evidence Graph Core
5. **graph/ege-materializer-core**
6. **graph/ege-ingest-api**
7. **graph/ege-subgraph-retrieval**
8. **graph/ege-performance-benchmarks**

### Phase 2 — Temporal/Causal Intelligence
9. **graph/tcg-schema-migrations**
10. **graph/tcg-query-library**
11. **graph/tcg-temporal-consistency-gate**
12. **graph/tcg-causal-path-artifacts**

### Phase 3 — Graph Reasoning Runtime
13. **runtime/grr-dsl-spec-and-parser**
14. **runtime/grr-prompt-compiler**
15. **runtime/grr-reason-endpoint**
16. **runtime/grr-trace-replay-verifier**

### Phase 4 — Autonomous Investigation
17. **agents/aie-state-machine**
18. **agents/aie-collector-expander**
19. **agents/aie-contradiction-quorum**
20. **agents/aie-reproducibility-suite**

### Phase 5 — Trust + Interface
21. **provenance/clpe-hash-chain**
22. **provenance/clpe-sign-and-attest**
23. **web/evgi-graph-renderer**
24. **web/evgi-investigation-replay**

## Definition of Done (per PR)
- Tests added and passing for changed surface.
- Evidence artifact samples updated.
- Rollback path tested.
- Governance/metadata block complete.
- No unresolved TODOs.

## Reviewer Checklist
- [ ] Contracts are backward compatible or explicitly versioned.
- [ ] Determinism claims are backed by fixture replay.
- [ ] Contradiction handling is explicit and test-covered.
- [ ] Security controls are measurable (not narrative-only).
- [ ] SLO impact documented with baseline + delta.

## Post-Merge 14-Day Accountability Window
- Monitor: P95 latencies, determinism drift, signature failures, contradiction error rate.
- Trigger automatic rollback proposal if any critical metric breaches threshold.

## Forward-Leaning Enhancement
Adopt a **Dual-Index Retrieval Planner**:
- Stage 1: Qdrant semantic recall
- Stage 2: Neo4j evidence-constraint expansion
- Stage 3: learned reranker constrained by evidence budget

This improves recall while preserving explainability and deterministic boundaries.
