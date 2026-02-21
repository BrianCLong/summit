# CATS-Net Inspired Concept Handles for Summit

## Executive Assertion

Summit can operationalize CATS-Net's core mechanism by treating concept vectors as governed, portable
control artifacts rather than opaque latent state. This aligns with the Summit Readiness posture:
move semantics into auditable interfaces, not hidden weight space.

## Problem Statement

Current multi-agent systems are strong at task execution but weak at transporting **grounded
concepts** across heterogeneous models. LLM abstractions are typically entangled and difficult to
version, transfer, or constrain by policy.

CATS-Net introduces a useful mechanism-level split:

- **Concept Abstraction (CA):** forms compact concept vectors.
- **Task Solving (TS):** consumes those vectors as gating/control signals to drive behavior.

The implementation objective in Summit is to preserve this split while making it governance-native.

## Summit Mapping

### 1) Concept vectors -> `ConceptHandle` entities (IntelGraph)

Represent each concept as a first-class graph entity:

```ts
interface ConceptHandle {
  id: string;
  modality: "text" | "vision" | "multimodal" | "graph";
  embeddingRef: string; // pointer to vector artifact
  version: string;
  provenance: {
    datasetHashes: string[];
    trainer: string;
    trainingScope: string;
    createdAt: string;
  };
  policy: {
    allowedUses: string[];
    restrictedContexts: string[];
    retentionClass: "public" | "internal" | "controlled";
  };
  quality: {
    separability: number;
    transferScore: number;
    driftRisk: number;
  };
}
```

### 2) CA module -> Context Compiler / Concept Router (Maestro)

Introduce a CA-like orchestration layer that:

- selects one or more ConceptHandles per task,
- composes them into a task-specific control packet,
- emits routing weights for:
  - tool invocation,
  - retrieval channel weighting,
  - specialist model selection,
  - policy strictness (additional corroboration, escalation requirements).

### 3) TS module -> specialist solvers

TS behavior maps to existing Summit executors:

- entity/linking services,
- narrative clustering,
- anomaly or influence detectors,
- analyst-facing copilot flows.

Each solver reads the control packet and adapts inference without mutating base model weights.

### 4) Cross-network concept transfer -> Concept Translation Service

Add a translation layer to map concept spaces between agents/models. The service trains on paired
anchors (shared exemplars, shared labels, or RDM-style constraints) and emits `teacher -> student`
concept transforms.

## MAESTRO Threat Model Alignment

- **MAESTRO Layers:** Agents, Tools, Data, Observability, Security.
- **Threats Considered:** prompt injection via concept labels, model-space poisoning,
  unauthorized concept export, drift-induced misrouting.
- **Mitigations:** signed concept artifacts, policy-scoped concept access, mandatory drift checks,
  translation confidence thresholds, and immutable provenance logging.

## Governance and Evidence Contract

Every ConceptHandle update must produce an evidence bundle:

1. Training data hash manifest
2. Evaluation report (separability, transfer, calibration)
3. Drift baseline + alert thresholds
4. Policy constraints and allowed-use declaration
5. Rollback pointer to prior handle version

Treat this as SLSA-for-semantics: promotion blocked unless evidence and rollback are present.

## Minimal Implementation Blueprint

### Phase 0: Scaffold

1. Add ConceptHandle schema and registry API in IntelGraph.
2. Add `concept-routing` interface in Maestro for control packets.
3. Add evaluation harness for separability, drift, and transfer.

### Phase 1: Reproduce core CATS-style behavior (small scale)

- Dataset: CIFAR-100 subset.
- Frozen encoder + lightweight TS heads.
- Learn one concept vector per class with alternating updates:
  - optimize CA+TS parameters,
  - optimize concept vectors,
  - repeat to convergence.

Acceptance gates:

- concept-conditioned yes/no accuracy exceeds non-conditioned baseline,
- concept vectors show stable semantic clustering,
- vectors transfer across TS heads with bounded degradation.

### Phase 2: Multi-agent transfer

- Train two agents with different seeds/backbones.
- Train concept translation module (`A -> B`).
- Validate withheld-concept performance improvement post-translation.

Acceptance gates:

- translation improves student accuracy on transferred concepts,
- confidence calibration meets threshold,
- drift monitor catches domain shift without false-silence.

### Phase 3: Defensive cognitive security deployment

Define governed handles for research-safe categories:

- rumor pattern families,
- rhetorical control markers (imperative framing, certainty inflation),
- bridge-content patterns linking unrelated audience clusters.

Use routing outputs to tighten corroboration requirements and trigger elevated analyst review.

## Decision Rationale

This design turns concepts into interoperable system objects with explicit control surfaces,
allowing Summit to scale multi-agent reasoning while preserving governance, reversibility, and
cross-model portability.
