# ADR 0005: Entity Resolution as a Governed Primitive

## Context
Entity Resolution (ER) is increasingly seen as a table-stakes layer (e.g. Linkurious) for enterprise graph use cases. Our approach must differentiate on determinism and governance.

## Decision
Entity resolution policies (merge rules, scoring, thresholds) will be stored as versioned artifacts. These policies execute deterministically and generate reversible merges in the graph. Every merge will emit a `MERGE_EVENT` node to capture the lineage and provenance.

## Consequences
- Merges are not destructive. Discarded entities can be reconstructed because the `MERGE_EVENT` tracks the historical state.
- Diffing ER policies will act like code diffs, making governance explicit.
- ER outputs are provable back to a specific policy version.
