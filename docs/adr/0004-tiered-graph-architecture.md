# ADR 0004: Tiered Graph Architecture

## Context
Lakehouse integration and zero-ETL graph views (like PuppyGraph) are increasing pressure on graph databases to justify duplicate data ingestion. At the same time, we need a high-assurance, curated graph for governance and evidence trails.

## Decision
We will support a tiered architecture:
- **Tier A (Zero-ETL Graph View):** For broad exploration and analytic reach directly over the lakehouse tables. This is read-heavy and does not require complex mutation rules.
- **Tier B (Curated Evidence Graph):** A dedicated, high-value graph DB specifically for governed entities and evidence chains. All mutations, policies, and lineage operations must be routed here.

## Consequences
- Routing doc dictates: "If you need audit/provenance/evidence, you must go to the curated evidence graph; graph-view is for broad exploration."
- The curated graph is the sole source of truth for governance workflows, reducing data duplication to only critical entities.
