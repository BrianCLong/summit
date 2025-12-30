# Role Objective and Constraints

## Routing Objective

- Assign role scores by routing influence credit across actor→content→resource edges.
- Objective includes temporal ordering, topic coherence, capacity limits per edge/actor, and execution budgets.

## Constraints

- **Temporal:** disallow routing backwards in time; enforce activation ordering.
- **Topic:** embedding similarity to narrative centroid gates edge traversal.
- **Capacity:** bound flow per edge/actor to avoid domination.
- **Budget:** limit expansions, runtime, and memory; deterministic truncation when exceeded.

## Outputs

- Role scores per actor for originator, amplifier, bridge, recycler.
- Support subgraph selected under explanation budget.
- Replay token with snapshot/schema/index versions.
