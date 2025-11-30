# Candidate Patent Claims: Frontier Knowledge Graph + Graph-RAG

## Independent Claims
1. **Unified graph+doc+tool RAG method**: A method in which retrieval for a language model jointly returns document chunks, knowledge-graph subgraphs, and candidate tool outputs as a single context bundle, the model being conditioned on the bundle while logging knowledge traces of retrieved and attended items.
2. **Telemetry-driven knowledge shaping system**: A system that monitors runtime and evaluation telemetry (including hallucination signals, low-confidence answers, and tool failures) to modify chunking and indexing, update the knowledge graph, and adjust retrieval policies in a closed loop.

## Dependent Claim Directions
1. Multi-tier memory separation of global, tenant, and session knowledge with policy-bound access controls and retention rules.
2. Graph-specific retrieval semantics where query-type classifiers select subgraph expansion rules and relation filters.
3. Use of knowledge traces as training supervision indicating which retrieved elements were consumed by the model.
4. Telemetry-based prioritization of ingestion that targets domains or entities correlated with failure clusters.
5. Integration with governance policies covering data residency, redaction, licensing, and audit logging.
6. Cached tool results treated as expiring knowledge assets with staleness modeling and invalidation triggers.
7. Per-tenant personalization that adapts retrieval weights, expansion depth, and tool selection according to tenant/session context.
8. Retrieval-position-aware encoding for long-context models that preserves structure of graph subgraphs and document ordering.
