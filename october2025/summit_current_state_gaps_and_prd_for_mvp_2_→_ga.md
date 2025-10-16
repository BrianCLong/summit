# Summit — Current State, Gaps, and PRD for MVP‑2 → GA

> Draft owner: Covert Insights • Date: 2025‑09‑30 • Audience: execs, product, eng, security, data, GTM

---

## 0) Executive summary

**Summit** is converging into a company‑scale intelligence & cybersecurity platform with three pillars:

1. **Collection → Context:** high‑fidelity ingestion (Airflow DAGs, connectors) into a normalized event/asset model and knowledge graph.
2. **Reasoning → Action:** AI/ML suite (“cognitive‑insights”, “cognitive‑targeting‑engine”, “active‑measures‑module”, “deescalation‑coach”) driving detection, scoring, guidance, and automated playbooks.
3. **Decision surfaces:** API/SDK (“api”, “cli”), web “client”, dashboards, alerting, and runbooks to close the loop.

We have broad scaffolding and a lot of code in place (3.8k commits, rich folder surface). The next step is to harden a **thin, end‑to‑end workflow** for 2–3 flagship use cases, then scale to GA quality with multi‑tenant security, SLOs, and compliance.

**MVP‑2 focus (next major milestone):**

- Lock an E2E loop for **Threat Intel → Detection → Triage → Response** and **Influence/Campaign Monitoring**.
- Ship **Entity Resolution**, **Alert Triage**, **Campaign Clustering**, **Playbooks v1**, and **Operator Copilot** across API, UI, and runbooks.
- Productionize ingestion & storage (schemas, backfills, idempotency), secrets/KMS, RBAC, audit, and on‑call.

**GA focus:**

- Multi‑tenant, SOC 2 foundations, SLOs, scale tests, golden signals, data governance, and plugin marketplace for connectors & detectors.
- SLA’d endpoints/APIs, versioned models, export controls, and enterprise deployment patterns (BYO‑cloud and managed).

---

## 1) What exists (observed from repo) — inferred component map

> High‑level mapping of current folders/modules to architecture. Treat as inventory to align owners.

- **Ingestion & Orchestration**
  - `airflow/dags` — scheduled ingestion & processing
  - `connectors/` — source integrations (social, web, internal, security tools, etc.)
  - `data-pipelines/`, `data/`, `analytics/` — ETL/ELT, transforms, feature stores, derived tables
  - `benchmarks/harness` — perf/quality harness

- **Core Services & APIs**
  - `api/` — HTTP/Graph API surface (authn/authz hooks), service composition
  - `controllers/`, `contracts/`, `companiesos/` (CompanyOS) — domain objects, service interfaces, business logic
  - `cli/` — operator and CI tooling

- **AI/ML & Detection**
  - `ai-ml-suite/` — common ML utilities, model training/inference
  - `cognitive-insights/`, `cognitive_insights_engine/` — scoring, summarization, entity & relationship extraction
  - `cognitive-targeting-engine/` — audience/actor modeling, risk targeting
  - `active-measures-module/` — coordinated/influence ops detection
  - `deescalation-coach/` — guidance & counter‑messaging patterns
  - `analysis/`, `competitive/` — offline studies, signal R&D

- **Experience & Surfaces**
  - `client/`, `dashboard/`, `dash/`, `conductor-ui/` — web app(s) and operator consoles
  - `alerting/`, `alertmanager/` — rules, routing, notifications
  - `RUNBOOKS/`, `docs-site/`, `comms/templates` — docs, playbooks, tempates

- **Platform & Ops**
  - `db/` — migrations/schemas
  - `charts/`, `docker/`, `deploy/`, `.devcontainer/` — packaging & deploy
  - `crypto/kms/` — key management
  - `controls/`, `SECURITY/`, `.security/`, `audit/` — governance, audit, policy
  - `.maestro`, `.zap`, `.githooks`, `.husky` — build/test/security/automation

- **Golden paths, artifacts, archived migrations**
  - `GOLDEN/datasets/` — truth sets and fixtures
  - `bug-bash-results/20250922`, `archive_20250926`, `archive/frontend-migration` — validation artifacts & history

**Signal:** breadth > depth; strong R&D and scaffolding; needs consolidation into opinionated E2E workflows, reliability, and enterprise controls.

---

## 2) Users, jobs‑to‑be‑done, and flagship workflows

### Primary users

- **Intel & Trust/Safety analysts** (T&S, IR, CTI, InfoOps) — identify campaigns, actors, narratives; map spread; recommend interventions.
- **Cyber fusion/SOC operators** — triage alerts, correlate across sources, trigger playbooks, report impact.
- **Executives & comms** — situational awareness, KPIs, risk posture, narrative health.
- **Integrators/partners** — build connectors, detectors, and playbooks.

### Top workflows to nail (MVP‑2)

1. **Campaign Monitoring (Influence/Active Measures)**
   - Sources → normalize → **entity & narrative extraction** → **campaign clustering** → **risk score** → alert → operator copilot → report.
2. **Security Triage (Threat + Brand + Insider blend)**
   - Signals from EDR/SIEM/SaaS + open web → **entity resolution** → correlation & enrichment → **triage queue** → playbook execution → case closure.
3. **Decision Briefs**
   - Any investigation → **auto‑brief** (facts, actors, network graph, confidence, actions) suitable for exec/board.

---

## 3) System architecture (target for MVP‑2)

**Data plane**

- **Connectors** → **Ingestion Bus** (Kafka/Redpanda or SQS/SNS) → **Transformers** (Flink/Beam or Python workers) → **Storage**:
  - Hot: Postgres for metadata; Elasticsearch/OpenSearch for search; Redis for queues/caching.
  - Warm: Parquet in object store (S3/GCS) + Delta/Iceberg for batch/ML.
  - Graph: Neo4j/JanusGraph or PG‑graph extension for entities/relations.

**ML plane**

- Extraction models (NER, relation, stance), clustering (HDBSCAN + embeddings), ranking/scoring, detector plug‑ins.
- **Model registry** with versioning, A/B, offline eval harness tied to `GOLDEN/datasets`.

**Control plane**

- **API Gateway** (REST/GraphQL), AuthN (OIDC), AuthZ (OPA/Rego or Zanzibar‑style tuples), rate‑limits.
- **Rules & Alerting**: declarative rules (YAML) → alert routes → oncall.
- **Playbooks**: declarative actions (HTTP, ticketing, takedown requests, comms templates) with guardrails.

**Experience**

- **Web client**: Workspaces → Feeds → Cases → Graph → Briefs → Settings.
- **Operator Copilot**: retrieval‑augmented helper grounded in case context with immutable audit.

**Security**

- KMS‑backed secrets, envelope encryption, tenant isolation, full audit (who/what/when/why), data minimization.

---

## 4) Data model v0.9 (MVP‑2)

- **Entity**: `{id, type, names[], handles[], org?, country?, risk?, created_at, updated_at, provenance[]}`
- **Artifact**: `{id, kind (post,url,file,log), content/meta, embeddings[], source, collected_at}`
- **Event**: `{id, ts, actor/entity_id, action, attributes, source}`
- **Edge**: `{src, dst, type, weight, evidence[]}`
- **Campaign**: `{id, title, hypothesis, members{entities, artifacts, events}, start, end?, score, status}`
- **Case**: `{id, type, priority, alerts[], assignee, status, sla, actions[], audit[]}`
- **Alert**: `{id, rule_id, severity, dedupe_key, entities[], artifacts[], reason, status}`

---

## 5) Non‑functional requirements (NFRs)

- **Performance/SLOs**: P50 ingest→search < 5m; P95 alert fan‑out < 30s; UI P95 TTI < 3s on 50th percentile network. API P95 < 400ms for hot queries.
- **Scalability**: 1B artifacts warm store; 10M entities; 100K daily alerts. Horizontal scaling for workers and search.
- **Reliability**: 99.9% API availability; at‑least‑once ingestion with idempotent writes.
- **Security/Privacy**: OIDC SSO, RBAC/ABAC, KMS, field‑level encryption for sensitive PII, DP redaction on export, immutable audit.
- **Compliance**: SOC 2 Type II path; data residency flags; export control gating on models/connectors; content provenance (C2PA where applicable).
- **Observability**: RED/USE metrics, trace coverage > 80% of critical paths, runbooks for top incidents, chaos drills quarterly.

---

## 6) Gaps & risks (from current state → target)

**Product gaps**

- Clear **golden workflows** across app: Workspaces, Cases, Alert Triage, Campaigns, Briefs.
- **Entity resolution** & **campaign clustering** hardened with quality bars and operator overrides.
- **Playbooks** (actionability) and **Operator Copilot** grounded in case context with guardrails.

**Platform gaps**

- **Multi‑tenant isolation** across data, search, and graph.
- **Schema registry** + **contract tests** for connectors and transforms; backfill tooling.
- **Secret/KMS integration** end‑to‑end; key rotation; scoped tokens for connectors.
- **SLIs/SLOs** + pager duty; chaos and capacity planning; perf budgets in CI.

**Security & compliance**

- Formal threat model; hardened authz (OPA policies), audit trails, content provenance chain.
- Data governance: retention, subject rights process, lineage, and tagging.

**Data/ML**

- Model registry & eval harness tied to `GOLDEN/datasets`; bias/abuse tests; explainability surfaces.
- Embedding/search drift monitoring; ground‑truth feedback loop (analyst labels).

**Delivery**

- Release trains; migrations; feature flags; versioned APIs; upgrade playbooks.

---

## 7) MVP‑2 Product Requirements Document (PRD)

### 7.1 Goal & success metrics

**Goal:** Ship an opinionated, reliable E2E loop for Campaign Monitoring and Security Triage used daily by pilot customers.

**North‑star metrics**

- Triage efficiency: **≥40% reduction** in mean time to triage (MTTT) vs baseline tools.
- Signal quality: **Precision@Top‑N ≥ 0.85** for alerts; **≥70% analyst acceptance** of campaign clusters.
- Adoption: **DAU/WAU ≥ 35%**, **≥5 active cases/user/week** among analysts in 2 pilot tenants.
- Reliability: **99.9% API**; **P95 ingest→alert < 10m**.

### 7.2 In‑scope features

1. **Workspaces & Cases v1**
   - Case lifecycle (open, triage, investigate, actioned, closed) with SLA timers and audit.
   - Case feed: linked alerts, artifacts, entities, and graph view.

2. **Entity Resolution v1**
   - Deterministic + ML‑similarity with human merge/split, provenance, and blocking keys.
   - Deduping across connectors; enrichment (whois, org, geo, verified flags).

3. **Campaign Clustering v1**
   - Narrative extraction (keyphrases, topics, sentiment/stance) + HDBSCAN/TimeSFM for clusters.
   - Cluster cards: scope, growth, key entities, top artifacts, confidence.

4. **Alerting & Triage v1**
   - Rule DSL (YAML) → builder in UI; alert routing & dedupe; triage queue with hotkeys.
   - Suppression windows; feedback buttons (TP/FP/Needs work) to label store.

5. **Playbooks v1**
   - Actions: HTTP webhook, ticket (Jira), comms template, escalation, takedown request stub.
   - Guardrails: dry‑run, approvals, rate‑limits, and audit for every action.

6. **Operator Copilot v0.9**
   - RAG from case context; citations to artifacts; never executes actions directly.
   - Canned prompts: "explain this cluster", "what changed in 24h", "draft an exec brief".

7. **Connectors (pilot set)**
   - At least **6 sources** across web/T&S/SecOps (e.g., Twitter/X, Reddit, Web crawl, EDR/SIEM, Git, Slack).
   - Idempotent ingestion; schema‑versioned payloads; replay/backfill.

8. **Dashboards & Briefs**
   - Org‑level overview: active campaigns, MTTR/MTTT, alert volumes, top narratives.
   - One‑click Executive Brief export (PDF/HTML) from a case/campaign.

### 7.3 Out of scope (MVP‑2)

- Marketplace, BYO‑LLM, auto‑remediation without approval, fine‑grained tenant IAM delegation, mobile app.

### 7.4 Constraints & dependencies

- Requires baseline KMS, OIDC SSO, RBAC, audit, SLOs, and hardened deploy path (staging → prod), see §8.

### 7.5 Acceptance criteria

- Two pilot tenants in production‑like environment using the workflows weekly.
- p95 ingest→alert <10m; API availability ≥99.9%; error budgets tracked with burn alerts.
- Precision@N across top rules ≥0.85 measured against `GOLDEN/datasets` + analyst labels.
- All actions and copilot outputs are **audited with provenance**; no PII leakage in exports.

---

## 8) MVP‑2 Engineering plan (abridged)

**8.1 Architecture hardening**

- Introduce **schema registry** for events/artifacts; versioned transforms; idempotent sinks.
- Consolidate storage: Postgres (metadata), OpenSearch (search), S3/Parquet (lake), Graph store. Migrations with Liquibase/Flyway.
- **AuthN/Z**: OIDC (Okta/AzureAD), RBAC with OPA policies; scoped API tokens per connector; per‑tenant KMS keys.

**8.2 Observability & SRE**

- SLIs: availability, latency, error rate, freshness. **SLOs codified** in config. Golden signals per service.
- Tracing: OpenTelemetry end‑to‑end; log redaction; sampling rules.
- On‑call runbooks; synthetic canaries for ingest & API; chaos experiments monthly.

**8.3 Data/ML**

- **Model registry** with semantic versioning, feature store contracts, and promoted/stable channels.
- Eval harness wired to `GOLDEN/datasets` + held‑out validation; continuous quality dashboards.
- Feedback ingestion from UI for human‑in‑the‑loop training; drift monitors.

**8.4 Security**

- Threat model & STRIDE walkthroughs per service; code scanning gates; SBOM & provenance attestation for builds (SLSA Level 2 path).
- Secrets: KMS + sealed secrets in deploy; auto‑rotation; break‑glass procedures.
- **Audit**: append‑only logs, tamper‑evident (hash chains), access reviews.

**8.5 Delivery**

- Environments: dev, staging, prod with tenant fixtures.
- Feature flags + migrations; blue/green for API; rollback playbook.
- Release train: bi‑weekly minor; monthly hardening; versioned API `v1` locked at GA.

---

## 9) GA scope (v1.0)

### 9.1 Product

- **Multi‑tenant GA**: strong isolation (DB/schema, index prefixes, KMS per tenant), SCIM provisioning, delegated admin.
- **Marketplace**: connectors & detectors as packages with review/signing; revenue share mechanics.
- **Playbooks v2**: approval workflows, human‑in‑the‑loop loops, outcome tracking, and rollback.
- **Operator Copilot v1**: retrieval index per tenant; safety filters; action suggestions that require explicit approval.
- **Compliance pack**: SOC 2 Type II controls, data lifecycle tooling, export controls & geo fences.

### 9.2 Engineering

- Scale tests: 1B artifacts, 10M entities; failover drills; capacity model & autoscaling.
- Search excellence: semantic + lexical hybrid, synonym packs, time‑decay ranking, per‑tenant boosters.
- **Cost guardrails**: quota management, tiering, cold storage lifecycle policies.
- **Analytics**: product KPIs, cohort dashboards, billing events.
- **Extensibility**: SDKs for connectors/detectors/playbooks; stable contracts; samples.

### 9.3 GA acceptance

- 3+ enterprise tenants live; referenceable. SLOs met 3 months. Independent pen‑test passed; SOC 2 audit underway.
- Marketplace with ≥10 community connectors and ≥5 detectors.
- Upgrade safe: zero‑downtime migrations demonstrated.

---

## 10) Detailed specifications

### 10.1 APIs (v1 draft)

**Authentication**

- OIDC/OAuth2; PATs for automation; mTLS optional for ingest.

**Objects**

- `POST /v1/artifacts` (bulk supported) — idempotent on `source_id` + `source_ts`.
- `POST /v1/entities:resolve` — returns canonical entity + evidence; supports batch.
- `POST /v1/alerts:ingest` — rule hits from external systems.
- `GET /v1/campaigns/{id}` — with members & evidence.
- `GET /v1/cases/{id}` — case pack; `POST /v1/cases/{id}/actions` — playbook step.
- `POST /v1/copilot:answer` — RAG answer with citations and redaction report.

**Webhooks**

- `case.changed`, `alert.created`, `playbook.step.requested`, `playbook.step.completed`.

**Quotas**

- Default: 500 RPS burst 1000; payload ≤ 10 MB; ingest batch ≤ 10k artifacts.

### 10.2 Rule DSL (sketch)

```yaml
version: 1
rule: name: "Narrative surge: vaccine-hesitancy" id: rule-123
where:
  artifact.kind == "post" AND source in ["twitter","reddit"]
  AND lang == "en" AND contains_any(content, ["vaccine","mrna"])
  AND sentiment in [NEG, ANGRY]
  AND time_window(1h).count > p95_baseline*1.8
then:
  create_alert(severity: HIGH, dedupe_key: hash(rule_id, cluster_id, hour))
  attach_entities(entities.cluster_members)
```

### 10.3 Playbook schema (v1)

```yaml
id: pb-001
name: 'Coordinate takedown request'
triggers: [alert.created where severity >= HIGH and source == influence]
steps:
  - id: draft-brief
    action: template.render
    input: { template: 'takedown_request_v1', case_id: $case.id }
    approvals: [T&S Lead]
  - id: send-legal
    action: http.post
    input: { url: $secrets.LEGAL_WEBHOOK, body: $prev.output }
    guardrails: { rate_limit: 5/min, dry_run: false }
```

### 10.4 Data quality gates

- Connector contract tests; schema validation; freshness SLA alarms.
- De‑dup & canonicalization metrics; cluster cohesion/separation metrics.

### 10.5 UI surfaces (MVP‑2)

- **Workspaces**: tenant switcher, data sources, rules, playbooks.
- **Cases**: queue, keyboard triage, evidence panel, graph, actions.
- **Campaigns**: clusters list, growth chart, key actors, confidence, "what changed".
- **Briefs**: auto‑generated, human‑editable, export.
- **Settings**: users, roles, API tokens, secrets (KMS‑backed), audit viewer.

---

## 11) Program plan & timelines (indicative)

**Now → +4 weeks (Stabilize & Thin Slice)**

- Lock schemas; wire ingestion→storage→search; ship Cases/Alerts skeleton; enable 2 connectors end‑to‑end.

**+5 → +10 weeks (MVP‑2)**

- Ship Entity Resolution v1; Campaign Clustering v1; Triage & Playbooks v1; Operator Copilot v0.9; 6 connectors.

**+11 → +20 weeks (Hardening & GA)**

- Multi‑tenant isolation; SLOs & scale tests; compliance pack; SDKs; marketplace beta; GA sign‑off.

---

## 12) RACI (MVP‑2)

- **PM**: owns scope, acceptance, and stakeholder sync.
- **Tech Lead (Platform)**: ingestion, storage, API, authn/z, SRE.
- **Tech Lead (ML)**: extraction, clustering, ER, eval harness.
- **UX Lead**: workflows, triage ergonomics, briefs.
- **Security Lead**: threat model, KMS, audit, compliance.
- **Data Lead**: taxonomy, schema registry, data contracts, lineage.

---

## 13) Open questions

- Which connectors are contractual must‑haves for pilots? (name the 6)
- What data residency/retention constraints per pilot?
- Preferred graph store vs PG‑graph? (operational trade‑offs)
- Embedding provider(s) and cost guardrails; on‑prem/air‑gapped tenants?
- Marketplace governance model & signing requirements.

---

## 14) Appendix: Quality & safety bars

- **Red‑team prompts** vs copilot; jailbreak resistance; PII redaction tests.
- **Bias/abuse tests** on narratives and actor attribution; explainability: show evidence & confidence ranges.
- **Human‑in‑the‑loop**: every irreversible action requires review & two‑person rule for sensitive playbooks.

---

_End of document._
