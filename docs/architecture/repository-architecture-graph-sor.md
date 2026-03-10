# Repository Architecture Graph as System of Record (SoR)

## Summit Readiness Assertion

Summit is intentionally constrained to the platform path: **stateful architecture intelligence over transient scans**. This document formalizes the governing decision and defines the implementation baseline.

## Decision

**Summit treats the Repository Architecture Graph (RAGraph) as the system of record.**

All analysis outputs (drift alerts, PR copilot suggestions, subsystem health scores, ownership mapping, CI risk signals) are derived views over this persistent graph.

## Problem Statement

Stateless scan tooling (`repo -> scan -> report`) can answer point-in-time quality questions, but it cannot reliably answer trajectory questions:

- what changed structurally between commits,
- where coupling is increasing,
- which PR introduced instability,
- which subsystem is degrading over time.

Summit's product thesis requires longitudinal, queryable architectural memory.

## Architecture Baseline (MVP)

```text
repo snapshot
  -> parser pipeline (AST + metadata extractors)
  -> graph builder (typed nodes + typed edges)
  -> persistent graph store (.repoos/graph/repository-graph.json)
  -> versioned snapshots (.repoos/snapshots/<commit>.json)
  -> intelligence engines (drift, risk, copilot, ownership)
```

### Storage Layout

```text
.repoos/
  graph/
    repository-graph.json
  snapshots/
    <commit-sha>.json
```

### Update Model

1. Resolve changed files from VCS diff.
2. Re-parse only impacted files.
3. Recompute affected subgraph partitions.
4. Merge into canonical graph state.
5. Emit commit snapshot + diff summary.

### Canonical Entity Model

Node classes (minimum):

- `Repository`
- `Package`
- `Module`
- `File`
- `Symbol` (class/function/type)
- `ServiceBoundary`
- `Owner` (team/user)

Edge classes (minimum):

- `CONTAINS`
- `IMPORTS`
- `CALLS`
- `EXTENDS`
- `DEPENDS_ON`
- `OWNED_BY`
- `CHANGED_IN`

## Non-Negotiable Invariants

1. **Determinism**: identical input commit yields identical graph state.
2. **Incrementality**: cost scales with changed surface area, not full repo size.
3. **Queryability**: graph must be analyzable with stable schema contracts.
4. **Historical Fidelity**: snapshots are immutable and keyed by commit.
5. **Governance Compatibility**: analyzers consume graph artifacts, not ad hoc scans.

## Capability Map (Enabled by SoR)

| Capability | Stateless Scan | Stateful Graph |
| --- | --- | --- |
| Architecture drift detection | Partial | Full |
| PR architecture copilot | Weak | Strong |
| CI failure trend prediction | Weak | Strong |
| Subsystem degradation tracking | No | Yes |
| Ownership evolution maps | No | Yes |
| Architecture time-machine queries | No | Yes |

## Implementation Roadmap

### Phase 1 (Now): Graph JSON Foundation

- Define graph JSON schema + version field.
- Generate graph and snapshot artifacts per commit.
- Add deterministic graph-diff summary artifact.

### Phase 2: Query and Intelligence Layer

- Add query facade for common architecture questions.
- Ship drift and hotspot analyzers on top of graph state.
- Add PR copilot context pack generator.

### Phase 3: Scale Path

- Promote storage backend from JSON to Neo4j/DuckDB as needed.
- Preserve schema compatibility and replay from snapshots.
- Introduce graph embeddings for semantic architecture retrieval.

## Success Metrics

- **Graph freshness**: commit-to-graph latency p95 under target SLA.
- **Incremental efficiency**: changed-file updates are materially cheaper than full rebuilds.
- **Drift signal quality**: measurable precision/recall on known architecture violations.
- **Adoption**: graph-derived signals consumed by CI and PR workflows.

## Anti-Pattern Guardrail

The following pattern is disallowed for Summit intelligence features:

```text
ad hoc file scan -> one-off report -> discard state
```

If a feature cannot consume or enrich the repository architecture graph, it is intentionally constrained and not platform-grade.
