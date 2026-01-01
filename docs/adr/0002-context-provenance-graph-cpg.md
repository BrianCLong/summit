# ADR 0002: Context Provenance Graph (CPG)

- Status: Accepted
- Date: 2026-01-01
- Deciders: Brian C. Long

## Context

Model contexts are assembled from heterogeneous sources (human prompts, tool output, system policy). We need durable, queryable provenance across segments to support audits, rollback, and poisoning investigations.

## Decision

Implement a lightweight provenance graph that tracks segment parentage, creation timestamps, and source annotations. The graph can be attached to assembled contexts and traversed to recover lineage for any segment.

## Consequences

- **Positive:** Enables lineage reconstruction for investigations and integration with audit ledgers. Provides a deterministic attachment point for provenance edges during assembly.
- **Negative:** Additional storage/compute overhead for provenance maintenance.
- **Follow-up:** Persist graph edges into the existing provenance ledger and expose traversal in APIs.
