# Memory Layer v1 (Vector + Temporal Graph + Execution Log + Episodic)

## Purpose and scope

Memory Layer v1 operationalizes a composable memory strategy for Summit agents. The design aligns with the MarkTechPost guidance that no single memory type is sufficient: execution/event logs remain the authoritative ground truth, while vector, temporal graph, and episodic memories provide complementary retrieval paths with known failure modes and mitigations.

## Roles and authority of each memory layer

- **Execution/Event Log (authoritative)**
  - Immutable, append-only record of tool calls, prompts/responses, and internal transitions.
  - Stores idempotency keys, span/trace identifiers, parent/child relationships, and checkpoint pointers.
  - Checkpoints capture serialized agent/node state for replay or branching. Replay must honor side-effect safety (replay flag + idempotency checks + compensation hooks).
- **Vector Memory (semantic index)**
  - Fast semantic entry point across curated artifacts (user/agent messages, tool outputs, summaries, docs).
  - Non-authoritative; must validate tenant/run/thread identifiers before reuse.
  - Supports optional rerank hooks for constraint-aware recall.
- **Temporal Graph Memory (entity + time projection)**
  - Projects events into entity-centric, temporal, and multi-hop relationships (Entities, Events, Episodes).
  - Enables queries such as "latest state of X" and temporal diffs while warning when projection lags the log watermark.
  - Schema versioning and projection watermarks protect against drift.
- **Episodic Memory (workflow-level recall)**
  - Groups related runs/tasks into episodes with metadata (participants, tools, outcomes) and summaries linked to log pointers and graph nodes.
  - Supports case-based recall and similarity search constrained by tenant/scope.

**Authority rules:**

- Answers and root-cause investigations MUST cite execution logs/checkpoints as the source of truth.
- Vector and graph outputs are treated as indexes/projections; discrepancies defer to the log.
- Episodic recall references logs and graph before acting.

## Retrieval composition and routing

- "What happened?" → Execution/Event Log (with checkpoints) for chronological replay.
- "Entity + time" or multi-hop reasoning → Temporal Graph; fallback to execution log when projection is stale.
- "Semantic doc recall" → Vector index; enforce tenant/run/thread filter and constraint rerank before use.
- "Similar past case" → Episodic store (metadata + vector summary) → supporting execution log slices → optional graph expansion.
- Routing is encapsulated by the MemoryRouter, which emits a retrieval plan per query type and encodes required identifiers and safety filters.

## Failure modes and mitigations

- **Semantic drift (vector):**
  - Store tenant/run/thread identifiers alongside embeddings; validate before use.
  - Keep constraint snippets (guardrails, compliance requirements) as separate high-priority records and always merge into the response.
  - Add rerank hooks that down-rank cross-tenant/incorrect-thread hits.
- **Stale edges / projection lag (graph):**
  - Maintain a projection watermark (timestamp + schema version).
  - Expose lag metrics and warn or fallback to logs when lag exceeds SLO.
  - Rebuild edges on schema upgrades; tag nodes/edges with schema version.
- **Log bloat (execution log):**
  - Partition by tenant/run/thread; apply TTL/archival policies that never delete audit-critical data without an approved policy.
  - Offer filtered tails and pagination to bound query cost.
- **Unsafe replay / side effects:**
  - Enforce idempotency keys for tool calls.
  - Honor a replay-mode flag that blocks external side effects unless explicitly whitelisted.
  - Provide compensation hooks to reconcile partial side effects.
- **Checkpoint drift:**
  - Version checkpoints; store parent checkpoint identifiers to support branching and diffing.
  - Validate checkpoint schema before reuse; reject incompatible versions.

## Retention, compaction, and policy

- Execution logs: partition + archive; policies must keep authoritative audit records. Provide compacted views (e.g., trimmed tool args) while retaining raw copies.
- Vector index: re-embed on schema/model changes; prune expired artifacts using tenant policies; maintain provenance pointers.
- Temporal graph: periodic re-projection from logs when schema changes; archive old graph snapshots when watermarks advance.
- Episodic store: TTL based on business policy; preserve episode-to-log pointers for auditability even after summary compaction.

## Schema versioning

- Maintain explicit schema version fields:
  - Execution log and checkpoint schema versions in metadata.
  - Graph projection `schemaVersion` node/edge attribute + migration notes.
  - Vector index embedding model/version stored per record.
  - Episodic summaries tagged with summarizer version and constraint set.
- Backward compatibility rules: new readers must tolerate older versions; writers append-only and include version in every artifact.

## Access control and multi-tenancy

- Every API/query path accepts `tenantId` and enforces RBAC at the store layer.
- Vector and graph results must be filtered by tenant/workspace/run context before return.
- Cross-tenant contamination is treated as a critical defect; add audits around upsert/query paths.

## Observability and reliability

- Emit OTel spans for event append, checkpoint creation, vector upsert/query, graph projection, and episodic recall.
- Track watermarks/lag for graph projection; alert on SLO breaches.
- Capture replay-mode toggles and compensation invocations in the execution log for auditability.

## Interfaces and implementation notes

- **ExecutionLogStore**: append-only event ingestion, tail queries, flexible filters, checkpoints, and branching from checkpoints.
- **VectorIndex**: upsert/queryTopK with optional rerank hook; embeds provenance and tenant scoping.
- **TemporalGraphStore**: upsert projection, query by entity/time, and traversal for multi-hop reasoning.
- **EpisodicStore**: create/close/summarize episodes and recall by metadata or semantic similarity.
- **MemoryRouter**: emits retrieval plans per query type, pre-validating required identifiers and defaulting time windows and k-nearest parameters.

## Admin/runbook notes (v1)

- To debug a bad plan: fetch execution log events for the run/thread, verify checkpoints, then compare against graph projection watermark. If projection lags, replay projector from the last checkpoint. Use vector recall only after tenant/thread validation.
- Replay safely: enable replay mode, require idempotency keys, and register compensation handlers before dispatching tool calls.
