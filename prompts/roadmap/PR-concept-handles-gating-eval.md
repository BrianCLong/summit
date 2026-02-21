# PR Plan: Concept Handles + Gating + Evaluation (Defensive Default)

## Intent

Implement a CATS-inspired concept interface for Summit that is portable, auditable, and safe for
defensive cognitive-security research.

## Scope Classification

- **Change type:** `minor`
- **Primary zone:** `docs/` (architecture + roadmap plan)
- **Risk posture:** low operational risk; design-only with explicit rollout gates

## Deliverables

1. Architecture spec: `docs/architecture/concepts/cats-net-inspired-concept-handles.md`
2. Roadmap prompt: `prompts/roadmap/PR-concept-handles-gating-eval.md`
3. Status tracking update: `docs/roadmap/STATUS.json`

## Atomic PR Breakdown

### PR-1: ConceptHandle Contract + Registry Surface

**Files (target):**

- `packages/*/concept-handle.schema.ts` (or equivalent shared contract location)
- `docs/architecture/concepts/cats-net-inspired-concept-handles.md` (contract section updates)

**Acceptance criteria:**

- ConceptHandle includes provenance, policy, quality metrics, and rollback pointer.
- Contract is versioned and consumable by orchestrator + graph services.
- No direct unsafe export of restricted concept artifacts.

**Tests/checks:**

- schema validation tests,
- serialization/deserialization roundtrip,
- policy field presence checks.

### PR-2: Maestro Concept Router (CA-equivalent)

**Files (target):**

- `packages/maestro*/**/*concept-router*`
- orchestrator config for routing weights and safety modes

**Acceptance criteria:**

- Router emits deterministic control packet:
  - model/tool routing weights,
  - retrieval weighting,
  - policy strictness level.
- Fail-closed behavior when concept quality/drift thresholds are violated.

**Tests/checks:**

- deterministic routing test with fixed seed,
- fail-closed policy gate test,
- integration test for orchestration handoff.

### PR-3: Evaluation Harness (separability, transfer, drift)

**Files (target):**

- `tests/**/concept-eval*.test.*`
- `scripts/**/concept_eval*`
- optional report template under `docs/evidence/`

**Acceptance criteria:**

- baseline vs concept-conditioned performance comparison available,
- transfer evaluation (`teacher -> student`) reproducible,
- drift alerts generated from configured thresholds.

**Tests/checks:**

- reproducibility test (same seed, same score envelope),
- transfer success regression test,
- drift sensitivity sanity test.

## Experimental Plan

1. **Miniature reproduction**
   - Dataset: CIFAR-100 subset.
   - Frozen encoder + compact TS heads.
   - Alternating optimization cycle for CA/TS and concept vectors.
2. **Cross-agent transfer**
   - Distinct initializations/backbones.
   - Learn translator on anchors; test withheld concepts.
3. **Defensive OSINT simulation**
   - Evaluate narrative-cluster drift and control-primitive detection.
   - Require corroboration boost when risk concepts are active.

## Governance Gates

- Require evidence bundle before concept promotion:
  - data hash manifest,
  - eval metrics,
  - drift report,
  - rollback reference.
- Block merge if transferability regresses beyond policy threshold.
- Log decision rationale and confidence in governance artifacts.

## Rollback Plan

- Trigger rollback if:
  - transfer score drops below gate,
  - drift false negatives breach threshold,
  - policy conformance checks fail.
- Rollback action:
  - re-pin prior ConceptHandle version,
  - disable affected routing profile,
  - re-run baseline routing with strict corroboration.

## Success Metrics

- Concept transfer uplift over non-transfer baseline.
- Stable separability across retrains.
- Reduced analyst false-positive burden through risk-aware routing.
- Zero governance gate bypass for concept lifecycle actions.
