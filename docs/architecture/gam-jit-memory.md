# GAM-style JIT Memory for Summit

## Problem: Context Rot

- Long contexts accumulate noise and cost, degrading answer quality even when context windows grow.
- Prior summarization pipelines lose signal over time; important early facts become unreachable.
- Multi-tenant isolation and cost controls are required to keep retrieval safe and predictable.

## Proposed Architecture

- **Dual Agents**
  - **Memorizer**: Converts sessions into lossless decorated pages, emits lightweight memos, and updates hybrid indices.
  - **Researcher**: Builds just-in-time context through an iterative loop (plan → parallel search → integrate → reflect).
- **Stores**
  - **PageStore**: Lossless page archive with decorated headers; authoritative source of truth.
  - **MemoryStore**: Lightweight memo snapshots to seed planning; no aggressive summarization.
- **Hybrid Retrieval**
  - Dense embeddings + BM25 lexical + direct page-id/adjacency lookups.
  - Tenant-scoped indices; no cross-tenant fan-out.
- **Context Output**
  - Compact **BriefingContext**: executive summary, key facts, open questions, evidence with page IDs, excerpts, retriever type, and scores.

## Data Model

- **Session**: `{ id, tenant_id, agent_id?, classification[], policy_tags[], created_at, metadata }`
- **Page**: `{ id, session_id, tenant_id, sequence, raw_content, memo?, embedding?, tags[], classification[], policy_tags[], metadata }`
- **Header (decorated)**: `{ sessionId, tenantId, agentId?, sequence, createdAt, memoSnapshot?, tags?, classification?, policyTags?, originRunId?, requestIntent? }`
- **Memo**: small snapshot stored alongside pages (memo field + metadata.memo_version).
- **PageIndex entry**: `{ pageId, sessionId, tenantId, text, memo?, tags[], embedding? }` (materialized in hybrid indices).

## Retrieval Plan & Tool Interfaces

- **PlanAction**: `{ tool: 'bm25' | 'dense' | 'page_id', query?: string, pageIds?: string[], k: number, note?: string }`
- **SearchResult**: `{ pageId, sessionId, tenantId, score, retrieverType, excerpt }`
- **IntegrationState**: `{ briefingDraft: string, keyFacts: string[], openQuestions: string[], usedPages: string[] }`
- **ReflectionDecision**: `{ done: boolean, missingInfo?: string }`

## Researcher Loop

1. **Plan**: use request + latest memo to emit a set of PlanActions (bm25 + dense + direct ids).
2. **Search (parallel)**: execute actions across hybrid indices; dedupe + tenant-filter.
3. **Integrate**: fold results into an updated IntegrationState and evidence list.
4. **Reflect**: decide whether more evidence is needed (budget-aware); iterate until done or exhausted.

## Context Build Output Schema

```json
{
  "executiveSummary": "string",
  "keyFacts": ["string"],
  "openQuestions": ["string"],
  "evidence": [
    { "pageId": "string", "excerpt": "string", "relevanceScore": 0.0, "retrieverType": "bm25" }
  ],
  "tokensUsed": 0,
  "reflectionSteps": 0,
  "pagesUsed": 0
}
```

## Security, Tenancy, and Retention

- All operations require `tenantId`; repository helpers enforce tenant equality.
- Hybrid indices are partitioned per tenant; page-id lookups reject cross-tenant ids.
- Sensitive tags/classification propagate from headers into index metadata.
- Retention uses existing `memory_pages`/`memory_sessions` lifecycle; headers preserved in `raw_content` and `metadata`.

## Cost Controls & Test-Time Scaling Knobs

- `maxPages` per build step (default 8, hard cap 32).
- `maxReflectionDepth` to bound researcher iterations (default 2, cap 5).
- `maxOutputTokens` used to truncate briefing payloads deterministically.
- Token-aware counters: `gam_pages_used`, `gam_context_tokens_out` metrics and per-run accounting.

## APIs

- **POST `/memory/ingest_session`**: `{ tenantId, agentId?, sessionId?, title?, description?, classification?, policyTags?, turns: [{ role, content, timestamp?, metadata? }], metadata? }`
  - Returns `{ sessionId, memo, pages: [{ id, sequence, header }] }`.
- **POST `/memory/build_context`**: `{ tenantId, agentId?, sessionId?, request, budgets?, mode? }`
  - Returns `BriefingContext` with evidence citations.

## Observability

- Metrics: `gam_ingest_latency_ms`, `gam_build_context_latency_ms`, `gam_retrieval_hits_total{tool=...}`, `gam_pages_used`, `gam_reflection_steps`, `gam_context_tokens_out`.
- Trace spans: `memorizer.memorize`, `memorizer.page`, `researcher.plan`, `researcher.search`, `researcher.integrate`, `researcher.reflect` (OTel tracer `memory-gam`).

## Feature Flag & Rollout

- Env flag `MEMORY_GAM_ENABLED` (default off). Routes return 503 fallback when disabled.
- Safe fallback: existing memory/RAG continues unaffected.

## Operator Notes

- Enable when hybrid indices are warmed; monitor metrics for page counts and reflection loops.
- Budget knobs let operators constrain cost per request; reduce `maxPages` for low-latency paths.
- Failure modes: missing tenantId (rejected), budget exhaustion (partial context with `openQuestions`), disabled flag (503).
