# IntelGraph Core Schema v1

**Status:** Active
**Owner:** Intelligence Foundry
**Last Updated:** 2026-03-01

## Overview

IntelGraph Core Schema v1 defines the base contract for all entities, edges, and evidence objects managed by the IntelGraph semantic layer.

Any extensions or experimental node types must be explicitly namespaced or guarded by a feature flag (e.g. `FEATURE_PATTERN_MINER_EXPERIMENTAL=true`).

## Schema Definition

The schema is defined in `intelgraph/schema/core-v1.json`.

```json
{
  "$id": "intelgraph/schema/core-v1.json",
  "title": "IntelGraph Core Schema v1",
  "type": "object",
  "required": ["entities","edges","evidence"],
  "properties": {
    "entities": { "type": "array" },
    "edges": { "type": "array" },
    "evidence": { "type": "array" }
  }
}
```

## Contract
- The `evidence` array must contain valid references matching the Evidence ID format: `EVID:CIV:<module>:<scenario>:<nnnn>`.
- `entities` must declare a `type`.
- `edges` must declare a `source`, `target`, and `relation`.
