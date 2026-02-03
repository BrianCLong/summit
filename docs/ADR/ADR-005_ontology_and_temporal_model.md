# ADR-005: IntelGraph Ontology and Temporal / Source Model

- **Status:** Proposed
- **Date:** 2025-12-05
- **Owner:** Architecture / IntelGraph Team

## 1. Context

Summit already models:

- Investigations
- Entities and relationships
- Seeded investigations (e.g. `data/golden-path/demo-investigation.json`)

However, for real intelligence work we need:

- **Conflicting facts** to co-exist (vs last-write-wins).
- **Temporal views** (“what did we think then?” vs “what do we know now?”).
- **Source lineage** and **trust scores** to back every assertion.
- A foundation for downstream features like **narrative simulation**, **risk scoring**, and **explainable AI**.

The current repo does not yet have a single, explicit, stable ontology and temporal/data lineage model.

## 2. Decision

We will standardize on:

1. A **typed IntelGraph ontology** with:
   - `Investigation`
   - `Entity` subtypes (labels): `PERSON`, `ORGANIZATION`, `LOCATION`, `ACCOUNT`, `EVENT`, `DOCUMENT`, `MEDIA`, etc.
   - `Observation` nodes for facts.
   - `Source` nodes representing data origins (feeds, files, systems, human input).

2. **Bitemporal relationships** for role/state edges:
   - Relationships that represent roles, states or long-lived facts (e.g., `CEO_OF`, `MEMBER_OF`) will store both:
     - `tx_start`, `tx_end` (when the DB learned or updated the fact).
     - `valid_start`, `valid_end` (when the fact was true in the real world, as best we know).

3. **Observation and provenance pattern**:
   - We do _not_ overwrite facts directly on entities/edges.
   - Instead, we write `Observation` nodes that attach to entities/relationships and point back to `Source`.
   - `Observation` contains:
     - `observedAt`
     - `trust_score` (0..1)
     - `confidence` (0..1; model/human confidence)
     - Raw or normalized `payload`.

4. **Trust / confidence as first-class properties**:
   - Every Observation has a `trust_score` derived from source reliability.
   - Downstream algorithms (sim, scoring, alerts) are required to use these fields, not just raw counts.

## 3. Rationale

- **Temporal correctness**  
  Intelligence work is inherently time-dependent. Overwriting a relationship erases the analysis context and prevents us from answering “what did we think on date X?”.

- **Lineage & auditability**  
  Regulation, IC review, and internal QA all require us to show “where did this come from?” for any analytic conclusion.

- **Conflict representation**  
  Real-world data conflicts frequently. Forcing a single truth collapses uncertainty and hides adversary activity, data poisoning, or model errors.

- **Simulation & explainability**  
  Narrative simulation and AI copilots should be able to:
  - Cite specific Observations and Sources.
  - Weight evidence by trust.

## 4. Implications

### 4.1 On data modeling

- Neo4j will store:
  - Entities (`PERSON`, `ORGANIZATION`, etc.).
  - Event nodes (`CallEvent`, `MeetingEvent`, etc.) for reified events.
  - `Observation` nodes linked via `:OBSERVED_IN` and `:DERIVED_FROM`.
  - Bitemporal properties on role/state relationships.

- Postgres/Timescale will:
  - Store parallel representations of observations and events where necessary for:
    - Audit.
    - Time-series.
    - Reporting aggregations.

### 4.2 On queries

- Queries become more complex:
  - “Who is the CEO of Org X now?”  
    → Filter `CEO_OF` edges with `valid_end IS NULL`.
  - “What did we believe the CEO was on 2024-01-01?”  
    → Filter on `valid_start <= date` and `(valid_end IS NULL OR valid_end > date)` and also account for tx time if doing “what did we know when?”.

- Read paths must be standardized:
  - Utility functions for “current view” vs “time-slice view” to avoid bespoke logic per feature.

### 4.3 On ingest

- Connectors must:
  - Create `Observation` nodes instead of mutating entity properties directly.
  - Record the `Source` and `trust_score`.
  - Let higher-level logic decide which observations become the “current” effective view.

### 4.4 On performance

- More nodes and relationships:
  - Observations and events add storage and traversal cost.
- Mitigations:
  - Indexes on `Observation` fields (`entityId`, `sourceId`, `observedAt`).
  - Time windowing where appropriate.
  - Archival / pruning for stale low-trust observations.

## 5. Alternatives Considered

1. **Last-write-wins on entity properties**
   - Simplest but loses conflict and history.
   - Not acceptable for IC/enterprise-grade use.

2. **Edge-only properties for provenance**
   - Embeds everything into relationship properties.
   - Harder to attach evidence, source, or multiple observations.
   - Doesn’t scale well to multi-source, multi-observation scenarios.

3. **Temporal tables only in Postgres**
   - Would separate graph from time/lineage.
   - Makes explainable graph analytics much harder and more fragile.

## 6. Rollout Plan

- Phase 1:
  - Add `Observation` and `Source` node labels and edge types.
  - Implement minimal ingestion path that writes Observations.
- Phase 2:
  - Backfill existing data into Observation pattern where feasible.
  - Update GraphQL/API to consume Observations for canonical views.
- Phase 3:
  - Introduce bitemporal properties on key relationships (CEO_OF, MEMBER_OF, etc.).
  - Add helper functions for temporal queries.

## 7. Open Questions

- Which relationships **must** be bitemporal vs simple?
- How do we balance long-term storage vs archival for very old Observations?
- Do we need a dedicated “Evidence” node type separate from Observation (for aggregation over multiple observations)?
