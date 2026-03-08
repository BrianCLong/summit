# Summit Priority Architecture: Truth Engine + Replayable Intelligence Ledger

## Executive Determination

The most important missing capability for Summit is an **epistemically grounded Truth Engine** implemented on top of an **append-only, replayable WriteSet ledger**.

This is the minimum architecture shift that upgrades Summit from a high-capability graph analytics platform into a **decision-grade intelligence system**.

## Readiness Assertion

This architecture aligns with `docs/SUMMIT_READINESS_ASSERTION.md` by enforcing deterministic, explainable, and reversible intelligence workflows where every graph state is reproducible from governed evidence-bearing events.

## Problem Statement

Current intelligence workflows across the ecosystem can ingest, link, and visualize large-scale information, but analyst trust and operational decisions depend on four capabilities that must be guaranteed by architecture:

1. **Claim explainability**: why a statement is believed.
2. **Bitemporal replay**: what was valid vs what was known at any point in time.
3. **Contradiction handling**: how competing claims are quarantined and resolved.
4. **Governed promotion to operational reality**: separating narrative/belief volatility from reality-layer updates.

Without this foundation, high-level AI and multi-agent analysis remain vulnerable to hallucinated or non-auditable inferences.

## Core Architectural Decision

### Canonical Source of Truth

- Canonical data store: **append-only WriteSet ledger**.
- Graph databases and search indices are **derived, deterministic materializations**.
- No mutable state is treated as authoritative if it cannot be replayed from the ledger.

### Epistemic Data Model

- **Entity nodes** remain standard graph objects.
- **Relationships become claims**, each with:
  - subject, predicate, object
  - confidence score
  - evidence references
  - source/provenance lineage
  - bitemporal fields (`valid_from`, `valid_to`, `observed_at`, `retracted_at`)

### Tri-Graph Governance

- **Narrative Graph (NG)**: high-velocity statements and content dynamics.
- **Belief Graph (BG)**: actor/community-level belief state representation.
- **Reality Graph (RG)**: governed operational facts.
- RG updates only via **Promotion events**; ingestion cannot write RG directly.

## Required MVP (Quarter Priority)

1. **Claim schema** as first-class object in writesets.
2. **Evidence artifact schema** with cryptographic hash, source metadata, and typed artifact class.
3. **Bitemporal fields** enforced for claims and promotions.
4. **WriteSet firewall** (AJV validation + policy checks) for all writes.
5. **Promotion quarantine policy** for NG/BG → RG transitions.
6. **Deterministic replay API** for `as_known_at` and `as_of` reconstruction.

## Module Boundaries (Repo-Ready)

- `packages/summit-ledger/`
  - writeset schema, append API, ledger persistence, replay/diff queries.
- `packages/summit-trigraph/`
  - deterministic materializers for RG/BG/NG and promotion policies.
- `packages/summit-core/`
  - write firewall + rejection artifact generation for analyst-facing explainability.
- `packages/summit-testkit/`
  - golden fixtures and determinism tests.

## Golden Path Tests (Mandatory)

1. `replay_as_known`
   - same ledger slice must yield identical materialized graph hash across runs.
   - reconstruct analyst-visible state at prior system time.
2. `promotion_quarantine`
   - NG/BG ingest surge accepted.
   - insufficient-evidence promotion to RG is quarantined with structured rejection report.

## MAESTRO Security Alignment

- **MAESTRO Layers**: Data, Agents, Tools, Observability, Security.
- **Threats Considered**:
  - prompt-injected narrative poisoning,
  - source spoofing and evidence forgery,
  - uncontrolled agent writes to operational truth,
  - non-deterministic replay leading to audit failure.
- **Mitigations**:
  - append-only signed writesets,
  - evidence hash verification,
  - promotion-policy gate before RG mutation,
  - deterministic materialization with replay checksum,
  - audit artifacts for all denied/quarantined promotions.

## 7th-Order Strategic Implications

1. **Trust Compounding**: each new claim strengthens the reproducible evidence corpus rather than overwriting prior state.
2. **Audit Dominance**: legal, journalistic, and intelligence review workflows become first-class supported use cases.
3. **Model Reliability Lift**: GraphRAG and agent outputs can be conditioned on claim-level provenance and contradiction status.
4. **Disinformation Resilience**: narrative waves can be absorbed in NG/BG without contaminating RG.
5. **Counterfactual Readiness**: causal and simulation layers can attach to stable bitemporal claims, not ad-hoc correlations.
6. **Operational Tempo**: analysts can move fast in NG/BG while governance protects reality updates.
7. **Competitive Moat**: replayable epistemic history is path-dependent and difficult for late-moving competitors to retrofit.

## Forward-Leaning Enhancement (State-of-the-Art)

Add a **CausalEdge** layer as evidence-backed claim type (not direct fact type):

- `cause`, `effect`, `mechanism`, `strength`, `confidence`, `evidence_ids`, `time`.
- Counterfactual query primitive: remove/attenuate cause and recompute expected narrative/belief delta.
- Governance rule: causal outputs are analytic impact assessments, not action prescriptions.

This introduces strategic systems reasoning while preserving policy-aligned constraints.

## Rollout Sequence

1. Implement writeset + claim/evidence/bitemporal schemas.
2. Add append/replay interfaces and deterministic materializers.
3. Enforce promotion quarantine gate and rejection artifacts.
4. Ship golden tests and replay hash checks in CI.
5. Layer in contradiction sets and causal edges.

## Finality

Summit should prioritize and ship the Truth Engine on a replayable WriteSet ledger immediately. All advanced capabilities (GraphRAG, multi-agent orchestration, narrative/cognitive mapping, and causal simulation) should be constrained to this governed substrate.
