# Provenance Query Helpers

This guide documents the small helper layer for querying provenance receipts and decisions without changing the underlying schema. It covers the ergonomics provided in `packages/provenance/src/queryHelpers.ts` and the operational expectations for keeping queries fast and predictable.

## Helper functions

- **`fetchByCorrelationId(adapter, correlationId)`** – returns all provenance records that share the same correlation identifier, ordered by `createdAt` when present.
- **`fetchByReceiptId(adapter, receiptId)`** – returns a single record for an exact receipt identifier.
- **`fetchDecisionLineage(adapter, decisionId, options?)`** – traverses `decisionId -> parentDecisionId` to reconstruct an upstream chain with a bounded depth guard (defaults to 25) to prevent runaway recursion.

The helpers rely on a simple `ProvenanceQueryAdapter` abstraction:

```ts
interface ProvenanceQueryAdapter {
  findMany: (filter: { [key: string]: unknown }) => Promise<ProvenanceRecord[]>;
  findOne: (filter: { [key: string]: unknown }) => Promise<ProvenanceRecord | null>;
}
```

Adapters can wrap SQL/ORM clients, document databases, or in-memory stores. The helpers intentionally avoid schema coupling so existing persistence layouts remain untouched.

## Recommended indexes

To keep the above helpers efficient at scale, create or validate the following indexes in your backing store:

| Query                  | Recommended index                                                                        | Notes                                                                                     |
| ---------------------- | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `fetchByCorrelationId` | `correlationId` (single-column / single-field)                                           | Supports fan-out retrieval for pipeline runs or batches.                                  |
| `fetchByReceiptId`     | Primary key on `receiptId`                                                               | Ensures constant-time receipt lookups; co-locate with uniqueness constraint.              |
| `fetchDecisionLineage` | Composite index on `(decisionId, parentDecisionId)` or individual indexes on both fields | Enables fast parent walking and guards against table scans during lineage reconstruction. |
| All queries            | `createdAt` (for sort)                                                                   | Optional; used only for consistent ordering.                                              |

When using SQL, a partial index on `parentDecisionId IS NOT NULL` can further accelerate lineage traversal without inflating write cost.

## Query hardening tips

- Enforce non-empty identifiers before hitting the database to keep logs clean and avoid accidental full scans (the helpers already do this input validation).
- Cap lineage traversal depth (defaults to 25); tune lower if your domain guarantees shallow trees.
- Prefer read replicas for correlation fan-out queries to avoid impacting write-heavy primaries.
- Monitor query plans periodically—especially after schema migrations that add new receipt metadata—to ensure indexes remain aligned with the helper filters.
