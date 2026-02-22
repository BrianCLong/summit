## 2025-12-29 - [Debouncing Controlled Components]

**Learning:** When debouncing a controlled input in React, you must decouple the input's display value (internal state) from the prop value (external state). If you bind the input directly to the prop value while debouncing the callback, the UI will freeze or lag because the prop updates are delayed.
**Action:** Always maintain an `internalValue` state for the input field, sync it with `useEffect` from props, and use it for the `value` prop of the input element.

## 2026-01-22 - [Optimized Neo4j Result Normalization]
**Learning:** Recursively normalizing large Neo4j result sets (converting `Integer` objects to JS numbers) is a major performance bottleneck if implemented with deep cloning. Most query results don't contain integers, so a "copy-on-write" approach that only clones when a change is detected can improve performance by >50%.
**Action:** Use the centralized `transformNeo4jIntegers` utility in `server/src/db/neo4j.ts` which implements this optimization.

## 2026-02-12 - [Batching Neo4j Writes with UNWIND]
**Learning:** Performing multiple individual `neo.run` calls in a loop is a significant bottleneck due to round-trip latency. Batching these operations using Cypher's `UNWIND` clause can reduce the number of round-trips from N to 1, providing a major performance boost for write-heavy repository methods.
**Action:** Always prefer `UNWIND` for batching insertions or updates in Neo4j repositories. Ensure per-item context (like `tenantId`) is preserved by including it in the batch parameters.
