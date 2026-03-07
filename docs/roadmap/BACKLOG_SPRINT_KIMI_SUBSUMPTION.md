# Backlog: Kimi K2.5 Subsumption (Sprint S+1)

**Strategic Priority**: Subsuming Moonshot K2.5 capabilities into Summit’s Governed Agentic OS.

---

## Epic 1: Multi-Scale Agent Runtime (Continuity)

- **TASK-001**: Implement `ScaleAwareRouter` in `server/src/maestro/`.
  - _Description_: A routing engine that selects between local (distilled) and cloud models based on task metadata (risk_level, budget).
  - _Sizing_: M
- **TASK-002**: Define `UnifiedAgentInterface` (Vision+Tools) to normalize capabilities across model sizes.
  - _Sizing_: S

## Epic 2: Summit Agent/Model Conformance Suite (SACS)

- **TASK-003**: Implement `scripts/governance/verify_multimodal_conformance.py` (Prototype).
  - _Description_: Automated tests for vision grounding fidelity and tool-planning consistency.
  - _Sizing_: M
- **TASK-004**: Add "Signed Conformance Report" generator to `scripts/ga/`.
  - _Sizing_: S

## Epic 3: Advanced Swarm Orchestration & Context Governance

- **TASK-005**: Implement `SwarmPrimitive` (Planner/Shard/Execute/Merge) in `server/src/maestro/orchestrator.ts`.
  - _Sizing_: L
- **TASK-006**: Integrate OPA policies for "Context Pruning" (Redact/Summarize/Retain) during swarm merges.
  - _Sizing_: M

## Epic 4: Universal Reasoning Budget Contract (RBC)

- **TASK-007**: Add `ReasoningBudget` schema to `packages/common-types/`.
  - _Description_: Fields for `latency_target`, `cost_cap`, and `risk_tolerance`.
  - _Sizing_: S
- **TASK-008**: Implement "Re-run Heavier" trigger logic in Maestro for low-confidence outputs.
  - _Sizing_: M

## Epic 5: Summit Agent Protocol Adapters

- **TASK-009**: Create `kimi_k2_adapter.ts` in `server/src/conductor/mcp/adapters/`.
  - _Description_: Handle reasoning/tool-call separation and specific Kimi parsing.
  - _Sizing_: S
- **TASK-010**: Implement `VerifierBadgeGenerator` for signed runtime artifacts.
  - _Sizing_: S

## Epic 6: Policy-Driven Compute Optimization

- **TASK-011**: Extend `ProvenanceLedger` to store `InferenceConfig` (precision, quantization mode, hardware metadata).
  - _Sizing_: S
- **TASK-012**: Implement precision-switching logic in `server/src/runtime-pooler/` based on OPA verdict.
  - _Sizing_: M

## Epic 7: Governed Infrastructure Recipes

- **TASK-013**: Create `deploy/recipes/heterogeneous-inference.yaml` for Cloud+Local serving.
  - _Sizing_: M
- **TASK-014**: Add "Fine-Tuning Eval Gate" to CI/CD pipeline.
  - _Sizing_: M
