# Maestro Reasoning Crew (Mixture-of-Thought)

## Summit Readiness Assertion

This design aligns to the Summit Readiness Assertion and standardizes on evidence-first reasoning
outputs and governance-bound lane selection before runtime execution.

## Overview

The Reasoning Crew operationalizes a Mixture-of-Thought (MoT) pipeline by running multiple
complementary reasoning lanes in parallel and aggregating outcomes with evidence-weighted scoring.
Each lane emits machine-verifiable artifacts (sandbox execution logs, policy evaluations, and
structured claims) that can be persisted into Summit provenance storage.

## Lane Model

All lanes implement a shared interface and emit the same output shape.

| Lane | Purpose | Evidence Artifacts |
| --- | --- | --- |
| Narrative | Explainable plan + assumptions | Trace, summary notes |
| Program | Execute code in sandbox | Execution logs, test results |
| Symbolic | Evaluate policies/logic | OPA/Rego evaluation output |

Lane outputs:

- `finalAnswer`: human-readable response
- `structuredClaims`: JSON assertions suitable for invariants and comparison
- `evidenceArtifacts`: provenance-ready evidence items with hashes/URIs

## Aggregation & Adjudication

Aggregation uses evidence-weighted scoring (not majority vote). Disagreement triggers
adjudication: counterexample generation, fuzzing, or additional checks. Unresolved conflicts
escalate to higher-capability model tiers via the cascade controller.

## Policy Hooks

OPA/Rego can require or prohibit lanes based on task class, risk tier, budget, or data sensitivity.
Policy evaluation outputs are stored as evidence artifacts to ensure auditability.

## Provenance & Evidence Bundles

Every run emits a normalized evidence bundle that can be stored in the Summit graph/provenance
store. See the schema in
[`docs/maestro/reasoning-evidence.schema.json`](reasoning-evidence.schema.json).

## API Surface

```ts
import {
  ReasoningCrew,
  createNarrativeLane,
  createProgramLane,
  createSymbolicLane,
} from '@intelgraph/maestro-reasoning';

const crew = new ReasoningCrew({
  lanes: [
    createNarrativeLane(),
    createProgramLane(),
    createSymbolicLane({ policyId: 'reasoning/requirements' }),
  ],
});
```

## Verification Expectations

- Evidence-weighted scoring must dominate simple majority vote.
- Any disagreement produces adjudication artifacts.
- All outputs are structured for provenance capture and policy review.
