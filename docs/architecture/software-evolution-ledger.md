# Software Evolution Intelligence System (SEIS) Ledger

## The Core Insight

The decisive architectural shift for the Repository Archaeology Engine is to transition from treating outputs as static recovered code artifacts to treating them as an **append-only, queryable evolution event ledger**.

Most archaeology systems store static snapshots (e.g., recovered files, clustered subsystems, confidence scores, validation bundles). While useful for immediate recovery, a research-grade system must preserve the underlying evolutionary facts that produced those outputs. The primary unit of truth is an **event**, not a file bundle.

Instead of merely capturing "file X changed at commit Y", the system must model semantic meaning: "interface widened", "subsystem split", "dependency added", "test coverage decreased".

By building around a canonical evolution ontology and an append-only event ledger, we can derive reconstructions, clusters, and scorecards dynamically, unlocking a foundational dataset for studying software evolution.

## Canonical Ontology (Entities)

To track evolution accurately, we require stable IDs for entities that persist across renames, moves, splits, merges, and partial rewrites.

* **File Entity**: Represents a tracked source file over its lifetime.
* **Symbol Entity**: Represents variables, functions, or classes.
* **Interface Entity**: Represents the public API or contract of a module.
* **Test Entity**: Represents an individual test case or suite.
* **Config Entity**: Represents configuration surface areas.
* **Subsystem Entity**: Represents a logical grouping of modules or components.
* **Dependency Entity**: Represents an internal or external dependency relationship.
* **Owner/Team Entity**: Represents the human or organizational owner of a component.
* **Build Target Entity**: Represents a distinct build artifact or output.

## Event Schema (Evolution Events)

Every meaningful architectural change becomes a typed, normalized event. These events must be timestamped, commit-linked, and backed by cryptographic evidence.

* `SymbolIntroduced` / `SymbolRemoved`
* `InterfaceChanged` (e.g., widened, narrowed, broken)
* `DependencyAdded` / `DependencyRemoved`
* `TestAdded` / `TestDeleted`
* `SubsystemSplit` / `SubsystemMerged`
* `ValidationPassed` / `ValidationFailed`
* `GovernancePromoted`
* `ReconstructionSynthesized`
* `DeletionDetected`
* `ResurrectionAttempted`

## Evidence Layer

Every event in the ledger must point to immutable supporting evidence to make claims cryptographically auditable.

* Commit SHA
* Diff Hunk
* AST Delta
* File Path(s)
* Test Output / Run Results
* Build Log
* Policy Result
* Author / Ownership Metadata

## Storage Model

The ledger architecture prioritizes the preservation of raw evolutionary facts. Higher-level summaries are generated dynamically.

```text
Ledger
 ├── Events
 ├── Entities
 ├── EntityVersions
 ├── Relationships
 ├── Evidence
 ├── Outcomes
 └── DerivedViews
```

*Rule: Never discard raw evolutionary facts just because a higher-level summary has been generated.*

## Derived Views

Derived views are materialized from the event ledger rather than being the source of truth themselves.

* Fragment Inventory
* Subsystem Clusters
* Restoration Bundles
* Confidence Scores
* Advisory Recommendations
* Architecture Timelines

## First 10 PRs for Implementation

To safely pivot the Repository Archaeology Engine to this event-ledger architecture, the following 10 PRs provide a structured rollout plan:

1. **PR 1: Define Canonical Ontology and Entity Schemas**
    * Create JSON schemas for core entities (`Subsystem`, `Interface`, `Test`, etc.).
2. **PR 2: Implement Append-Only Event Ledger Store**
    * Establish the foundational storage layer (e.g., Neo4j/Postgres) optimized for bitemporal event logging.
3. **PR 3: Define Evolution Event Types and Validation**
    * Implement typed definitions and validation logic for core events (`InterfaceChanged`, `DependencyAdded`, etc.).
4. **PR 4: Implement Evidence Layer Binding**
    * Add mechanisms to cryptographically bind events to commit SHAs, diffs, and AST deltas.
5. **PR 5: Refactor Phase 1 (Historical Resurrection) to Emit Events**
    * Modify the commit scraper to output normalized `EvolutionEvent` records instead of flat files.
6. **PR 6: Refactor Phase 2 (Fragment Inventory) as a Derived View**
    * Transition fragment inventory to query the event ledger rather than generating static lists.
7. **PR 7: Refactor Phase 3 (Subsystem Clustering) to Use Event Lineage**
    * Update clustering graph algorithms to build edges from historical evolution events.
8. **PR 8: Implement Bitemporal Query API**
    * Provide an API to query the state of the architecture at any point in time.
9. **PR 9: Refactor Phase 4 (Reconstruction Synthesis) to Consume Views**
    * Update synthesis to pull from derived materializations of the ledger.
10. **PR 10: Establish Benchmark Matrix for Evolution Tracking**
    * Create standard benchmarks (e.g., subsystem lineage accuracy, resurrection success rate) using the new ledger as the truth source.
