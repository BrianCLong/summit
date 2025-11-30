# Summit Frontier Knowledge Graph & RAG Runtime v0.1

## Overview
Summit Frontier Knowledge Graph & RAG Runtime v0.1 establishes a unified knowledge substrate that combines document stores, IntelGraph-style knowledge graphs, and episodic memory to deliver graph-native retrieval-augmented generation. The system provides a single "context bundle" interface for model-serving pipelines and captures knowledge traces to power both inference-time control and future training-time supervision.

## Goals
- Stand up a retrieval and graph-augmented generation (RAG) layer tightly coupled with existing frontier models.
- Integrate IntelGraph-aligned graph storage, document vectors, and cached tool outputs into one governed memory abstraction.
- Demonstrate quality-per-token uplift over parametric-only baselines via experiments across document, code, and enterprise graph domains.
- Capture telemetry to drive re-ingestion, re-chunking, re-linking, and retrieval-weight updates in a closed loop.

## Architectural Components
### Knowledge Store
- **Document Store**: chunked documents with embeddings, dense vector index, and chunk-level metadata (tenant, source, license, safety tags, timestamps, domains).
- **Graph Store**: IntelGraph-compatible entities, relations, and events; supports subgraph retrieval with expansion rules keyed by query class.
- **Tool Cache**: cached tool outputs with staleness windows and provenance; treated as ephemeral knowledge with TTL and invalidation hooks.
- **Unified Metadata**: enforced schemas for global/org/session tiers; policy-aware attributes for residency, PII redaction, and retention.

### Ingestion & Indexing Pipelines
- **Document Ingestion**: chunk → embed → store; adaptive chunk sizes informed by telemetry hotspots and domain heuristics.
- **Graph Extraction**: entity/relation/event extraction from documents and external systems; link documents ↔ graph nodes via cross-reference edges.
- **Governance Gates**: validate schemas, enforce source allowlists, and tag data with compliance domains before persistence.
- **Versioning**: ingestion jobs record versioned transforms and embedding model versions for reproducibility.

### Retrieval Core
- **retrieve_bundle API**: returns a context bundle with documents, graph subgraphs, tool candidates, and metadata for a given query, tenant, and session.
- **Hybrid Scoring**: combine vector similarity, sparse signals, and graph proximity (PageRank/Personalized PageRank) with tenant-aware weighting.
- **Graph Expansion**: query-type classifiers determine expansion depth, relation filters, and event-window constraints.
- **Memory Integration**: session and long-term memory surfaced as structured facts/events inside the bundle with recency weighting.

### RAG Orchestrator
- **Decisioning**: decides when to retrieve, how deep to retrieve, and whether to include tool candidates; supports retrieval-stage caching.
- **Prompt Construction**: merges context bundle into model inputs with guardrails for token budgets and safety filtering.
- **Knowledge Traces**: logs retrieved items, model-attended items (when available), and tool calls as structured traces for telemetry.

### Memory Layer
- **Short-Term Memory**: session/episode facts, user preferences, tool outcomes; persisted with TTL and conflict resolution.
- **Long-Term Memory**: per-tenant knowledge, user profiles, task histories; supports embeddings plus symbolic attributes for personalized retrieval.
- **Global Knowledge**: shared corpus with governance-bound policy enforcement and redaction hooks.

## Key Interfaces
### Ingestion
```python
knowledge.ingest_documents(docs, tenant="acme", source="wiki_dump")
knowledge.ingest_graph(subgraph, tenant="acme", source="crm")
knowledge.ingest_tool_results(results, tenant="acme", ttl="24h")
```

### Retrieval & Runtime Integration
```python
context = knowledge.retrieve_bundle(
  query="How do I reset VPN access for contractor laptops?",
  tenant="acme",
  session_id="sess-123",
  k_docs=10,
  k_nodes=25,
  include_tools=True,
)
runtime.handle_request(request, external_context=context)
```

### Telemetry Hooks
- `telemetry.log_event(event_type, payload, tenant, session_id)`: hallucination hotspots, low-confidence answers, tool failures.
- `telemetry.feedback_ingestion(hotspots)`: re-chunk/re-link targeted content and adjust retrieval weighting.

## Schemas
Schema documents reside in `impl/knowledge/schemas/`:
- `doc.schema.json`: document-level metadata and chunk references.
- `chunk.schema.json`: chunk content, embedding, provenance, safety tags.
- `graph_node.schema.json`: IntelGraph-compatible nodes with tenant/residency attributes.
- `graph_edge.schema.json`: typed relationships with timestamps and lineage.
- `memory_event.schema.json`: session/long-term memory events with TTL and policy bindings.

## Data Flow
1. **Ingest**: documents and graphs pass through governance filters, chunking, embedding, and linking; artifacts stored with versioned metadata.
2. **Retrieve**: retriever scores documents and graph nodes jointly, applies expansion rules, and selects tool candidates; memory merged by session/tenant.
3. **Orchestrate**: runtime composes prompts/tool calls using the context bundle, executes model inference, and records knowledge traces.
4. **Telemetry Loop**: traces and evaluator signals feed back into ingestion policies, index weighting, and graph enrichment.

## Telemetry-Driven Adaptation
- Maintain rolling metrics for hallucination rate, low-confidence answers, tool failure clusters, and unused retrieved items.
- Re-chunking strategy: smaller chunks near hotspots; larger chunks where context is stable to reduce token cost.
- Graph enrichment: add edges for frequently co-retrieved entities; tighten relation filters where noise is observed.
- Retrieval weighting: adjust hybrid scoring coefficients per tenant/session based on success metrics.

## Policies & Governance
- Apply data residency and access policies at ingestion and retrieval; enforce per-tenant and per-session access control lists.
- Redact PII and sensitive fields before storage; maintain audit logs for all writes and reads.
- TTL policies for tool caches and session memory; retention schedules for long-term memory with deletion workflows.

## Deployment & Operability
- Service footprint: retrieval API, ingestion workers, telemetry processor, governance/policy engine, and metadata DB.
- Observability: request/latency metrics by query type; retrieval depth vs token cost; graph expansion size; telemetry event volume; cache hit rates.
- Resilience: circuit breakers around graph/tool backends, retry with backoff for ingestion jobs, and rate limits per tenant.

## Experimentation
- Baselines: parametric-only, vanilla document RAG, graph-RAG (docs + subgraphs).
- Metrics: QA accuracy, hallucination rate, judge win-rate, answer verifiability, added latency per request, retrieval cost.
- Outputs: `/benchmark/frontier_knowledge_rag_results.json` plus plots (accuracy vs latency; hallucination vs context depth).

## Roadmap Highlights
- **v0.1 (this sprint)**: unified schemas, ingest + retrieve bundle, runtime integration hooks, telemetry logging, session memory.
- **v0.2**: adaptive retrieval policies, richer tool cache semantics, per-tenant personalization, and eval automation.
- **v0.3**: training-time supervision using knowledge traces, governance-aware fine-tuning, and multimodal extensions.
