# Agentic RAG Runbook

This runbook describes how to operate the Agentic RAG subsystem, including configuration, scaling, and failure recovery.

## Feature flag

- `AGENTIC_RAG_ENABLED` must be `true` to expose the GraphQL mutation and REST route.
- Disable by setting the flag to `false` and redeploying; the API returns a guarded message.

## Configuration

| Setting                                        | Description                                | Default                 |
| ---------------------------------------------- | ------------------------------------------ | ----------------------- |
| `AGENTIC_RAG_TOPK`                             | Number of vector neighbors retrieved       | `8`                     |
| `AGENTIC_RAG_USE_HYDE`                         | Enable HyDE hypothetical answer embeddings | `false`                 |
| `AGENTIC_RAG_USE_TOOLS`                        | Toggle tool router                         | `true`                  |
| `AGENTIC_RAG_ENABLE_HTTP_FETCH`                | Enable experimental HTTP fetch tool        | `false`                 |
| `AGENTIC_RAG_REDIS_TTL_SECONDS`                | Cache TTL for responses                    | `900`                   |
| `AGENTIC_RAG_QUEUE_NAME`                       | BullMQ queue name                          | `agentic-rag`           |
| `AGENTIC_RAG_JOB_ATTEMPTS`                     | Job retry attempts                         | `3`                     |
| `AGENTIC_RAG_JOB_BACKOFF_MS`                   | Job retry backoff                          | `5000`                  |
| `HYBRID_VECTOR_WEIGHT` / `HYBRID_GRAPH_WEIGHT` | Merge weights for hybrid retrieval         | `0.7` / `0.3`           |
| `RAG_EMBEDDER`                                 | `deterministic` (default) or `remote`      | `deterministic`         |
| `AGENTIC_RAG_CORPUS_DIR`                       | Default local ingestion source             | `./simulated_ingestion` |

## Scaling

- **Control plane**
  - Scale API replicas; ensure Redis cache is healthy to avoid thundering herds.
  - Use `AGENTIC_RAG_TOPK` to tune latency vs recall.
- **Data plane**
  - Worker concurrency is controlled via `AGENTIC_RAG_WORKER_CONCURRENCY`.
  - Jobs live in BullMQ queues named `AGENTIC_RAG_QUEUE_NAME` and `${AGENTIC_RAG_QUEUE_NAME}:dlq` for dead-lettered work.
  - Idempotency is enforced by setting `jobId` when enqueueing jobs (recommended: hash of workspace + payload).
- **Storage**
  - Postgres: pgvector extension enabled by migration `2026-01-03_agentic_rag.sql`.
  - Neo4j: set heap and page cache via standard env vars; relationships stored under `RagEntity`, `RagSource`.

## Failure modes & recovery

| Symptom                          | Likely cause                           | Action                                                                                  |
| -------------------------------- | -------------------------------------- | --------------------------------------------------------------------------------------- |
| Missing citations                | Graph store unavailable or low recall  | Check Neo4j health; fallback operates on vector-only and logs `graph_unavailable` flag. |
| Cache misses for identical query | Corpus version drift                   | Verify ingestion completed; rerun `pnpm rag:ingest --rebuild`.                          |
| Worker backlog                   | Embedding latency or Redis unavailable | Increase `AGENTIC_RAG_WORKER_CONCURRENCY`; check Redis connectivity; inspect DLQ.       |
| HyDE errors                      | Remote model unreachable               | Disable `AGENTIC_RAG_USE_HYDE` or switch `RAG_EMBEDDER` back to `deterministic`.        |
| GraphQL returns feature disabled | `AGENTIC_RAG_ENABLED` false            | Enable flag and restart API pods.                                                       |

## Dashboards and metrics

- Prometheus metrics exposed via existing `/metrics` endpoint: look for `agentic_rag_jobs_*`, `agentic_rag_stage_latency_ms`, and `agentic_rag_cache_hits_total`.
- OpenTelemetry spans: `plan`, `compute_embedding`, `hyde`, `retrieve`, `tool` (search by attribute `traceId` and `runId`).

## Operational tasks

- **Ingest**: `pnpm rag:ingest --source ./data --workspace demo --rebuild`
- **Evaluate**: `pnpm rag:eval --dataset ./eval/agentic-rag/golden.jsonl`
- **Flush cache**: delete keys with prefix `rag:cache:` in Redis.
- **Rebuild corpus**: drop `rag_documents`/`rag_chunks` for a workspace, rerun ingest.
