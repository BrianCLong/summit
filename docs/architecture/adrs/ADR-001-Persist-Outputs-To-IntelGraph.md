# ADR 001: Persist Archaeology Outputs to IntelGraph

**Date**: 2024-03-08
**Status**: Proposed
**Context**: The Repository Archaeology Engine (RAE) successfully extracts `CodeFragments`, infers `Capabilities` and `Subsystems`, detects `DeletionEvents`, and generates conceptual `ReconstructionBundles`. Currently, these artifacts exist as transient files in the `artifacts/` directory or memory. To enable the Software Time Machine (STM) and subsequent ecosystem layers, these outputs must be queryable via a graph structure.

**Decision**: We will persist all archaeology outputs (fragments, subsystems, capabilities, deletions, reconstructions) directly into IntelGraph (Neo4j). We will expand the schema to include `CodeFragment`, `Capability`, `DeletionEvent`, and `ReconstructionBundle` node types. Each node will be content-addressed to ensure immutability and provenance tracking.

**Consequences**:
* **Positive**: Unlocks immediate time-travel queries (e.g., finding when a capability first appeared or was abandoned). Enables cross-repo clustering for Global Innovation Discovery (GID). Centralizes provenance.
* **Negative**: Increases write volume to Neo4j. Requires schema updates to IntelGraph Core Schema v1 (e.g., adding namespaced nodes under `FEATURE_GTSE_EXPERIMENTAL`).
