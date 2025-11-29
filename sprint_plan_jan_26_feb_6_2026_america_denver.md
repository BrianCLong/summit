# Sprint 17 — Federation & Findability (Jan 26–Feb 6, 2026)

**Theme:** Connect multiple data estates and make evidence instantly discoverable with federated graph traversal, hybrid search, and zero-trust hardening tuned for shared environments.

## Sprint Goals
- **Federated Graph (MVP):** Query across multiple Neo4j databases/tenants as one logical, read-only graph.
- **Cross-Source Search:** Provide unified lexical + vector search over nodes, edges, and documents with instant entity/evidence drill-down.
- **Zero-Trust Hardening:** Enforce workspace-level ABAC, per-graph OPA policies, and scoped API tokens.
- **Performance & Cost:** Route efficiently with fallbacks, cache common federated traversals, and guard against fan-out.

## Epics and Stories (DoD included)
### Epic A — Federated Graph (read-only)
- **A1. Routing Layer (Node/Apollo):** Query planner/splitter, per-graph driver pool, timeout + circuit breaker.
  - **DoD:** Cross-graph `neighborhood()` works against 2+ graphs; p95 latency budget documented.
- **A2. Virtual Joins (stitch):** Join entities across graphs using deterministic keys (e.g., `email`, `govIdHash`).
  - **DoD:** ≥95% of gold join pairs resolved; non-matches return explainable “no join key.”
- **A3. Read Guards:** Enforce workspace/tenant scopes at route time; deny if any sub-query fails policy.
  - **DoD:** Policy unit tests; mixed-scope query is rejected with actionable reason.

### Epic B — Cross-Source Search (lexical + vector)
- **B1. Indexer (ETL job):** Emit `SearchDoc{type,id,title,text,tags,embedding,licenseId}` from graphs and blobs.
  - **DoD:** 100% nodes with `name/alias` searchable; documents chunked ≤1k tokens; lineage recorded.
- **B2. Search API:** BM25 (Postgres pg_trgm) + ANN (FAISS or pgvector); hybrid rerank; filters by license/workspace.
  - **DoD:** Top-5 recall ≥0.9 on eval set; latency p95 ≤300ms on warm cache.
- **B3. UI: Global Search Bar:** Instant results, keyboard nav, “open in tri-pane,” and “add to case.”
  - **DoD:** ≤150ms keystroke-to-suggest on 50k items; accessible (ARIA labels, focus traps).

### Epic C — Zero-Trust & Tokens
- **C1. Workspace ABAC:** Propagate `workspaceId`, `caseRole`, and `purpose` to every resolver.
  - **DoD:** Access matrix tests; log who/what/why/when.
- **C2. Scoped API Tokens:** Personal + service tokens with scopes (`read:graph:x`, `search`, `export`), expirations, and rotation.
  - **DoD:** Token CRUD, audit, and revocation; leak-resistant logs.
- **C3. OPA per-graph bundles:** Allow/deny rules fetched per workspace; hot-reload with checksum.
  - **DoD:** Simulated rule flip affects requests within ≤5s.

### Epic D — Performance & Cost Guardrails
- **D1. Fan-out breaker:** Cap cross-graph expansion by `maxGraphs`, `maxEdges`, and wall-clock.
  - **DoD:** Runaway queries return 429 + hint; Prom/Grafana show breaker triggers.
- **D2. Result cache:** Redis for `(queryHash, workspaceId)` with short TTL; stampede protection.
  - **DoD:** ≥2× speedup on repeated federated neighborhoods.

## Interfaces & Exemplars
- **GraphQL extensions**
  - `SearchHit` type and `federatedNeighborhood` / `search` queries supporting workspace scoping and filters.
- **Federated router (Node/Apollo)**
  - Per-graph driver pools, request-scoped abort handling, timeout envelopes, and circuit breaker wrappers.
- **Cypher deterministic join keys**
  - Emit stable join keys (email/govIdHash) and return annotated graph slices capped for safety.
- **Hybrid search reranker (FastAPI)**
  - Weighted fusion of BM25, vector similarity, freshness, and license penalty signals with normalized features.
- **Frontend global search wiring**
  - Instant suggestions, keyboard navigation, tri-pane open, and case attachment.
- **Postgres hybrid search schema**
  - `search_docs` table with GIN trigram text index, IVFFLAT vector index, and workspace/license filters.

## Acceptance & Demo Plan
1. **Federated query:** Choose Graph A + Graph B, run 2-hop neighborhood, and show stitched duplicates (email/govIdHash) with p95 ≤2.5s.
2. **Search:** Type “Acme Holdings” for instant suggestions; open entity in tri-pane; add top doc as evidence to a case.
3. **Zero-trust:** Attempt cross-workspace query → blocked with clear reason; OPA policy flip takes effect live.
4. **Perf guard:** Run query that would fan out to 5 graphs → breaker returns 429 + hint; dashboard shows breaker metrics.

## Risks & Mitigations
- **Join key collisions/misses:** Expose join-key report, allow analyst manual link with audit, and fall back to similarity review.
- **Fan-out latency:** Early termination, parallelism caps, per-graph timeouts, and short-TTL result cache.
- **Policy drift across graphs:** Per-workspace OPA bundles with checksum + hot reload; deny on uncertainty.
- **Vector privacy/licensing:** Store embeddings per workspace; apply license penalties at rerank; redact restricted snippets.

## Tracking Artifacts
- **Branches:** `feature/federated-graph`, `feature/hybrid-search`, `feature/zero-trust-tokens`, `feature/fanout-guard`.
- **Labels:** `area:federation`, `area:search`, `area:security`, `type:feature`, `needs:perf-bench`.
- **CI/CD gates:** Router contract tests, search eval harness (gold queries), OPA policy tests, k6 fan-out load test.

## Exit Metrics
- **Federation:** p95 federated neighborhood ≤2.5s across 2 graphs (seeded set); stitch precision ≥0.95.
- **Search:** Top-5 recall ≥0.9; suggest TTI ≤150ms; query p95 ≤300ms.
- **Security:** 100% sensitive queries carry `workspaceId` + `purpose`; token rotation verified; OPA hot-reload ≤5s.
- **Cost/Ops:** ≥2× speedup on repeated federated queries due to cache; breaker prevents ≥95% runaway fan-outs.

## Quick Answers to Execution Questions
1. **Graphs to federate first:** Start with the **Case Intelligence graph (primary investigative data owner, ~40M nodes)** and the **Open Corporates enrichment graph (third-party data owner, ~25M nodes)**. They are already partitioned per tenant and expose deterministic identifiers. Candidate join keys: `email` and `govIdHash` for persons; `taxId`/`registrationNumber`/`lei` for organizations; `domain` for assets.
2. **ANN engine choice:** Prefer **pgvector** in this environment to co-locate lexical and vector search in Postgres, simplify deployment/ops, and leverage shared workspace/tenant filters; FAISS sidecar remains a fallback for offline re-rank experiments.
3. **Token scope/expiry requirements:** Use **scoped tokens** with least-privilege defaults and **max lifetime of 90 days** (service tokens ≤30 days), mandatory rotation with **7-day overlap grace**, auditable `purpose` claims, and per-scope rate limits. Tokens must encode workspace scope, optional case binding, and `read:graph:x/search/export` style scopes; enforce revocation list checks on every call.
