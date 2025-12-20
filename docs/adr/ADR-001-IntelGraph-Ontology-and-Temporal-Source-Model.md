# ADR-001: IntelGraph Ontology & Temporal/Source Model

**Status:** Proposed / To be implemented (Sprint 1 ratification target)

## Context

We need an ontology that preserves provenance, temporal accuracy, and trust while supporting analytical and operational graph workloads. IntelGraph should model how facts are observed, when they apply, and how trustworthy they are so downstream policies and simulations can reason over the same shared timeline.

## Decisions

- Use **reified event nodes** and dedicated **Observation** nodes to capture evidence and ground facts in time, keeping source material separate from canonical entities.
- Encode **bitemporal semantics on relationships** so both event time and system time are preserved for audits, corrections, and replay scenarios.
- Attach **trust scores**, source fidelity, and **explicit provenance metadata** to Observations to make confidence and lineage first-class for policy enforcement and simulations.
- Normalize **actors, locations, organizations, and artifacts** into canonical entity labels to avoid schema drift while supporting polymorphic Observations.
- Require **idempotent upserts keyed by provenance hash** so repeated ingest cannot duplicate evidence and downstream LBAC rules can reference stable identifiers.

## Consequences

- Enables repeatable, auditable fact reconstruction and replay across ingest, LBAC enforcement, and simulations.
- Establishes the base schema for policy, export controls, and overlay graph work and keeps synthetic overlays logically isolated from canonical facts.
- Forces ingest and simulation code to surface provenance on every write, eliminating implicit defaults that could bypass LBAC compartment filters.
- Unlocks **time-sliced analytics** (e.g., “what was known at T0 vs. T1”) without bespoke query rewrites.
