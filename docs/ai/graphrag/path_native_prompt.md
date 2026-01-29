# Path-Native GraphRAG Prompt Specification

**Status:** APPROVED
**Effective:** Turn 5 (2026-01-25)
**Owner:** AI Systems / Jules

## 1. Overview

This specification defines the standard for "Path-Native" prompts in Summit's GraphRAG architecture. Unlike previous methods that flattened graph data into text summaries or list of triples, Path-Native prompting preserves the explicit topological structure of evidence as ordered traversal paths.

**Key Principle:** LLMs reason better over *ordered relational evidence* (`(A)-[REL]->(B)`) than over disconnected facts.

## 2. Canonical Prompt Schema

A Path-Native prompt injects context as a series of strictly ordered paths. Each path represents a causal or relational chain retrieved from the graph.

### 2.1 Structure

```markdown
## GRAPH CONTEXT (PATH-NATIVE)

The following evidence consists of validated traversal paths from the knowledge graph.
Each path is an ordered traversal sequence. Arrows indicate relationship direction (`-->` or `<--`).

### RELEVANT PATHS

[Path 1] (Confidence: 0.95)
(Entity A: "Project X")
  --[DEPENDS_ON {since: "2025-10"}]-->
(Entity B: "Module Y")
  --[HAS_VULNERABILITY {severity: "HIGH"}]-->
(Entity C: "CVE-2025-9999")

[Path 2] (Confidence: 0.88)
(Entity D: "Team Lead")
  --[OWNS]-->
(Entity B: "Module Y")
```

### 2.2 Inline Annotations

Paths MUST include inline annotations for:
*   **Properties:** Critical attributes (e.g., `since`, `severity`) inside the node/relationship brackets.
*   **Metadata:** Path-level confidence or temporal bounds.
*   **Evidence IDs:** If available, attached to nodes for citation.

## 3. Comparison: Before vs. After

### Before: Flattened Summary (Legacy)

> The knowledge graph shows that Project X depends on Module Y. Module Y has a high severity vulnerability identified as CVE-2025-9999. The Team Lead owns Module Y.

*   **Weakness:** The LLM often hallucinates the directionality or "forgets" the transitive risk (Project X -> CVE). It treats these as three separate facts.

### After: Path-Native (Standard)

> **[Path 1]** `(Project X)-[DEPENDS_ON]->(Module Y)-[HAS_VULNERABILITY]->(CVE-2025-9999)`
> **[Path 2]** `(Team Lead)-[OWNS]->(Module Y)`

*   **Strength:** The explicit structure enforces the dependency chain. The LLM can easily deduce: "Project X is at risk because it depends on Y, which has a vulnerability."

## 4. Token Budget Guidance

*   **Path Depth:** Limit traversals to 2-3 hops for standard queries.
*   **Path Count:** Top 5-10 most relevant paths usually suffice.
*   **Pruning:**
    *   Strip non-essential node properties (e.g., `created_at` unless relevant to the query).
    *   Use concise label aliases if schemas are verbose.
    *   **Budget:** Allocate ~50-100 tokens per path. A context window of 10 paths consumes ~500-1000 tokens.

## 5. Implementation Reference

See `packages/intelgraph/graphrag/path_assembler.ts` for the reference implementation of the serializer.
