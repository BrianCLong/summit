# IntelGraph — Sprint 3 Plan (Guardrails & Explainability) + Sprint 4 Preview

**Status recap (from v2):** Guardrails landed — GraphRAG endpoint exposed in schema, PBAC/ABAC deny-by-default active, persisted queries enforced with prod introspection disabled, health/metrics live, rate limiting configured.

---

## Verification checklist (tie-off validation before Sprint 3 work starts)

-

> Gate: No Sprint 3 work merges until all boxes are green in CI. No Sprint 3 work merges until all four boxes are green in CI.

---

## Sprint 3 (Weeks 1–2): Guardrails On, Explainability True

### Goals

1. **Explainability UI**: Render `why_paths` overlays with path selection & details.
2. **LLM Output Contracts**: **Implemented** (Zod in `GraphRAGService.ts`); extend with metrics + negative tests.
3. **Multi‑tenant Safety**: End-to-end tenant scoping (claims → policy → DB queries).
4. **Similarity Search**: `similarEntities(entityId|text, topK)` live and fast.

### Non‑Goals

- Full CRDT collaboration; we stay with LWW + idempotency.
- Advanced path ranking beyond support score (basic weighting only).

---

### Workstream A — Explainability UI (why_paths overlay)

**User story**: As an analyst, when I ask Copilot a question, I can see _exactly_ which entities and edges supported the answer, explore the paths, and copy a human‑readable explanation.

**Tasks**

- A1. Graph overlay: highlight edges & nodes for the currently selected path; dim unrelated elements (layered z-index, hit testing preserved).
- A2. Paths panel: sortable list by `supportScore`; show path length, involved entities, edge labels.
- A3. Hover/Click tooltips: entity/edge cards with titles, types, and citations; keyboard navigation.
- A4. Export: copy-to-clipboard of explanation text + IDs; JSON export of `why_paths` for notes.
- A5. E2E: Update “Golden Path” to assert overlay renders for a known query (seeded case).

**Acceptance Criteria**

- Selecting a path highlights ≤ 200 elements at 60fps on demo seed.
- Accessibility: keyboard focus order & ARIA for the path list.
- E2E proof: test matches expected path count and a known edge id.

**Deliverables**

- `ui/components/ExplainabilityPanel.tsx`
- `ui/graph/overlays/WhyPathsOverlay.tsx`
- Playwright spec `e2e/explainability.spec.ts`

---

### Workstream B — JSON Schema Enforcement (GraphRAG)

**Status**: Core contract **implemented** with Zod in `GraphRAGService.ts`.

**Design**: Keep temperature 0 and strict validation; reject non‑conforming responses; add metrics + fallback user message.

**Schema**

```ts
Answer = {
  answer: string,
  confidence: number,            // 0..1
  citations: { entityIds: string[] },
  why_paths: Array<{
    from: string,                 // entity id
    to: string,                   // entity id
    viaEdgeIds: string[],         // graph edge ids
    supportScore: number          // 0..1
  }>
}
```

**Tasks**

- B1. Add metrics: `graphrag_schema_failures_total` and `graphrag_cache_hit_ratio`.
- B2. Unit tests for validator with good/bad payloads.
- B3. Fallback: when validation fails, return a friendly error with a trace id; no partials.

**Acceptance Criteria**

- Invalid generations → 400 within 50ms; friendly error text includes trace id.
- Cache hit path returns in < 20ms server time; metrics visible in Grafana.

---

### Workstream C — Multi‑tenant Safety

**Design**: Thread `tenantId` from `jwt.claims.tenant` through GraphQL context → policy input → Neo4j/PG queries. Deny on mismatch in OPA.

**Tasks**

- C1. Context threading: ensure every resolver has tenant from claims.
- C2. Policy: add `tenantMatches(resource.tenant)` rule; deny on false/missing.
- C3. Data layer: add `WHERE entity.tenant = $tenant` to Cypher; add `tenant_id` to PG queries for embeddings/similarity.
- C4. Tests: dual-tenant fixtures; cross-tenant read/write attempts must fail.

**Acceptance Criteria**

- 100% resolvers covered; mutation & query cross-tenant attempts → deny.
- E2E playwright test performing cross-tenant fetch → 403.

---

### Workstream D — Similarity Search (pgvector HNSW)

**Design**: Resolver `similarEntities(entityId?: ID, text?: String, topK: Int = 10)`; either embed `text` or fetch entity embedding; ANN via HNSW; cache by `(embeddingHash, topK)`.

**Tasks**

- D1. Resolver & service with ANN query.
- D2. Cache layer (Redis) + TTL; expose hit metric.
- D3. UI affordance in entity drawer with preview list.
- D4. Load test with demo data.

**Acceptance Criteria**

- p95 < 100ms on demo; correctness sanity via known neighbors.
- Negative paths (missing embedding) handled with 422.

---

### Observability & Ops tie-ins (cross‑cutting)

- EX1. Client → server `traceparent` propagation; parent OTel spans in resolvers.
- EX2. Grafana panel JSON: resolver p95, Neo4j latency, LLM duration, cache hit ratio, rate‑limit trips.
- EX3. Alert rules (warning): schema validation failures > 1/min for 5 min.
- EX4. **Dashboards import**: check in Grafana JSON under `ops/grafana/*.json` and document import steps.
- EX5. **CI required status**: add `test:golden-path` to branch protection required checks.

---

### PRs & Branches (ready to open)

1. **ui/explainability-overlay** — Overlay + paths panel + E2E
2. **ai/graphrag-schema-guard** — Metrics + tests + friendly fallback (contract already in place)
3. **security/tenant-scoping** — Context threading + OPA rule + query filters + tests
4. **ai/similar-entities** — Resolver + ANN + cache + UI hook
5. **obs/traceparent-dashboards** — Link + spans + Grafana JSON + alert
6. **ci/required-golden-path-status** — Make `npm run test:golden-path` a required status check
7. **ops/prod-persisted-queries** — Enforce `PERSISTED_QUERIES=1` in prod deployment manifests

Each PR includes: checklist, AC, “How to test locally,” roll‑back plan.

---

### Definition of Done for Sprint 3

- Golden Path E2E asserts explainability overlay.
- Persisted ops & ABAC still enforced (green in CI); prod posture unchanged.
- New metrics visible; minimal alerting configured.

---

## Sprint 4 (Weeks 3–4): Relevance, Quality, & Analyst UX

### Goals

- Better answers (ranked paths, answer grounding UI), richer ingestion/ER, and smoother analyst workflows.

### Workstreams

- **R1. Path Ranking v2**: weight by path length, edge types, node centrality; expose `score_breakdown` in API; UI toggle for ranking strategy.
- **R2. Entity Resolution v1**: deterministic ER on name/email/url; add `canonical_id`; background merge job; audit log for merges/splits.
- **R3. Ingestion Connectors**: CSV/Parquet drop + minimal Slack/Confluence stubs; map to entity types; per‑tenant namespaces.
- **R4. Investigation Templates**: seed templates for common questions; persisted op ids pre‑wired; “duplicate to my tenant.”
- **R5. Cost Governance**: per‑tenant monthly budget with soft cutoff → retrieval‑only; dashboards per tenant.

**Acceptance Criteria (Sprint 4)**

- Path ranking demonstrably improves top‑1 path alignment on seed by ≥15%.
- ER merges reduce duplicate rate by ≥30% on demo seed.
- Connector ingest to graph in < 5 min for 50k rows; per‑tenant isolation holds in tests.

---

## Test Plan (S3–S4)

- Unit: schema validator, policy decisions, ANN query planner.
- Integration: tenant‑scoped resolvers, similarity results, GraphRAG cache.
- E2E: Golden Path + explainability; cross‑tenant denial; persisted‑ops unknown id test.
- Load: k6 target 100 RPS mixed; watch p95 + rate‑limit behavior.

---

## Rollout & Safety

- Feature flags: `EXPLAINABILITY_UI`, `SIMILARITY_API`, `TENANT_SCOPE_STRICT`.
- **Prod posture**: `PERSISTED_QUERIES=1`; introspection disabled; Playground off.
- Canary in staging for 24h with alert thresholds.
- Revert plan: flags to off; server rollback via last green SHA.

---

## Risks & Mitigations

- **LLM schema brittleness** → strict validation + cache + fallback message.
- **Tenant query gaps** → resolver lint rule requiring tenant predicate; CI test enforces.
- **ANN drift** → periodic rebuild and recall spot‑checks on seed.

---

## Demo script (end of Sprint 3)

1. Ask Copilot a seeded question → answer appears.
2. Toggle explainability paths; click 1–2 paths; copy explanation.
3. Open an entity → view similar entities → navigate.
4. Attempt cross‑tenant read in a private window → denied.
5. Show Grafana panel with end‑to‑end trace and cache hit ratio.
