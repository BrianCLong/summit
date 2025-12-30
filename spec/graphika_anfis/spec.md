# Adversarial Narrative Fingerprinting + Intervention Simulator (ANFIS)

**Objective:** Fingerprint coordinated narrative operations and simulate intervention counterfactuals with replayable, auditable outputs.

**Data Model**

- Temporal graph with nodes: content items, actors, referenced resources.
- Edges: authored, reshared, linked; retain timestamps and platform/channel metadata.

**Core Flow**

1. Ingest stream of social content with actor identifiers per time window.
2. Build temporal graph snapshot and persist deterministic snapshot ID.
3. Compute coordination fingerprints (burstiness, near-duplicate similarity, hub concentration, link laundering).
4. Generate intervention plan (removal/down-weight/gating of nodes/edges) under budget constraints.
5. Simulate counterfactual spread metrics on modified graph, emitting ranked interventions.
6. Produce narrative attribution artifact: fingerprint, spread metrics, replay token, evidence capsule, witness chain.

**Outputs**

- Narrative attribution artifact with replay/determinism token.
- Optional attestation if executed inside TEE.
