# ANFIS Intermediate Representation

**Entities**

- `GraphSnapshot`: reference to temporal graph version + determinism token.
- `CoordinationFeature`: name, parameters, provenance, contribution set.
- `InterventionPlan`: set of node/edge actions with cost and constraint metadata.
- `SimulationResult`: spread metrics before/after intervention, replay token, witness chain pointer.

**Execution Steps**

1. Normalize content/actors; build graph index keyed by snapshot ID.
2. Emit `CoordinationFeature` records for burstiness, LSH similarity, hub concentration, link laundering.
3. Run optimizer to select `InterventionPlan` under budget contract.
4. Apply plan to derived graph, recompute spread metrics, and emit `SimulationResult`.
