# ADR-053: Repository Architecture Graph as the System of Record

- **Status:** Accepted
- **Date:** 2026-03-10
- **Decision Owner:** Codex (Engineer)
- **Authority Files:** `docs/SUMMIT_READINESS_ASSERTION.md`, `docs/governance/CONSTITUTION.md`, `docs/governance/META_GOVERNANCE.md`
- **Change Class:** minor

## Summit Readiness Assertion

Summit will not ship as a transient scanner. Summit ships as a continuously learning architecture intelligence platform.

## Context

Summit currently has strong analysis capabilities, but most toolchains in this category plateau because they run a scan, emit a report, and discard architectural state. That model cannot reliably answer:

- how architecture drift evolves across commits,
- which pull request introduced instability,
- which subsystem is accruing coupling debt over time,
- how contributor behavior maps to architecture outcomes.

The most important platform decision is whether the architecture representation is ephemeral or persistent.

## Decision

Summit adopts a **stateful repository architecture graph** as the engineering intelligence system of record.

All intelligence engines consume views materialized from this graph.

```text
repo -> graph builder -> architecture graph store -> intelligence engines
                         ^
                         | historical snapshots
```

### MVP Storage Shape

```text
.repoos/
  graph/
    repository-graph.json
  snapshots/
    commit-<sha>.json
```

### Invariants

1. Every graph update is keyed by commit SHA.
2. Incremental updates are preferred over full recomputation.
3. Every query path has deterministic limits (`LIMIT`, stable ordering).
4. Historical snapshots are immutable after write.
5. Intelligence outputs must be reproducible from snapshot + policy version.

## MAESTRO Alignment

- **MAESTRO Layers:** Foundation, Data, Agents, Tools, Observability, Security.
- **Threats Considered:** prompt injection into ingestion paths, tool abuse via unbounded traversals, integrity loss from nondeterministic graph construction, historical tampering.
- **Mitigations:** policy-enforced query budgets, immutable snapshot files, deterministic graph builder rules, provenance stamping for graph versions, audit logging for graph mutations.

## Alternatives Considered

### A. Stateless scan-per-run analysis

- **Pros:** simplest implementation, minimal storage.
- **Cons:** no time-series architecture intelligence, weak drift and causality analysis, no reusable system memory.
- **Disposition:** Rejected.

### B. Stateful graph with immediate Neo4j dependency

- **Pros:** rich querying and graph algorithms from day one.
- **Cons:** higher operational complexity too early for MVP.
- **Disposition:** Deferred; enabled as a storage backend upgrade path.

## Consequences

### Positive

- Enables architecture drift detection as a first-class capability.
- Enables PR architecture copilot grounded in historical graph state.
- Enables subsystem ownership and contributor architecture maps.
- Establishes a stable platform data contract independent of storage backend.

### Tradeoffs

- Requires graph schema governance and migration discipline.
- Introduces snapshot lifecycle management and storage costs.
- Requires deterministic builder semantics to maintain confidence.

### Upgrade Path (No Data Model Reversal)

`JSON graph -> Neo4j -> DuckDB analytical views -> graph embeddings`.

The model remains stable while storage and analytics engines evolve.

## Implementation Contract

1. Introduce `repository-graph.json` canonical schema.
2. Emit `commit-<sha>.json` snapshots for each graph update.
3. Add graph integrity checks to CI (schema + determinism).
4. Wire intelligence modules to graph views, not direct scanner outputs.

## Rollback Plan

If graph pipeline integrity degrades, freeze incremental updates and revert to latest validated full graph snapshot while preserving snapshot history for forensics.

## Confidence

**0.90** — grounded in platform precedents (commit graph, time-series, ontology-first systems) and Summit's requirement for longitudinal architecture intelligence.
