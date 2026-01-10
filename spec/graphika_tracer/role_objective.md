# Role Objective

The TRACER routing objective assigns role scores to actors by constraining influence flow over a
heterogeneous temporal graph.

## Objective Components

- **Originator score:** credit for earliest content nodes with high downstream propagation.
- **Amplifier score:** credit for rapid reshares within the same platform.
- **Bridge score:** credit for cross-platform or cross-community propagation.
- **Recycler score:** credit for reintroducing dormant content after a decay window.

## Constraints

- Temporal ordering (no backward edges).
- Topic coherence threshold based on embedding similarity.
- Capacity limits per edge and per actor.
- Platform boundary constraints requiring bridging evidence.

## Optimization

- Solve via constrained flow or shortest-path variants.
- Apply deterministic truncation when budgets are exceeded.
