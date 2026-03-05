## 2025-12-29 - [Debouncing Controlled Components]

**Learning:** When debouncing a controlled input in React, you must decouple the input's display value (internal state) from the prop value (external state). If you bind the input directly to the prop value while debouncing the callback, the UI will freeze or lag because the prop updates are delayed.
**Action:** Always maintain an `internalValue` state for the input field, sync it with `useEffect` from props, and use it for the `value` prop of the input element.

## 2026-01-22 - [Optimized Neo4j Result Normalization]
**Learning:** Recursively normalizing large Neo4j result sets (converting `Integer` objects to JS numbers) is a major performance bottleneck if implemented with deep cloning. Most query results don't contain integers, so a "copy-on-write" approach that only clones when a change is detected can improve performance by >50%.
**Action:** Use the centralized `transformNeo4jIntegers` utility in `server/src/db/neo4j.ts` which implements this optimization.

## 2026-02-12 - [Batching Neo4j Writes with UNWIND]
**Learning:** Performing multiple individual `neo.run` calls in a loop is a significant bottleneck due to round-trip latency. Batching these operations using Cypher's `UNWIND` clause can reduce the number of round-trips from N to 1, providing a major performance boost for write-heavy repository methods.
**Action:** Always prefer `UNWIND` for batching insertions or updates in Neo4j repositories. Ensure per-item context (like `tenantId`) is preserved by including it in the batch parameters.

## 2026-02-03 - [Batched PostgreSQL Inserts with Chunking]
**Learning:** Inserting many records individually in a loop is a major performance bottleneck. Using multi-row `INSERT INTO ... VALUES (), (), ...` reduces round-trips from N to 1. However, PostgreSQL has a parameter limit (65,535), so large batches must be chunked (e.g., 100 records per batch) to avoid runtime errors.
**Action:** Use multi-row `VALUES` for batched PostgreSQL inserts and always implement chunking to handle arbitrarily large input arrays safely.

## 2026-05-22 - [Optimized Supernode Detection]
**Learning:** Nested loops of O(N*E) for supernode detection in large graphs (>10k nodes, >50k edges) cause severe latency (~6s). Pre-calculating connection Maps in O(E) reduces this to O(N+E), improving performance by >100x (~33ms).
**Action:** Always pre-calculate frequency/connection maps when iterating over edges for multiple nodes to avoid N*E complexity.

## 2026-07-15 - [Safe Batched Upserts with Fallback]
**Learning:** While batched multi-row inserts improve performance by reducing round-trips, they change the atomicity of the operation; a single failing record can fail the entire batch. To maintain row-level reliability, a batch failure should trigger a fallback to individual inserts for that specific chunk.
**Action:** Implement a try-catch block around batch queries that falls back to a row-by-row loop for the failed chunk, ensuring that valid records are still processed.

## 2026-08-10 - [Transactional Batching in PostgreSQL]
**Learning:** Fallback logic (batch to individual) is functionally useless inside a PostgreSQL transaction block if the failure is a database-level error (e.g., constraint violation). Any error immediately aborts the transaction, making subsequent queries in the `catch` block fail.
**Action:** For transactional operations, prioritize batching for performance but avoid complex fallbacks unless using `SAVEPOINT`s. Ensure all data is validated before the batch insert to minimize failures.
