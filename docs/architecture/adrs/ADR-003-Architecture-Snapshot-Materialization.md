# ADR 003: Architecture Snapshot Materialization

**Date**: 2024-03-08
**Status**: Proposed
**Context**: The Software Time Machine (STM) requires the ability to query the architectural state of a repository at any point in time (`T0`, `T1`, etc.). Evaluating fitness across thousands of simulated branch histories requires fast retrieval of these baselines.

**Decision**: We will introduce an `ArchitectureSnapshot` node in IntelGraph representing the confirmed `Capabilities` present in a repository at a specific `Commit` or time boundary. These snapshots will be materialized bitemporally using the WriteSet Ledger, aggregating active fragments and subsystems into a cacheable representation.

**Consequences**:
* **Positive**: Greatly accelerates branch simulations by providing pre-computed architecture states rather than re-calculating them per query.
* **Negative**: Increases storage complexity and requires invalidation logic if fragment clustering algorithms change retroactively.
