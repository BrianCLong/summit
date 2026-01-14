# IntelGraph — Sprints 3–5 Plan (Now → Next → Later+)

## Sprint 3 (Guardrails On, Explainability True) — 2 weeks

**Objectives**

- Explainability UI with `why_paths` overlay and path panel
- Strict LLM output contracts (metrics + friendly fallback)
- Tenant scoping end‑to‑end (claims → policy → queries)
- Similarity API (pgvector HNSW) + UI affordance

**Epics & Key Stories**

- UI: `EXPL-UI-01` Paths overlay + panel; `EXPL-UI-02` Tooltips & copy export; `EXPL-UI-03` E2E assertions
- GraphRAG: `RAG-VAL-01` Zod/Ajv metrics; `RAG-VAL-02` negative tests; `RAG-VAL-03` friendly error+trace
- Security: `TENANT-01` Context threading; `TENANT-02` OPA rule; `TENANT-03` dual‑tenant tests
- Similarity: `SIM-01` Resolver; `SIM-02` cache+TTL; `SIM-03` entity drawer

**Acceptance Criteria**

- E2E “Golden Path” asserts overlay node/edge ids
- Invalid LLM payloads → 400, user sees friendly error with trace id
- Cross‑tenant access attempts → deny; tests pass
- `similarEntities` p95 < 100ms on demo; UI shows neighbors

**Operational**

- Required status: `test:golden-path`
- Prod env: `PERSISTED_QUERIES=1`
- Dashboards: resolver p95, Neo4j, LLM, cache hit, rate‑limit trips

---

## Sprint 4 (Relevance, Multi‑tenant Quality, Analyst UX) — 2 weeks

**Objectives**

- Path ranking v2 (length, type weights, node centrality)
- Entity Resolution v1 (deterministic keys; merge/split audit)
- Ingestion connectors (CSV/Parquet drop; STIX/TAXII stub)
- Cost governance (per‑tenant budgets, circuit breaker)

**Epics & Key Stories**

- Ranking: `RANK-01` score breakdown; `RANK-02` UI toggle; `RANK-03` eval harness
- ER: `ER-01` canonical_id; `ER-02` merge/split job; `ER-03` audit log
- Ingest: `ING-01` CSV/Parquet mapper; `ING-02` STIX/TAXII stub; `ING-03` retry/resume
- Cost: `COST-01` budgets; `COST-02` token caps; `COST-03` retrieval‑only degrade

**Acceptance Criteria**

- Top‑1 path alignment improves ≥15% on seed eval set
- Duplicate rate reduced ≥30% on demo dataset
- 50k rows ingest < 5 min; per‑tenant isolation preserved
- Budget overage degrades to retrieval‑only; metrics exposed

**Operational**

- Feature flags: `ER_V1`, `RANKING_V2`, `COST_BUDGETS`
- Data quality: ER audit report in `/monitoring/metrics`

---

## Sprint 5 (Enterprise Readiness & Scale) — 2 weeks

**Objectives**

- Real‑time collaboration v1.5 (LWW + conflict UI, opt‑in CRDT for hotspots)
- Security posture: secrets policy, rate‑limit tuning, SOC2‑lite checklist
- Ontology governance + templates (analyst‑ready graph kits)
- Partner integrations (Slack export → investigation seeding; Confluence report embeds)

**Epics & Key Stories**

- Realtime: `RT-03` conflict banner + idempotency keys; `RT-04` CRDT pilot on notes
- Security: `SEC-04` SOPS/SealedSecrets; `SEC-05` role rate limits; `SEC-06` prod headers CI check
- Ontology: `ONTO-01` versioned ontology; `ONTO-02` migration scripts; `ONTO-03` template packs
- Integrations: `INT-01` Slack export → seed; `INT-02` Confluence embed; `INT-03` webhook auth

**Acceptance Criteria**

- Concurrent edits: no dup writes; conflicts surfaced; CRDT pilot stable
- Secrets scanned in CI; unencrypted .env fails pipeline
- Ontology change produces versioned migration, zero data loss on seed
- Slack export creates investigation with entities/edges; Confluence shows live explainability panel

**Operational**

- Game days: latency spike + link‑layer failure + stale schema drill
- SLOs: GraphQL non‑LLM p95 < 300ms; GraphRAG cached p95 < 300ms / cold < 2.5s

---

## Backlog (Later/parking lot)

- Path ranking v3 (learning‑to‑rank over analyst clicks)
- CRDT everywhere (if/where justified by collision rates)
- Multi‑lang UI and timezone‑aware explainability text
- Neo4j sharding plan & read replicas

## Demo Scripts

- S3: Ask → paths overlay → similar entities → cross‑tenant denial → dashboards
- S4: Same query, toggle ranking strategies → ER merge audit → ingest CSV → budget trigger
- S5: Concurrent edit conflict UI → Slack export → Confluence view → secrets check failure in CI
