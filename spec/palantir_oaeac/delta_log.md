# Delta Log

## Purpose

Maintain an append-only log of graph state changes to provide deterministic snapshots
and traceable state transitions.

## Record Format

```json
{
  "delta_id": "dlt_...",
  "action": "link_person_to_org",
  "changes": [{ "op": "add_edge", "src": "p1", "dst": "o1" }],
  "snapshot_after": "gph_...",
  "witness_session": "wtn_...",
  "policy_decision_id": "pdt_...",
  "timestamp": "2025-12-30T23:59:00Z"
}
```

## Guarantees

- Hash-chained records to prevent tampering.
- Snapshot identifiers derived from ordered deltas.
- Supports replay by applying deltas in order.
