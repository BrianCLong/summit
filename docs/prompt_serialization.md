# Prompt Serialization Format

To ensure consistent performance with black-box LLMs, Summit uses a deterministic serialization format for subgraphs.

## Format

The format is text-based and strictly ordered.

```
NODES:
<id> | <type> | <props> | prov=<provenance>
...

EDGES:
<src> -[<rel>]-> <dst> | ev=<evidence>
...
```

## Guarantees

1. **Deterministic Ordering**:
   - Nodes are sorted by `type` then `id`.
   - Edges are sorted by `src`, `rel`, `dst`.

2. **Idempotency**:
   - The same graph input will always produce the exact same string output.

3. **Truncation**:
   - The output is truncated to fit within a context window budget (configurable).
