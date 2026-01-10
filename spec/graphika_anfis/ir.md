# ANFIS Intermediate Representation (IR)

## Goal

Provide a stable, replayable representation of the graph and intervention plan.

## Graph Snapshot IR

```json
{
  "snapshot_id": "gph_...",
  "nodes": [{ "id": "c1", "type": "content" }],
  "edges": [{ "src": "a1", "dst": "c1", "type": "authored" }],
  "window": { "start": "...", "end": "..." },
  "schema_version": "2025-12-01"
}
```

## Intervention Plan IR

```json
{
  "plan_id": "plan_...",
  "actions": [
    { "type": "remove_edge", "edge_id": "e9", "cost": 1.0 },
    { "type": "down_weight_node", "node_id": "a2", "weight": 0.2 }
  ],
  "budget_contract_id": "bud_...",
  "objective": "minimize_spread"
}
```

## Replay Requirements

- Snapshot ID + plan ID must be paired with determinism token.
- Any plan mutation requires a new witness chain entry.
