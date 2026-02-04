# Narrative Operating Graph (NOG)

## Purpose

The Narrative Operating Graph (NOG) is the governed substrate for narrative-state modeling. It
represents lifecycle-aware narratives as typed nodes and edges with deterministic ordering rules
for hashing, simulation, and audit linkage.

## Scope

The NOG is a platform primitive. It is not a narrative generator. It is the canonical substrate
used by agents, policy evaluation, and counterfactual simulation.

## Node Types

- `narrative_state`
- `actor`
- `channel`
- `event`
- `artifact`

### Required Node Attributes

- `id` (string, globally unique)
- `type` (enum)
- `attrs` (object)
- `lifecycle` (enum: `seeding`, `propagation`, `peak`, `mutation`, `decline`)
- `classification` (enum: `public`, `internal`, `restricted`)

## Edge Types

- `temporal_precedes`
- `causal_influences`
- `mentions`
- `propagates_via`
- `attributed_to`

### Required Edge Attributes

- `src` (node id)
- `dst` (node id)
- `type` (enum)
- `attrs` (object)

## Determinism

- Nodes and edges are sorted deterministically for hashing and simulation.
- Canonical JSON serialization uses sorted keys and compact separators.

## Governance Alignment

The NOG provides the immutable snapshot hash used in policy decisions, audit events, and
counterfactual simulations.
