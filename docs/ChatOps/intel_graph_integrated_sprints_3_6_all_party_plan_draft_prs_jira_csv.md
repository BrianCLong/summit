# IntelGraph — Integrated Sprints 3–6 (All‑Party Plan + Draft PRs + Jira CSV)

**Scope:** Combines Guy’s v4–v6 velocity focuses (tenant safety, performance, realtime, security ops) with unnamed‑party concerns (PsyOps/cognitive warfare readiness, HUMINT/TECHINT integration, Zero‑Trust, pilot deployment). Single source of truth for execution.

---

## Stakeholder Guardrails (merged)

- **Guy (Platform):** multi‑tenant safety, deterministic systems (LWW→CRDT), performance at scale, typed contracts, OTel+Prom, persisted ops, ABAC/OPA everywhere.
- **Intel/CTI SMEs (X/Y/Z):** HUMINT/TECHINT modeling, influence & cognitive ops, provenance/confidence, coalition enclaves, redaction and retention.
- **Ops/Compliance:** Zero‑Trust mesh, STIG/ATO‑lite trajectory, auditability, DR drills.
- **Analyst Experience:** explainability (`why_paths`), annotations, dashboards, TTP overlays, saved queries, similarity, mission lenses.

---

# SPRINT 3 — Graph Intelligence + Explainability Foundation (2 weeks)

**Objectives**

1. Explainability UI overlay for `why_paths` + Golden Path E2E proof.
2. JSON‑schema enforcement (already implemented) → add metrics + friendly fallback.
3. Tenant scoping E2E (context→policy→DB), persist enforced.
4. Schema evolution seeds for intel realism: confidence scoring (entity level), new edge types (temporal, trust, behavioral).

**Workstreams**

- **EXPL‑UI:** overlay, paths panel, tooltips, copy/export; E2E asserts path ids.
- **RAG‑VALIDATION:** Zod/Ajv metrics (`graphrag_schema_failures_total`), negative tests, fallback with trace id; cache hit metric.
- **TENANT‑SAFE:** thread `tenantId`; OPA rule `{ user.tenant == resource.tenant }`; filters in Cypher/SQL; dual‑tenant tests; PQ manifests per tenant.
- **SCHEMA‑SEEDS:** add `confidence: {provenance, corroboration, analyst}`; edge labels `:TEMPORAL`, `:TRUST`, `:BEHAVIORAL` (non‑breaking additions).

**AC**

- Overlay renders expected edge ids on seed; keyboard accessible.
- Invalid LLM payload → 400 and user‑facing friendly error with trace id.
- Cross‑tenant read/write attempts denied; Playwright test passes.
- New properties present without breaking queries; migrations documented.

---

# SPRINT 4 — Tenant Safety, Performance & Threat/TTP Overlay (2 weeks)

**Objectives**

1. Hard tenant isolation across API/Neo4j/Postgres/Redis.
2. 30%+ p95 gains on top 5 endpoints via **neighborhood cache** + **Neo4j indexing/hints**.
3. **Threat/TTP overlay**: ATT&CK mapping + alerting beta; initial influence‑ops mapping hooks.
4. **Cytoscape LOD** for >50k elements.

**Workstreams**

- **MULTI‑TENANT:** enforce ctx tenant everywhere; OPA tests; PQ per‑tenant namespace.
- **NEIGHBOR‑CACHE:** Redis cache for `expandNeighborhood(entityId, radius)` with tag‑based invalidation; hit/latency metrics.
- **NEO4J‑INDEXING:** composite indexes; PROFILE‑driven hints; top query rewrites.
- **TTP‑ENGINE (beta):** entity→behavior linking; ATT&CK/CAPEC correlation; alert scoring fields.
- **LOD‑UI:** hide labels on zoom‑out; defer styles; throttled layouts.

**AC**

- No cross‑tenant reads/writes in tests; PQ manifests segregated by tenant.
- Hot endpoints p95 ↓ ≥30%; dashboards updated.
- Threat overlay presents correlated TTP nodes/edges; alert triage view exists.
- > 50k elements remain interactive; <16ms/frame target at LOD‑0.

---

# SPRINT 5 — Realtime Collaboration, Secure Sharing & Analyst Toolkit (2 weeks)

**Objectives**

1. Realtime LWW + idempotent ops; conflict telemetry + toasts.
2. Presence rooms and avatars; ghost sessions <0.5%/24h.
3. Collaborative annotations with confidence tags; secure sharing v2 (enclaves: US‑Only, 5‑Eyes, NATO, NGO).
4. Custom intel dashboards; mini red‑team inject (deepfake/narrative distortion) to validate pipeline.

**Workstreams**

- **RT‑LWW:** version clocks; `x-op-id` idempotency via Redis; arbitration.
- **PRESENCE:** Socket.IO rooms per investigation; Redis heartbeats.
- **ANNOTATE:** per‑edge/entity annotations (`low/med/high/disinfo/coerced`); time‑stamped notes; exportable.
- **SHARING‑V2:** per‑object permissions; enclave flags; audit trails.
- **DASHBOARDS:** widgets (alerts, TTP heatmap, actor timelines, influence score beta).
- **RED‑TEAM:** scripted inject; evaluation rubric.

**AC**

- Duplicate op → no‑op; races settle LWW; metrics exported.
- Presence stable; avatars visible; ghost <0.5%.
- Annotation CRUD with history; sharing rules enforced in tests.
- Collab E2E (2 browsers) passes in CI.

---

# SPRINT 6 — Security, Compliance & Pilot Readiness (2 weeks)

**Objectives**

1. Per‑tenant/per‑user rate limits + adaptive breaker on p95/5xx.
2. DLP/PII: tags + export redaction by role/sensitivity; retention TTL + archival hooks.
3. Backup/DR drill: RPO ≤15m, RTO ≤30m; runbooks.
4. Pilot workflows: ingest at scale (Kafka/Pulsar), mission templates; STIG baselines; Zero‑Trust mesh bootstrap; ATO‑lite prep.

**Workstreams**

- **LIMITS/BREAKER:** tighten ANN/RAG; dashboards for buckets/breaker state.
- **DLP/RETENTION:** sensitivity tags (`public/internal/restricted`, plus `TS/SCI/NOFORN` where applicable); role‑based redaction in exports; TTL policies.
- **DR‑RUNBOOKS:** scheduled snapshots; timed restore rehearsal; incident SOPs.
- **PILOT‑OPS:** Kafka/Pulsar ingestion mode; mission lenses; STIG hardening tasks; ZT mesh (Istio/Consul) bootstrap; compliance checklist start.

**AC**

- Abuse tests 429; breaker opens/closes correctly.
- Exports redact PII by role; PII never logged.
- DR restore within targets; report committed.
- Pilot checklists complete; partner onboarding docs ready.

---

## Observability & SLOs (cross‑cutting)

- Traces: client `traceparent` → GraphQL → Neo4j/PG → worker/LLM.
- Dashboards: resolver p95, Neo4j latency, cache hit, LLM duration, rate‑limit trips, realtime conflict/RTT, DR timings.
- SLOs: GraphQL p95 < 600ms; GraphRAG cached p95 < 300ms / cold < 2.5s; ANN p95 < 100ms demo; socket RTT < 150ms; error budget 99.5%.

---

## Draft PRs — Branches, Titles & Prefilled Bodies

> Run the script below to open **draft PRs** with bodies populated from local files it creates.

```bash
#!/usr/bin/env bash
set -euo pipefail
REPO="BrianCLong/intelgraph" # change if needed

mkdir -p prbodies

cat > prbodies/s3-explainability-ui.md <<'MD'
## Summary
Explainability overlay (why_paths) with paths panel, tooltips, and E2E proof.

## Scope
- [x] Code  - [x] Tests  - [x] Docs  - [x] Dashboards

## Acceptance Criteria
- Overlay highlights expected path/edge ids; keyboard accessible
- Golden Path E2E asserts overlay elements on seeded query

## How to Test
1. `make seed-demo`
2. `npm run e2e:ci` → check `explainability.spec.ts`

## Rollout / Risk
Flags: EXPLAINABILITY_UI. Rollback: disable flag or revert SHA.

## Metrics
- ui_overlay_render_ms
MD

cat > prbodies/s3-rag-validation.md <<'MD'
## Summary
JSON-schema enforcement already in place; add metrics, negative tests, and friendly fallback with trace id.

## Acceptance Criteria
- Invalid generations → 400 with user-friendly message
- Metrics: graphrag_schema_failures_total, graphrag_cache_hit_ratio
MD

cat > prbodies/s3-tenant-safe.md <<'MD'
## Summary
End-to-end tenant scoping across resolvers, Neo4j/PG queries, Redis keys; OPA rule update; PQ per-tenant manifests.

## Acceptance Criteria
- Cross-tenant reads/writes denied; tests pass
- PQ manifest segregated per tenant
MD

cat > prbodies/s4-neighborhood-cache.md <<'MD'
## Summary
Redis neighborhood cache for expandNeighborhood(entityId, radius) with tag-based invalidation.

## Acceptance Criteria
- ≥70% hit on repeat ops; invalidation on mutations; latency histograms exported
MD

cat > prbodies/s4-neo4j-indexing.md <<'MD'
## Summary
Composite indexes and PROFILE-driven query hints for top 5 operations.

## Acceptance Criteria
- p95 ↓ ≥30% on hot endpoints; PROFILE shows index usage
MD

cat > prbodies/s4-ttp-overlay.md <<'MD'
## Summary
ATT&CK/CAPEC correlation and alert scoring fields; triage view (beta).

## Acceptance Criteria
- Overlay visible with correlated nodes/edges; alert triage renders
MD

cat > prbodies/s4-lod-ui.md <<'MD'
## Summary
Cytoscape LOD controls for large graphs; deferred styling and throttled layouts.

## Acceptance Criteria
- >50k elements interactive; label toggles on zoom
MD

cat > prbodies/s5-realtime-lww.md <<'MD'
## Summary
LWW write policy with idempotent ops (`x-op-id`) and arbitration.

## Acceptance Criteria
- Duplicate op → no-op; conflict metrics exported
MD

cat > prbodies/s5-presence.md <<'MD'
## Summary
Socket.IO rooms/avatars; Redis heartbeat; ghost session mitigation.

## Acceptance Criteria
- Ghost sessions <0.5%/24h; presence stable
MD

cat > prbodies/s5-annotations-sharing.md <<'MD'
## Summary
Collaborative annotations (confidence tags) and per-object sharing with enclave flags.

## Acceptance Criteria
- CRUD + history; enforced sharing tests
MD

cat > prbodies/s5-dashboards-redteam.md <<'MD'
## Summary
Analyst dashboards (widgets) and mini red-team inject for pipeline validation.

## Acceptance Criteria
- Widgets render with live data; inject evaluation recorded
MD

cat > prbodies/s6-limits-breaker.md <<'MD'
## Summary
Per-tenant/user rate limits and adaptive circuit breaker; dashboards for buckets/breaker state.

## Acceptance Criteria
- Abuse tests 429; breaker opens/closes as designed
MD

cat > prbodies/s6-dlp-retention.md <<'MD'
## Summary
Sensitivity tags, role-based export redaction, TTL retention and archival hooks.

## Acceptance Criteria
- Exports redact by role; TTL policies enforced; audits present
MD

cat > prbodies/s6-backup-dr.md <<'MD'
## Summary
Timed backup/restore with runbooks; RPO/RTO validation.

## Acceptance Criteria
- Restore within RPO ≤15m / RTO ≤30m; report in /docs/runbooks
MD

# create branches and draft PRs
BRANCHES=(
  "s3/ui-explainability-overlay|feat(ui): explainability overlay + E2E|prbodies/s3-explainability-ui.md"
  "s3/ai-rag-validation|chore(ai): GraphRAG schema validation metrics + fallback|prbodies/s3-rag-validation.md"
  "s3/security-tenant-safe|feat(security): tenant scoping across API/DB/cache|prbodies/s3-tenant-safe.md"
  "s4/perf-neighborhood-cache|feat(perf): neighborhood cache + invalidation|prbodies/s4-neighborhood-cache.md"
  "s4/perf-neo4j-indexing|feat(perf): neo4j indexes + query tuning|prbodies/s4-neo4j-indexing.md"
  "s4/ai-ttp-overlay|feat(ai): threat/TTP overlay (beta)|prbodies/s4-ttp-overlay.md"
  "s4/ui-cytoscape-lod|feat(ui): cytoscape LOD for large graphs|prbodies/s4-lod-ui.md"
  "s5/realtime-lww|feat(realtime): LWW + idempotent ops|prbodies/s5-realtime-lww.md"
  "s5/realtime-presence|feat(realtime): presence rooms + avatars|prbodies/s5-presence.md"
  "s5/ui-annotations-sharing|feat(ui): annotations + secure sharing|prbodies/s5-annotations-sharing.md"
  "s5/ui-dashboards-redteam|feat(ui): dashboards + red-team inject|prbodies/s5-dashboards-redteam.md"
  "s6/security-limits-breaker|feat(security): rate limits + circuit breaker|prbodies/s6-limits-breaker.md"
  "s6/security-dlp-retention|feat(security): DLP redaction + retention|prbodies/s6-dlp-retention.md"
  "s6/ops-backup-dr|chore(ops): backup/restore drill + runbooks|prbodies/s6-backup-dr.md"
)

git fetch origin main
for ITEM in "${BRANCHES[@]}"; do
  IFS='|' read -r BR TITLE BODY <<<"$ITEM"
  git checkout -b "$BR" origin/main || git checkout "$BR"
  # (make minimal change or add WIP commit marker file so PR can open)
  mkdir -p .wip && echo "WIP: $TITLE" > ".wip/${BR//\//-}.txt"
  git add .wip && git commit -m "chore(wip): $TITLE"
  git push -u origin "$BR"
  gh pr create --repo "$REPO" --title "$TITLE" --body-file "$BODY" --base main --head "$BR" --draft
 done
```

> **Note:** Requires `gh` CLI authenticated and `git` configured. The script makes a trivial WIP file to allow opening PRs immediately.

---

## Jira Import CSV — Epics & Stories (S3–S6)

> Import into Jira (CSV). Epics use `Epic Name`. Stories link via `Epic Link`. Customize `Assignee` to match your user keys.

```csv
Issue Type,Summary,Description,Priority,Labels,Epic Name,Epic Link,Sprint,Components,Assignee,Story Points
Epic,Sprint 3: Graph Intelligence + Explainability,"Explainability overlay, schema validation metrics/fallback, tenant scoping, schema seeds (confidence/trust/temporal/behavioral)",High,intelgraph,s3-graph-intel,,Sprint 3,UI;GraphRAG;Security;Schema,Guy,
Story,EXPL-UI: why_paths overlay,"Overlay + paths panel + tooltips; E2E asserts path ids",High,explainability,,s3-graph-intel,Sprint 3,UI,Declan,5
Story,RAG-VALIDATION: metrics + fallback,"Add metrics (schema failures, cache hit); negative tests; friendly fallback with trace id",High,graphrag,,s3-graph-intel,Sprint 3,GraphRAG,Velma,3
Story,TENANT-SAFE: end-to-end scoping,"Thread tenantId; OPA rule; DB filters; PQ per-tenant manifests; dual-tenant tests",Highest,security;multitenant,,s3-graph-intel,Sprint 3,Security,Max,5
Story,SCHEMA-SEEDS: intel realism props,"Add entity confidence fields; new edge types :TEMPORAL,:TRUST,:BEHAVIORAL; migrations",Medium,schema,,s3-graph-intel,Sprint 3,Schema,Astara,3
Epic,Sprint 4: Tenant Safety, Performance & TTP Overlay,"Tenant isolation, neighborhood cache, Neo4j indexing/hints, TTP overlay beta, Cytoscape LOD",Highest,intelgraph,s4-tenant-perf,,Sprint 4,Security;Perf;CTI;UI,Guy,
Story,MULTI-TENANT: enforce & test,"Filters in resolvers/queries; PQ per-tenant; OPA tests",Highest,security;multitenant,,s4-tenant-perf,Sprint 4,Security,Max,5
Story,NEIGHBOR-CACHE: Redis,"Cache expandNeighborhood with tag-based invalidation; metrics",High,perf;cache,,s4-tenant-perf,Sprint 4,Perf,Velma,5
Story,NEO4J-INDEXING: top5 ops,"Composite indexes & PROFILE hints; ≥30% p95 improvement",High,perf;neo4j,,s4-tenant-perf,Sprint 4,Perf,Astara,5
Story,TTP-ENGINE (beta),"ATT&CK/CAPEC correlation; alert scoring fields; triage view",High,cti;overlay,,s4-tenant-perf,Sprint 4,CTI,Clem,8
Story,LOD-UI for >50k,"LOD toggles; deferred styling; throttled layout",Medium,ui;lod,,s4-tenant-perf,Sprint 4,UI,Declan,3
Epic,Sprint 5: Realtime Collaboration & Analyst Toolkit,"LWW + idempotent ops; presence; annotations & secure sharing; dashboards; red-team inject",High,intelgraph,s5-realtime,,Sprint 5,Realtime;UI;Security,Guy,
Story,RT-LWW + idempotent ops,"Version clocks; x-op-id Redis; arbitration; metrics",Highest,realtime,,s5-realtime,Sprint 5,Realtime,Velma,8
Story,Presence rooms + avatars,"Socket.IO rooms; Redis heartbeat; ghost<0.5%",High,realtime;presence,,s5-realtime,Sprint 5,Realtime,Max,5
Story,Annotations + sharing v2,"Confidence tags; per-object permissions; enclave flags; audit",High,ui;sharing;security,,s5-realtime,Sprint 5,UI;Security,Ivy,5
Story,Dashboards + red-team inject,"Widgets (alerts, TTP heatmap, actor timelines); scripted inject and eval",Medium,ui;ops,,s5-realtime,Sprint 5,UI;Ops,Ernestine,3
Epic,Sprint 6: Security, Compliance & Pilot,"Rate limits+breaker; DLP redaction+retention; backup/DR; pilot workflows; STIG/ZT mesh bootstrap",Highest,intelgraph,s6-sec-ops,,Sprint 6,Security;Ops;Compliance,Guy,
Story,Rate limits + adaptive breaker,"Per-tenant/user buckets; ANN/RAG tightened; dashboards",Highest,security;limits,,s6-sec-ops,Sprint 6,Security,Zappo,8
Story,DLP redaction + retention,"Sensitivity tags; role-based export redaction; TTL/archival hooks",High,security;dlp,,s6-sec-ops,Sprint 6,Security,Zappo,5
Story,Backup/restore drill + runbooks,"Timed restore rehearsal; RPO/RTO validation; SOPs",High,ops;dr,,s6-sec-ops,Sprint 6,Ops,Frank,5
Story,Pilot workflows & STIG/ZT bootstrap,"Kafka/Pulsar ingestion; mission lenses; STIG tasks; ZT mesh start; compliance checklist",High,ops;pilot;zt,,s6-sec-ops,Sprint 6,Ops,Guy,8
```

**Import tips:** In Jira, map `Epic Name` for Epics and `Epic Link` for Stories; map `Components` multi‑select delimiter to `;`. Adjust `Assignee` to match directory usernames.

---

## Notes on Compliance & Data Sensitivity

- Data sensitivity tags in team matrix map to export redaction logic and OPA policy inputs.
- Coalition enclave flags respected in sharing (Sprint 5) and access checks.

---

## Definition of Done (global)

- All new code behind flags; Golden Path E2E + new E2E(s) pass in CI; persisted ops enforced in prod.
- ABAC/OPA on all resolvers; deny‑by‑default tested; sensitive exports redacted.
- Dashboards updated; alerts wired; runbooks added where applicable.
