# ADR 0002: Context Provenance Graph (CPG)

- Status: Accepted
- Date: 2026-01-01

## Context

Context segments originate from multiple tools, users, and automated agents. Without explicit lineage
tracking, downstream decisions cannot be audited or reproduced, and poisoning can hide within opaque
context merges.

## Decision

Implement a Context Provenance Graph per assembled context. Each segment becomes a node, with edges
representing derivations, compositions, or copies. Graph snapshots are serializable for audits and
feeds into CCR to target perturbations.

## Consequences

- Introduces lightweight graph primitives in TypeScript and Python without runtime dependencies.
- Enables lineage queries (e.g., `getLineage`/`lineage`) to support forensics and divergence analysis.
- Future integration should persist graphs alongside model execution traces.
