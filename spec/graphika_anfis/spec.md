# Adversarial Narrative Fingerprinting + Intervention Simulator (ANFIS)

**Objective:** Fingerprint coordinated narrative operations and simulate intervention
counterfactuals with replayable, auditable outputs.

## Scope

- Detect narrative coordination across social content, actors, and resources.
- Provide intervention simulation with deterministic replay.
- Emit attribution artifacts tied to evidence bundles and witness chains.

## Architecture (logical)

```mermaid
flowchart LR
  Ingest[Content + Actor Ingest] --> Graph[Temporal Graph Store]
  Graph --> Fingerprint[Coordination Fingerprint Engine]
  Fingerprint --> Planner[Intervention Planner]
  Planner --> Simulator[Counterfactual Simulator]
  Simulator --> Artifact[Attribution Artifact]
  Artifact --> Ledger[Witness + Evidence Ledger]
```

## Core Flow

1. Ingest content items, actors, and referenced resources for a time window.
2. Build a temporal graph snapshot and persist a deterministic snapshot ID.
3. Compute coordination fingerprints (burstiness, near-duplicate similarity,
   hub concentration, link laundering score).
4. Generate an intervention plan (removal/down-weight/gating) under budget contracts.
5. Simulate counterfactual spread metrics on the modified graph.
6. Emit attribution artifact containing fingerprint, metrics, evidence bundle,
   witness chain, and determinism token.

## Inputs

- Social content stream (posts, media, metadata).
- Actor identifiers with platform metadata.
- Reference URLs/resources.
- Budget contracts + policy decision tokens.

## Outputs

- Narrative attribution artifact (JSON + signed bundle).
- Ranked intervention candidates with cost/impact trade-off.
- Optional attestation for high-assurance runs.

## Policy & Compliance

- All graph access must be authorized by policy-as-code decisions.
- Redacted bytes only; raw content never leaves the evidence service.
- Evidence bundle must be verified before any LLM processing.

## Observability

- Metrics: fingerprint compute time, p95 simulation latency, budget usage.
- Tracing: per-run witness chain with policy decision identifiers.
- Logs: intervention plan selection rationale + constraint violations.

## Test Plan (spec-level)

- Determinism test: re-run with same token and assert identical metrics.
- Budget enforcement test: exceed expansion budget and assert early termination.
- Policy test: verify rejection when export effect lacks authorization.
