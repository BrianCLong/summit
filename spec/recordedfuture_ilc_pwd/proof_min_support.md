# Minimal Support Proof

## Goal

Provide the smallest evidence set sufficient to justify a lifecycle transition.

## Proof Budget

- Max items (N), max bytes (B), max verification time (T).
- If budget exhausted, generate a partial proof and mark `proof_status=partial`.

## Algorithm (high-level)

1. Rank evidence by contribution to confidence.
2. Iteratively add evidence until transition condition holds.
3. Remove redundant items while preserving the transition.
4. Emit proof with references to evidence bundle IDs.

## Output Structure

```json
{
  "proof_id": "prf_...",
  "status": "complete",
  "support_items": ["evb_...", "evb_..."],
  "transition": "NEW->ACTIVE",
  "budget": { "max_items": 8, "max_bytes": 500000 }
}
```
