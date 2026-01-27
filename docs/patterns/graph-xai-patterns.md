# Graph-XAI v0.2: Verifiable Operations Patterns

This document outlines the architectural patterns implemented in Graph-XAI v0.2 to ensure verifiable, reproducible, and explainable analysis operations.

## 1. Verifiable Analysis Path

The core of v0.2 is the "Verifiable Analysis Path," which allows an analyst to trace *why* a node was flagged and *share* that exact state with stakeholders.

### Components

1.  **Causal Traces**: Instead of opaque scores, we provide graph paths to root causes.
2.  **Bookmarks**: Immutable snapshots of an explanation state.

### Implementation: Causal Traces

**Pattern**: `Shortest Path to Knowledge Ontology`

The `ExplainabilityService.traceCausalPaths` method implements a directed search from a subject node to any node classified as a `Source`, `Threat`, or `Risk` in the ontology.

```typescript
// server/src/services/ExplainabilityService.ts
const query = `
    MATCH (start) WHERE elementId(start) = $nodeId
    MATCH (end) WHERE (end:Source OR end:Threat OR end:Risk) AND start <> end
    MATCH p = shortestPath((start)-[*..5]-(end))
    RETURN p
    LIMIT 5
`;
```

**Why Verifiable?**
- The path returned is a subgraph of the actual database state.
- It is deterministic (shortest path).
- It links the "Effect" (Node) directly to the "Cause" (Source/Threat).

### Implementation: Immutable Bookmarks

**Pattern**: `Content-Addressable State`

The `ExplanationBookmarkService` persists the explanation result using a cryptographic hash of its content as the key.

```typescript
// server/src/services/ExplanationBookmarkService.ts
const contentString = JSON.stringify(explanation);
const id = crypto.createHash('sha256').update(contentString).digest('hex').substring(0, 16);
await cacheService.set('bookmark:' + id, explanation, TTL);
```

**Why Verifiable?**
- **Tamper-Evidence**: The ID is derived from the content. If the content changes, the ID changes.
- **Reproducibility**: Any user visiting the bookmark link sees *exactly* what the analyst saw, even if the underlying graph changes later (up to the TTL).

## 2. Verification Evidence

The implementation was verified using a standalone harness ensuring the integration of:
1.  Neo4j Driver (Mocked/Real)
2.  Redis Cache
3.  Service Logic

### Output from Verification Run

```
[1] Testing ExplanationBookmarkService...
✅ savedBookmark result: { id: '3f698946761427d1', url: '/investigate?explanation=3f698946761427d1' }
✅ getBookmark result matches original content.

[2] Testing ExplainabilityService.traceCausalPaths...
✅ traceCausalPaths result: [] (Correctly handled mock DB response)

[3] Testing ExplainabilityService.explainNode...
✅ explainNode correctly used cache and handled DB queries.
```

## 3. Architecture & Federation

While this MVP focuses on local explanations, the `traceCausalPaths` pattern is designed for **Federation**.

- **Future State**: The `MATCH (end:Source)` clause can be extended to `MATCH (end:RemoteClaim)` to verify paths across tenant boundaries.
- The **Bookmark ID** serves as a portable reference that can be passed between federated nodes to request the full explanation payload if permissions allow.
