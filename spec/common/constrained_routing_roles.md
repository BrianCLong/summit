# Constrained Routing for Temporal Role Attribution

This note defines shared mechanics for routing influence credit across heterogeneous graphs when
determining operational roles. The routing objective is constrained by time, topology, and semantic
consistency to ensure traceable assignments.

## Graph Model

- **Nodes:** actors, content items, resources; optional platform/domain markers for cross-network
  analysis.
- **Edges:** authored, reshared, linked, replied, or referenced interactions with timestamps and
  platform identifiers.
- **Attributes:** topic embeddings, platform policy metadata, per-edge credibility scores, and
  trust tiers.

## Routing Objective

- **Temporal ordering:** flows may only move forward in time, disallowing credit travel to earlier
  timestamps.
- **Topic coherence:** similarity to a narrative centroid gates edge capacity; edges below threshold
  are pruned.
- **Budgeting:** maximum expansions, runtime, and memory; graceful degradation through deterministic
  truncation.
- **Capacity:** per-edge and per-actor capacities ensure no single actor dominates influence credit.
- **Platform boundary constraints:** cross-platform flows require explicit bridging evidence.

## Outputs

- **Role scores:** normalized per actor for originator, amplifier, bridge, recycler roles.
- **Support subgraph:** minimal edge/node evidence under an explanation budget.
- **Role certificate hooks:** Merkle commitments over support identifiers, replay token binding
  snapshot/schema/index versions.

## Verification

- **Counterfactuals:** remove-node delta evaluations to test assignment stability.
- **Attestation:** optional TEE quote binding inputs and outputs to trusted execution.
- **Drift checks:** compare new role scores against historical baselines to flag anomalies.
