# Graph-Structured State Design

Transforms linear Chain-of-Thought (CoT) into a deterministic structured graph memory.

## Architecture
- **Nodes**: Represent distinct logical claims or factual assertions.
- **Edges**: Represent inference relations (e.g., `supports`, `contradicts`, `derives_from`).
- **Storage Engine**: IntelGraph adapter converts JSON graphs to native graph queries.

## Advantages
- Enables query-time selective expansion (only evaluate paths that matter).
- Enables attack surface auditing (visualizing hallucination trees).
