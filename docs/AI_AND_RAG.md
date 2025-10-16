---

## docs/AI_AND_RAG.md

```markdown
# AI + GraphRAG + Agentic Runbooks

## GraphRAG

- **Retrieval:** subgraph selection by neighborhood + motif (e.g., Person→Org with time filter).
- **Packing:** structured facts + path justifications → prompt.
- **Responses:** always cite entity ids and path rationales.

## Agentic Runbooks

- **Definition:** YAML DAG where nodes are actions: `cypher`, `transform`, `score`, `notify`, `write`.
- **Execution:** idempotent; records step outputs to provenance.

## Explainability

- Auto‑attach `why_paths`: minimal set of edges supporting the answer.
- Confidence calibration with held‑out eval sets.
```
