# Claim Lineage Model Design

## Purpose

To track the lifecycle of a specific claim as it propagates through the information environment, allowing analysts to distinguish between independent corroboration and echo-chamber amplification.

## Schema

```yaml
Claim:
  id: "CLM-{hash(content + origin)}"
  content_digest: "sha256"
  origin_event_id: "EVT-..."
  first_seen: "timestamp"

ClaimInstance:
  id: "CLI-{hash(claim_id + source_id + timestamp)}"
  claim_id: "CLM-..."
  source_id: "SRC-..."
  timestamp: "timestamp"
  mutation_type:
    - "verbatim"
    - "translation"
    - "paraphrase"
    - "rebuttal"
    - "context_shift"
  parent_instance_id: "CLI-..." (optional, if direct lineage known)

LineagePath:
  head_id: "CLI-..."
  tail_id: "CLI-..."
  amplification_factor: float
  mutation_sequence: [mutation_type]
```

## Inputs

- Raw text/media from collection sources.
- Existing Source entities in IntelGraph.

## Outputs

- `Claim` entities in IntelGraph.
- `AMPLIFIED_BY` relationships between Sources.
- `MUTATED_TO` relationships between Claims.

## Failure Cases

- **Merge Failure:** Identical claims with slight phrasing variations treated as distinct (Need fuzzy matching/clustering).
- **Loop Detection:** Circular reporting logic must prevent infinite lineage depth.
