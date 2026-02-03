# LLM-Friendly Cypher Design Guide

**Status:** APPROVED
**Effective:** Turn 5 (2026-01-25)
**Scope:** All RAG-related Cypher queries

## 1. Core Philosophy

When writing Cypher for GraphRAG, the consumer is not a human analyst or a dashboard—it is an LLM. This shifts the optimization target from *latency* to **context determinism** and **token efficiency**.

> **Guideline:** Query shape affects model reasoning quality.

## 2. Best Practices

### 2.1 Projection-Only Returns (No Raw Nodes)

**Bad:** Returning full nodes bloats the context with internal metadata (schema versions, internal IDs) that confuse the LLM.
```cypher
MATCH (p:Person)-[r:KNOWS]->(f:Person)
RETURN p, r, f
```

**Good:** Explicitly project only semantically relevant properties.
```cypher
MATCH (p:Person)-[r:KNOWS]->(f:Person)
RETURN {
  name: p.name,
  role: p.role,
  evidence_id: p.evidence_id
} AS person,
{
  since: r.since,
  type: type(r)
} AS relation,
{
  name: f.name
} AS friend
```

### 2.2 Stable Ordering (Determinism)

LLMs are sensitive to input order. Randomly ordered context can cause answer variance across identical runs (low "Prompt Cache" hit rate).

**Mandatory:** Always `ORDER BY` a stable, unique identifier (e.g., `evidence_id` or `id`).

```cypher
MATCH path = (a)-[r]->(b)
RETURN path
ORDER BY a.id, b.id
LIMIT 10
```

### 2.3 Explicit Hop Caps

Unlimited traversals (`*..`) create unpredictable token usage and can introduce "semantic drift" (irrelevant nodes).

**Bad:**
```cypher
MATCH (a)-[*]->(b) ...
```

**Good:**
```cypher
MATCH (a)-[*1..3]->(b) ...
```

### 2.4 Evidence ID Propagation

Every node passed to the LLM **MUST** carry an `evidence_id` if available. This allows the LLM to generate citations.

## 3. Anti-Patterns

| Pattern | Why Avoid |
| :--- | :--- |
| `RETURN *` | Returns massive amounts of noise; wastes tokens. |
| `shortestPath` (without context) | Often skips semantically vital intermediate nodes (the "why"). |
| Filtering in Post-Processing | Filter in Cypher! Sending 100 nodes to code to keep 10 is inefficient and risks non-deterministic truncation. |
| Ignoring Direction | `(a)--(b)` is ambiguous. Use `(a)-[]->(b)` or `(a)-[]-(b)` explicitly based on semantics. |

## 4. Testing

A Cypher query is "LLM-Ready" if:
1.  Running it twice returns the exact same bytes (order preserved).
2.  It returns < 2000 tokens of JSON/Text for a standard question.
3.  Every entity has a citation handle.
