# Agentic RAG Pipeline v1

This subsystem introduces a layered, production-ready Retrieval-Augmented Generation (RAG) stack with a control-plane/data-plane split. It borrows the layered approach from the reference architectures (ingestion → compute → agentic pipeline → tools/sandbox → infra-as-code → evaluation/observability) and maps them to Summit services.

## Layered model

| Layer                      | Summit mapping                                                                                                                        | Notes                                                                      |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Ingestion                  | `pnpm rag:ingest`, `packages/agentic-rag` ingestion pipeline, Postgres/Neo4j connectors                                               | File-system loader today; connectors can be added.                         |
| AI compute                 | Embedding + HyDE generation in the worker (`services/agentic-rag-worker`) using pluggable `Embedder`                                  | Deterministic embedder by default; swap for hosted models via env.         |
| Agentic pipeline           | `RAGOrchestrator` state machine (plan → rewrite → HyDE (optional) → hybrid retrieval → tool routing → synthesis → self-check)         | Configurable via env/config; feature-flagged behind `AGENTIC_RAG_ENABLED`. |
| Tools / sandbox            | Allowlisted router (`calc`, `lookup`, optional `http_fetch` guarded by `AGENTIC_RAG_ENABLE_HTTP_FETCH=false`)                         | Runs in a conservative in-process sandbox.                                 |
| Infra-as-code              | Postgres (pgvector-enabled), Neo4j, Redis via `docker-compose.dev.yml`; migration `2026-01-03_agentic_rag.sql` enables vector storage | Scaling knobs documented below.                                            |
| Evaluation / observability | `pnpm rag:eval`, OpenTelemetry spans, Prometheus metrics, structured logging                                                          | Emits spans for each orchestrator stage with `runId`/`traceId`.            |

## Control plane vs data plane

- **Control plane (API/orchestrator):**
  - GraphQL mutation `ragAnswer` (schema and resolver live in `server/src/graphql/schema.ts` and `server/src/graphql/resolvers.ts`).
  - Handles request validation, caching in Redis keyed by normalized query + corpus version, dispatches to the orchestrator, and assembles citations.
- **Data plane (workers):**
  - `services/agentic-rag-worker`: Redis-queued jobs for embeddings, HyDE generation, and optional entity extraction for Neo4j graph expansion.
  - Retries with backoff, DLQ channel, and idempotency keys per job.

## Request flow

```
Client -> GraphQL ragAnswer
  -> planner (generate structured plan)
  -> query rewrite (normalize with filters/workspace)
  -> optional HyDE (hypothetical answer embedding)
  -> HybridRetriever (pgvector topK + Neo4j neighborhood)
  -> tool router (calc | lookup | http_fetch?)
  -> synthesizer (LLM adapter; offline template by default)
  -> self-check (citation coverage + basic guardrails)
  -> response { answer, citations[], debug }
```

## Data model

- **Postgres** (`rag_documents`, `rag_chunks`, `rag_jobs`, `rag_cache_entries`)
  - `rag_documents`: source metadata keyed by `workspace_id`, `source_path`, `corpus_version`.
  - `rag_chunks`: text chunks with embeddings (`vector` + `embedding_array`) and offsets for citation snippets.
  - `rag_jobs`: ingestion/eval job bookkeeping with status and trace ids.
  - `rag_cache_entries`: materialized answers keyed by normalized query + corpus version.
- **Neo4j**
  - Labels: `RagEntity {id, name, type, sourceId}`; `RagSource {id, title, workspaceId}`
  - Relationships: `:MENTIONS` (source → entity), `:RELATED` (entity ↔ entity), `:DERIVED_FROM` (chunk → source)

## Hybrid retrieval

1. Dense retrieval from Postgres pgvector (`embedding <=> query_embedding`) using `PgVectorStore`.
2. Graph expansion via Neo4j (`MATCH (e:RagEntity)-[:RELATED*1..2]->(n) ...`) using `GraphStore`.
3. Deterministic merge in `HybridRetriever`: scores are normalized, weighted (`HYBRID_GRAPH_WEIGHT`, `HYBRID_VECTOR_WEIGHT`), and deduped by `sourceId+chunkId`.
4. Citations use `CitationBuilder` to attach `sourceId`, `title/url`, snippet, offsets, and merged score.

## Running locally

1. `cp .env.example .env` and set `AGENTIC_RAG_ENABLED=true`.
2. `docker-compose -f docker-compose.dev.yml up -d postgres neo4j redis` (these services already exist; pgvector enabled via migration).
3. Ingest a sample corpus:
   - `pnpm rag:ingest --source ./simulated_ingestion --workspace demo`
4. Query via GraphQL:
   - Run the server (`pnpm dev`), then call `ragAnswer` from the GraphQL explorer.
5. Evaluate:
   - `pnpm rag:eval --dataset ./eval/agentic-rag/golden.jsonl`

## Evaluation

The evaluation harness executes `ragAnswer` for each entry in `eval/agentic-rag/golden.jsonl`, records latency per stage, hit rate, and citation coverage, and optionally uses an LLM judge when `AGENTIC_RAG_ENABLE_LLM_JUDGE=true`.

## Configuration (env)

- `AGENTIC_RAG_ENABLED` (default: `false`)
- `AGENTIC_RAG_TOPK` (default: `8`)
- `AGENTIC_RAG_USE_HYDE` (default: `false`)
- `AGENTIC_RAG_USE_TOOLS` (default: `true`)
- `AGENTIC_RAG_REDIS_TTL_SECONDS` (default: `900`)
- `AGENTIC_RAG_ENABLE_HTTP_FETCH` (default: `false`)
- `AGENTIC_RAG_QUEUE_NAME` (default: `agentic-rag`)
- `AGENTIC_RAG_JOB_ATTEMPTS` (default: `3`)
- `AGENTIC_RAG_JOB_BACKOFF_MS` (default: `5000`)
- `HYBRID_VECTOR_WEIGHT` (default: `0.7`), `HYBRID_GRAPH_WEIGHT` (default: `0.3`)
- `RAG_EMBEDDER` (default: `deterministic`)
- `AGENTIC_RAG_CORPUS_DIR` (default: `./simulated_ingestion`)

## Scaling knobs

- **Control plane:** scale the API pod count; cache results in Redis to avoid recomputation.
- **Data plane:** increase worker concurrency and queue partitions; DLQ visible via BullMQ queue `${AGENTIC_RAG_QUEUE_NAME}:dlq`.
- **Storage:** adjust Postgres `work_mem` for vector search; Neo4j memory/GC tuning via `NEO4J_server_memory_heap_max__size`.
- **Observability:** OpenTelemetry exporter configured via standard OTEL env vars; Prometheus metrics on `/metrics`.
