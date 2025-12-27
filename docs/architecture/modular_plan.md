# Modular Pipeline Plan

## Overview

This plan enumerates the intelligence processing pipeline stages, the interfaces between modules, and the expected performance envelopes. Each stage lists latency budgets (p50/p95), cache/batching/streaming approaches, and the observability hooks required to keep the system production-ready.

## Stage map and interfaces

| Stage                             | Interface                              | Purpose                                                 | Inputs → Outputs                          | Contract & validation                                                | Cache strategy                                                                             | Batching strategy                                                       | Streaming strategy                                                                           | p50 budget | p95 budget |
| --------------------------------- | -------------------------------------- | ------------------------------------------------------- | ----------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ---------- | ---------- |
| 1. Ingestion Gateway              | gRPC/REST (`/ingest/v1`)               | Accept raw event/intel payloads and normalize envelopes | Client payload → normalized `IngestEvent` | Schema validation + authN/Z; reject on checksum mismatch             | L4 TLS session reuse; short-lived request cache for idempotency keys (5m TTL)              | Micro-batch enqueue (up to 256 events or 50 ms) before handing to queue | Optional chunked transfer for large uploads; stream to object store while checksums computed | 30 ms      | 80 ms      |
| 2. Preprocessing & Enrichment     | Async job on `ingest.normalized` queue | Cleanse, dedupe, enrich with geo/threat intel           | `IngestEvent` → `EnrichedEvent`           | Dedup via content hash; enrichment versioned; emits provenance stamp | Read-through cache for enrichment lookups (TTL 10m); hot-key protection                    | Batch enrichment lookups (up to 64 keys/request)                        | Stream enrichment calls when upstream supports server-side streaming                         | 120 ms     | 300 ms     |
| 3. Entity/Relationship Upsert     | Graph service API (`/graph/v1/upsert`) | Materialize entities/edges in graph store               | `EnrichedEvent` → `GraphMutationResult`   | Optimistic concurrency; idempotent via stable IDs                    | Write-through cache for entity metadata; cache invalidation on mutation events             | Group mutations by partition (up to 32 per transaction)                 | Stream edge writes when partition routing is stable; backpressure via credits                | 80 ms      | 200 ms     |
| 4. Feature & Embedding Generation | ML service RPC (`/ml/embed`)           | Produce features and embeddings for search and scoring  | Entities/edges → `EmbeddingVector[]`      | Model version pinned; rejects oversized batches                      | GPU/CPU warm pool cache for model weights; result cache for deterministic inputs (TTL 30m) | Dynamic batching (up to 16 items or 40 ms) with autoscaling guardrails  | Token-level streaming for large text; early-cancel supported                                 | 180 ms     | 450 ms     |
| 5. Indexing & Search Prep         | Indexer queue (`search.index`)         | Update search/ANN indices                               | `EmbeddingVector[]` → index segments      | Segment-level atomicity; checksum on segment upload                  | Segment cache for retry; bloom filters for duplicate segments                              | Batch segment commits (up to 8 segments or 100 ms)                      | Stream segment upload to storage; incremental flush for large shards                         | 90 ms      | 220 ms     |
| 6. Query Planning & Routing       | Service RPC (`/query/plan`)            | Choose execution plan across graph, search, LLM         | Query AST → `ExecutionPlan`               | Plan cost model validated; SLA target attached                       | Cache recent plans by query fingerprint (TTL 15m); cost-aware invalidation                 | Batch routing requests when generated from same session                 | Stream plan candidates for A/B planners; first-success wins                                  | 50 ms      | 140 ms     |
| 7. Execution Orchestrator         | Event bus (`orchestrator.run`)         | Coordinate parallel executors (graph, search, LLM)      | `ExecutionPlan` → partial results         | Enforces stage SLAs; records trace spans                             | Sticky cache for session context; result cache for deterministic subqueries                | Coalesce identical subqueries within 50 ms window                       | Stream partial results to caller; backpressure via server-sent events                        | 70 ms      | 180 ms     |
| 8. Ranking & Fusion               | RPC (`/rank/fuse`)                     | Merge multimodal results with scoring                   | Partial results → ranked set              | Deterministic scoring; explainability artifacts required             | Cache recent feature vectors; memoize rerank results per query fingerprint                 | Batch rerank candidates (up to 128 docs or 60 ms)                       | Stream top-k as they stabilize; speculative rerank allowed                                   | 60 ms      | 150 ms     |
| 9. Response Packaging             | HTTP/WS (`/respond`)                   | Assemble final payload and delivery                     | Ranked set → client response              | Contracts on schema + latency; attaches trace + provenance           | Cache templated responses; CDN edge cache for public artifacts                             | Batch push notifications per tenant (fan-out control)                   | Stream tokens for LLM or progressive disclosure for UI                                       | 30 ms      | 90 ms      |
| 10. Observability & Ledger Sink   | Append-only bus (`provenance.log`)     | Persist metrics, traces, audit proofs                   | Stage spans → audit record                | Verifies trace completeness; rejects unsigned spans                  | Cache signer keys locally; cache recent audit receipts                                     | Batch writes to ledger (up to 512 records or 500 ms)                    | Stream trace exports to APM + SIEM continuously                                              | 25 ms      | 70 ms      |

### Budget rationale

- **End-to-end target (p95)**: ~1.88s across all stages assuming parallelized execution for stages 4–8 where applicable. Sequential fallback remains under 3s.
- Budgets include interface overhead (serialization, network, auth) and should be revisited after each major release.

## Caching, batching, and streaming guardrails

- **Cache invalidation**: invalidate on mutation events (graph updates, model version bumps) and after provenance ledger confirmation. Enforce distributed cache TTL hygiene via config flags per tenant.
- **Batch sizing**: autotune using EWMA of queue depth and observed p95; hard caps listed above to avoid tail blowups.
- **Streaming**: prefer server-sent events or WebSockets for user-facing flows; gRPC streaming for service-to-service. Apply backpressure via token buckets aligned to per-tenant SLOs.

## Bottleneck trace examples

- **Example 1: Enrichment hot-spot**
  - Symptom: p95 at Stage 2 spikes to 900 ms with elevated cache miss rate.
  - Trace spans: `ingest.normalized` → `enrichment.lookup` → `enrichment.write-through` shows long external call to threat-intel provider.
  - Action: enable fallback to secondary provider, raise dynamic batch ceiling to 96 temporarily, and warm the read-through cache via prefetch job.
- **Example 2: Embedding GPU cold start**
  - Symptom: Stage 4 p95 > 1.2s with `model.load` spans dominating.
  - Trace spans: `orchestrator.run` → `ml.embed` → `gpu.warm_pool.miss`.
  - Action: increase warm-pool floor by 2 pods, pin autoscaler min replicas during peak windows, and enable result cache for deterministic text segments.
- **Example 3: Indexer shard congestion**
  - Symptom: Stage 5 p95 climbs to 600 ms with retry storms.
  - Trace spans: `search.index` → `segment.upload` → `storage.flush` with multiple retries.
  - Action: rebalance shards, widen batch commit window to 150 ms, and enable streaming upload with incremental flush to reduce retry surface.

## Remediation plan

1. **Detection**: Alert when any stage exceeds p95 budget by >20% for 5 minutes. Emit budget-utilization metrics per stage (`latency.p95 / budget.p95`).
2. **Triage**: Auto-attach recent traces and cache hit/miss dashboards to incidents. Classify whether pressure is compute (CPU/GPU), I/O (DB/index), or network.
3. **Mitigation playbooks**:
   - **Compute-bound**: scale warm pools, enable dynamic batching, lower max concurrent sessions per worker.
   - **I/O-bound**: switch to streaming mode, widen batch windows, route to secondary shards/providers, prime caches.
   - **Network-bound**: enforce connection pooling, enable retries with jitter, and lower payload size via compression/partial responses.
4. **Stabilization**: Once p95 within 10% of budget, roll back temporary caps, revert elevated batch sizes, and run post-incident load test.
5. **Prevention**: Update stage budgets based on new baselines, add golden signals to regression suite, and capture remediation steps in runbooks.

## Forward-looking optimizations

- **Adaptive stage skipping**: learn per-query minimal stage set (e.g., bypass Stage 4 for structured lookups) using reinforcement signals.
- **Cross-stage speculative execution**: precompute embeddings and search candidates while query planning runs, then reuse if plan selects those paths.
- **Proactive cache warming**: schedule tenant-aware warming ahead of expected spikes using predictive models from historical traces.
