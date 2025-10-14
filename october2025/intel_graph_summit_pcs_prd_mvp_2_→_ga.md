# DIRECTORATE J ∑ | IntelGraph “summit” — Proof‑Carrying Strategy (PCS) PRD for MVP‑2 and GA

**Classification:** Unclassified • Shareable • Publishable‑by‑default  
**Date:** 2025‑09‑30 (America/Denver)  
**Repository:** https://github.com/BrianCLong/summit  

---

## A) Executive Thesis (Decisive Idea & Next Best Actions)

- **IntelGraph is already an MVP‑1/“production‑ready MVP”** with deployable‑first posture (Docker Compose, smoke tests), core graph analytics (Neo4j), GraphQL API, React client, RBAC, OPA policies, audit logging, observability (OTel/Prom/Grafana), and an AI Copilot orchestration layer. We can graduate to **MVP‑2 in 30–45 days of focused hardening & UX polish**, then to **GA in 60–120 days** with compliance, tenancy, SLAs, and reference data/connector kits.
- **North Star:** Shrink adversary options & grow user option value by becoming the **de facto deployable graph‑intelligence workbench** (investigations→entities→relationships→copilot→results) with verifiable security and operational excellence.
- **Next Best Actions:** (1) Cut a **ruthless MVP‑2 scope** focused on Golden Path reliability, (2) ship **tenant isolation + policy guardrails**, (3) lock **graph schema v1 + migration tooling**, (4) deliver **two reference integrations** (CSV+STIX/TAXII + one SaaS), (5) stand up **SLOs, runbooks, gamedays**.
- **Moat Strategy:** standards compliance (STIX/TAXII, OpenLineage, OTel), **compliance capital** (SOC2 Type 2 path), and **switching costs** via saved investigations, copilot prompts, plugins, and decision audit trails.

---

## B) Where We Are (Ground Truth Snapshot)

**Observed in repo & README (9/30/2025):**

- **Core:** React 18 + MUI + Redux; Backend Node/TS (Apollo GraphQL); Real‑time via Socket.io; Datastores: **Neo4j 5**, **PostgreSQL 16 (pgvector)**, **TimescaleDB 2**, **Redis 7**.
- **Security:** JWT auth; RBAC; OPA policies; rate limiting; **audit logging**; tenant isolation noted as hardening area.  
- **AI:** Copilot orchestrator; multimodal extraction (CV: YOLO/MTCNN/OCR; speech: Whisper; NLP: spaCy; vector search).
- **DevEx/Deploy:** Docker multi‑stage, Docker Compose; smoke tests; **make bootstrap/up/smoke**; optional AI/Kafka services; OTel + Prom + Grafana.  
- **Golden Path:** Investigation → Entities → Relationships → Copilot → Results.  
- **Data Ingest:** CSV upload; **STIX/TAXII** support; external data federation (early).  
- **Docs:** Onboarding guide, docs index, runbooks folder, Grafana dashboards; bug‑bash results (2025‑09‑22).  
- **Gaps/risks from quick scan:** tenancy boundaries in depth (DB/schema & cache separation), schema versioning/migrations, RBAC/OPA coverage %, persisted queries everywhere, secrets/Key Mgmt posture, performance/scale envelopes, **UX discoverability**, SLA/SLO definition, and **reference connectors**.

> Sources: repo root README (IntelGraph Platform), docs/ONBOARDING, docs/README, runbooks/dashboards folders, bug‑bash results (2025‑09‑22). See Evidence section for links.

---

## C) Product Vision & Use Cases (Scope & Non‑Goals)

**Vision:** Deployable, secure, and explainable **graph‑intelligence workbench** for investigations and operational analysis, with an AI Copilot that is **auditable** and **policy‑bounded**.

**Primary Use Cases (P0):**
1. **Investigations lifecycle**: create → ingest → curate entities/relationships → analyze → report/export.  
2. **Copilot‑assisted graph queries** with progress streaming and policy guardrails (OPA + persisted GraphQL).  
3. **Search & sense‑making**: semantic/vector search across multimodal artifacts linked to graph nodes/edges.  
4. **Team collaboration**: real‑time presence, comments, version history, audit trail.  

**Secondary Use Cases (P1/P2):** GEOINT overlays, time‑series patterning, cross‑modal matching, and alerting.

**Non‑Goals (for MVP‑2):**
- Arbitrary ML model training UI, proprietary data brokers, and automated case adjudication.

---

## D) MVP‑2 PRD (Product Requirements Document)

### D1. Goals
- **Reliability of the Golden Path ≥ 99%** across clean installs via `make bootstrap/up/smoke` with deterministic seed data.  
- **Tenant safety:** enforce **logical isolation** (RBAC+OPA+query scoping) and **data hygiene** across Neo4j/Postgres/Redis; pass multi‑tenant smoke & chaos tests.  
- **Graph Schema v1.0:** documented entities/edges, constraints, indexes; **migration tool** (semver; forward‑only + safe rollback).
- **Reference Ingest:** STIX/TAXII + CSV, plus **one third‑party SaaS connector** (e.g., Slack export or MISP) with mapping to schema v1.  
- **Copilot Guardrails:** persisted GraphQL, allow‑lists, **prompt template registry** w/ versioning and **decision logs**.  
- **UX Polish:** Investigation Dashboard, Entity/Relationship editors, Copilot panel, result explainability, and zero‑conf defaults.  
- **Operations:** SLOs (latency, availability), **runbooks**, incident templates, and **gameday** script.

### D2. Users & Roles
- **Analyst** (create/read/update within investigation); **Lead Analyst** (merge/approve, publish); **Admin** (tenant, policy, secrets); **Observer** (read‑only).  
- Map to RBAC grants + OPA policies per operation.

### D3. Functional Requirements
1. **Investigations**  
   - CRUD + versioning; **status** (Draft/Active/Closed); tags; owners; collaborators; **timeline view**.  
   - **Export**: PDF/HTML report, JSON (schema‑conformant) and **STIX 2.1** bundle export.  
2. **Entities/Relationships**  
   - Types from **Schema v1.0**; required props; uniqueness constraints; **merge/split** for entity resolution.  
   - **Bulk ingest** (CSV/STIX/TAXII; SaaS connector) with mapping UI & preview; error report.  
3. **Graph Query & Analytics**  
   - Saved queries (Cypher & GraphQL); centrality/path routines; **explain** output; rate limits.  
   - **Vector search** API across attachments; link hits to nodes/edges.
4. **Copilot**  
   - **Prompt templates** (versioned); context policy (PII guardrails); **progress streaming**;
   - **Decision log**: inputs, model, policies applied, graph ops executed, outputs, confidence.  
5. **Collaboration**  
   - Presence, comments w/ mentions, change history; **audit log** across CRUD + Copilot actions.  
6. **Security & Tenancy**  
   - JWT rotation; session TTL; CSRF on web; **OPA policies** for all sensitive ops; **persisted queries** required for prod mode.  
   - **Tenant scoping** across **Neo4j/Postgres/Redis**; per‑tenant encryption contexts where applicable.  
7. **Observability**  
   - OTel traces across frontend→API→DB; Prom metrics; Grafana dashboards; **SLO burn alerts**.  

### D4. Non‑Functional Requirements
- **Performance:** P50 graph query < 300ms, P95 < 1200ms (1M nodes/5M edges on m5.2xlarge‑class box).  
- **Scalability:** Horizontal API scaling; Neo4j tuned for 10M edges; background jobs for heavy analytics.  
- **Reliability:** Error budget 2% monthly; **make smoke** green on clean envs (Linux/Mac).  
- **Security:** ZAP baseline scan; dependency scan; secrets via **KMS**; SBOM; OPA policy tests;
  cryptographic materials managed via **crypto/kms** module.

### D5. System Changes (MVP‑2)
- **Schema v1.0** (see Appendix A) + **Migration CLI** (`./cli/graph migrate --to 1.0.0`).  
- **Tenant Context Middleware** (GraphQL) + Neo4j/Postgres query tagging & scoping + Redis namespace.  
- **Persisted Query Service** + allow‑list; block ad‑hoc GraphQL in prod.  
- **Copilot Decision Logger** (append‑only; signed records; exportable).  
- **Connector SDK** (mapping, transform, validate) + reference connectors (CSV/STIX/TAXII + SaaS‑1).  
- **Gameday kit** (chaos scenarios + runbooks + rollback).

### D6. Acceptance Criteria (MVP‑2)
- Golden Path E2E success rate **≥ 99%** on CI & nightly environment.  
- Multi‑tenant chaos test shows **no data bleed** across tenants.  
- Query performance meets SLOs on test dataset (1M/5M).  
- ZAP baseline scan: **no High/Critical**; SBOM produced; no leaked secrets.  
- Two reference integrations pass mapping validation and round‑trip export.

---

## E) GA PRD (General Availability)

### E1. Goals
- **Operational maturity:** 24×7 on‑call, **SLOs & SLAs**, paging; **disaster recovery** (RPO≤15m, RTO≤2h).  
- **Compliance:** SOC2 Type 1 (GA), SOC2 Type 2 (T+6–9m) starter controls; **DPA** templates.  
- **Ecosystem:** Connector gallery (≥ 6), Plugin/Copilot template registry, **API stability (v1)** & deprecation policy.  
- **Enterprise tenancy:** org/projects; per‑tenant keys; **export controls** (policy‑based redaction).  
- **Scale:** 10M nodes/50M edges reference env; **read replicas**; job queue for offline analytics.

### E2. Functional
- **Project/Org model** (org→projects→investigations), SSO/SAML/OIDC, SCIM.  
- **Policy bundles** (OPA) by industry; governed workspaces; **data retention** policies; legal hold.  
- **Advanced analytics pack:** community detection at scale; temporal motifs; anomaly jobs.  
- **Audit‑ready exports:** investigation dossiers with cryptographic manifest (hashes, provenance).  
- **Marketplace:** connectors, layouts, copilot templates; signing & review pipeline.

### E3. Non‑Functional
- **Availability SLA 99.9%**; error budget policy; regional deploy patterns.  
- **Perf:** P95 query < 800ms on 10M/50M graph; API P95 < 250ms; UI TTI < 3.5s on mid‑tier laptop.  
- **Security:** pentest clean; **ASVS L2** parity; customer‑managed keys (optional).  
- **Observability:** trace sampling strategies, SLO dashboards, **synthetic probes**.

### E4. Acceptance
- SOC2 Type 1 report complete; SSO/SAML live; at least **3 design partner tenants** in production;
  **zero P0/P1 security findings open**; scale test signed off.

---

## F) Architecture (Delta from Current)

- **API:** GraphQL (Apollo v4) with **persisted queries**, OPA policy guardrails, **tenant context** propagation.  
- **Data:** Neo4j (graph) + Postgres (metadata, auth, vector) + Timescale (events) + Redis (sessions/queues).  
- **Schema v1.0:** Entities: Person, Org, Asset, ContentItem, Location, Event, Account, Device.  
  Edges: `ASSOCIATED_WITH`, `PART_OF`, `CONTROLS`, `MENTIONED_IN`, `ATTENDED`, `LOCATED_AT`, `DERIVED_FROM`, `COMMUNICATED_WITH`.  
  All edges stamped with `source`, `confidence`, `observed_at`, `provenance`.
- **Security:** KMS‑backed secrets; key rotation; per‑tenant encryption contexts; **OPA test suite**; JWT rotation.  
- **Copilot Guardrails:** template registry; allow‑list of graph ops; result **explainability** and **decision logs**.

---

## G) APIs & Data Contracts

### G1. GraphQL (selected)
- `createInvestigation(input)` → `Investigation { id, status, tags, owners }`
- `upsertEntity(type, props, refs)` → `Entity { id, type, canonical_id, aliases }`
- `connectEntities(edgeType, fromId, toId, props)` → `Edge { id, type, confidence }`
- `runCopilot(promptId, context)` → `CopilotRun { id, status, steps[], outputs[], policy_eval, log_hash }`
- `search(query, filters)` → `SearchResult { entity|edge|artifact, score, vectorExplain }`

**Persisted Queries:** All production mutations/queries must be registered; ad‑hoc disabled in prod.

### G2. Connector SDK Contracts
- **Mapping spec:** `source_field -> schema_v1.{entity|edge}.{prop}`, transforms, validators.  
- **Validation report:** counts, rejects, warnings, uncertainty.  
- **Idempotency:** deterministic external IDs; merge strategies (exact, fuzzy).

---

## H) Security, Compliance & Governance

- **Policies:** OPA bundles for role/tenant constraints; **deny‑by‑default**.  
- **AppSec:** ZAP baseline in CI; SAST/dep scan; SBOM; secrets scan; signed containers (Sigstore).  
- **Data:** PII redaction at ingress; configurable retention; export control (redaction templates).  
- **Audit:** append‑only decision/case logs; **provenance manifests** (hashes, timestamps, source).  
- **Compliance:** SOC2 T1 control mapping (Change, Access, Availability); **ASVS L2** checklist; logging & monitoring controls.

---

## I) Operations (SRE Play)

- **SLOs (initial):** API availability 99.9%; Graph query P95<1.2s; UI TTI<4s; Error rate <1%.  
- **Runbooks:** incident triage, DB failover, cache stampede, Kafka backlog, model outage.  
- **Gameday:** tenant data bleed drill; slow‑query drill; Redis eviction; model 5xx storm.  
- **Alerting:** SLO burn alerts; anomaly on audit‑log gaps; ingestion failure thresholds.

---

## J) Roadmap & Resourcing (30/60/90)

**30 days (MVP‑2 core):** Schema v1.0 + migrations; tenant scoping; persisted queries; decision logger; CSV/STIX connectors; UX polish; SLOs; runbooks; ZAP baseline.  
**60 days (MVP‑2 hardening → GA runway):** SaaS connector #1; scale harness (1M/5M); bug bash #2; OPA coverage ≥ 90%; dashboard SLOs; gameday #1.  
**90–120 days (GA):** org/projects + SSO/SAML; SOC2 T1 readiness; connector gallery (≥6); read replicas; DR plan & test; marketplace alpha.

**RACI (high‑level):**  
- **P/M (Owner):** MVP‑2 scope, acceptance, customer council.  
- **Tech Lead:** schema, migrations, tenancy, performance.  
- **SRE Lead:** SLOs, observability, runbooks, gameday.  
- **Security Lead:** OPA, ZAP/SAST/SBOM, secrets/KMS, compliance mapping.  
- **UX Lead:** Golden Path UX, explainability, docs.

---

## K) COAs (Courses of Action)

| COA | Description | Effort | Impact | Risks | Decision Gates |
|---|---|---:|---:|---|---|
| **Good** | Ship MVP‑2 without SaaS connector; double‑down on reliability & guardrails. | M | H | Integration gap; limited demos. | Green SLOs; ZAP clean; chaos pass. |
| **Better** | MVP‑2 + one SaaS connector; seed plugin/connector SDK. | M‑H | H+ | Connector maintenance; scope creep. | Connector E2E demo; mapping validator green. |
| **Best** | MVP‑2 + SaaS + Org/SSO fast‑track; GA in 90d. | H | VH | Compliance work, resource load. | SOC2 T1 readiness; perf @ 10M/50M. |

**Recommendation:** *Better* — balances demo power and risk, keeps GA runway intact.

---

## L) Scorecard & Tripwires

**KPIs:** Golden Path pass‑rate; Time‑to‑Insight; Query P95; Ingest success%; Copilot satisfaction (CSAT); Tenancy test pass‑rate; Mean incident age; Connector activation.  
**KRIs:** Policy bypass attempts; data bleed indicators; long tail query latencies; model 5xx; cache evictions; ingest backlog.  
**Tripwires:** SLO burn >20% in 24h; any cross‑tenant read; ZAP High/Critical; smoke red on main; audit log gaps >0.1%.

**Rollback Criteria:** Any tripwire triggered → revert to last green release; disable non‑persisted queries; freeze connectors; feature‑flag Copilot.

---

## M) Measurement & Telemetry Map

- **Coverage:** Copilot steps coverage, OPA policy hit/miss, persisted query ratio, schema version adoption, connector health.  
- **Dashboards:** SLO, ingest pipeline health, query heatmap, tenant isolation metrics, audit integrity.

---

## N) Risks & Mitigations

- **Tenancy isolation complexity** → strict context propagation; integration tests; chaos drills.  
- **Graph scale performance** → indexes, read replicas, offline jobs; perf harness & budgets.  
- **Security regressions** → CI gates (ZAP, SAST, SBOM); Sigstore; KMS integration.  
- **Copilot missteps** → allow‑listed graph ops; policy pre‑checks; decision explainability & export.  
- **Connector fragility** → mapping validator; idempotent upserts; versioned transforms.

---

## O) Evidence & PCS (Assumptions, Sources, Falsifiers)

**Key Sources (accessed 2025‑09‑30):**  
- Repo README (IntelGraph Platform): features, stack, quickstart, Golden Path.  
- `docs/ONBOARDING.md` and `docs/README.md` (developer flow & docs index).  
- Folders: `grafana/dashboards`, `RUNBOOKS`, `bug-bash-results/20250922`, `security`, `crypto/kms`, `feature-flags`, `connectors`, `copilot`.

**Assumptions:**  
- STIX/TAXII ingest exists but needs polish and validation UI.  
- OPA is present and requires coverage expansion & tests.  
- Multi‑tenant posture is **logical**, not full physical isolation.  
- CI includes smoke tests; ZAP baseline not fully integrated yet.  
- AI model endpoints are pluggable; selection subject to policy.

**Confidence:** Medium‑High on current capabilities from README; Medium on coverage depth (OPA, persisted queries) without full code audit.

**Falsification Paths:**  
- If persisted queries already enforced in prod profile → adjust MVP‑2 scope (shift to schema/tenancy).  
- If tenant isolation already comprehensively implemented → reallocate to connectors/security.  
- If performance SLOs exceeded at 10M/50M → advance GA scale targets.

---

## P) Appendices

### Appendix A — Graph Schema v1.0 (Proposed)

**Entities**  
- **Person** `{id, name, dob?, aliases[], accounts[], risk_score?, sources[]}`  
- **Org** `{id, name, type, jurisdiction?, risk_score?, sources[]}`  
- **Asset** `{id, kind, ownerRef, identifiers{}, tags[], risk?}`  
- **ContentItem** `{id, uri|blobRef, mime, text?, embedVec, lang?, sources[]}`  
- **Location** `{id, geo{lat,lon}, country?, locality?, precision}`  
- **Event** `{id, started_at, ended_at?, summary, tags[], sources[]}`  
- **Account** `{id, platform, handle, ownerRef}`  
- **Device** `{id, kind, fingerprint, ownerRef}`

**Edges**  
- `ASSOCIATED_WITH(Person↔Person|Org)` `{confidence, observed_at, source}`  
- `PART_OF(Person|Asset|Org→Org)` `{role?, since?, source}`  
- `CONTROLS(Account|Device→Person|Org)` `{since?, source}`  
- `MENTIONED_IN(Entity→ContentItem)` `{quote?, offset?, source}`  
- `ATTENDED(Person→Event)` `{role?, observed_at, source}`  
- `LOCATED_AT(Entity→Location)` `{since?, until?, precision}`  
- `DERIVED_FROM(Any→Any)` `{method, source, transform}`  
- `COMMUNICATED_WITH(Account↔Account)` `{channel, count, window}`

**Constraints/Indexes**  
- Uniqueness on canonical IDs; composite indexes for frequent traversals; TTL on volatile edges.

### Appendix B — Example Persisted Queries

- `GET_INVESTIGATION_OVERVIEW`, `UPSERT_ENTITY_PERSON`, `CONNECT_ASSOCIATED_WITH`, `RUN_COPILOT_TEMPLATE`, `SEARCH_SEMANTIC` — stored with hash, variables schema, OPA policy binding, and rate limits.

### Appendix C — Gameday Scenarios

1) **Cross‑tenant read attempt** (force fail with alert)  
2) **Slow Cypher** (index miss)  
3) **Redis eviction storm**  
4) **Kafka backlog** blocking ingestion  
5) **Model endpoint timeout** with graceful degradation

---

**Definition of Done (DoD‑J):** Win conditions defined; MVP‑2 selected; scorecard active; rollback tested; PCS attached; owners/dates set.

