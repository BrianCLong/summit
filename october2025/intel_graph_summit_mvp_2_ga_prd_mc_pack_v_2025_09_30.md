# IntelGraph Summit — MVP‑2 & GA PRD (MC Pack v2025‑09‑30)

> Maestro Conductor IG (MC) — end‑to‑end SDLC orchestration for IntelGraph. This document converts current repo state into a shippable plan: specs, PRDs, acceptance, test & SRE, security, and release.

---

## 0) Conductor Summary (One‑Screen)
**Goal.** Advance IntelGraph from MVP‑1 → MVP‑2 (Production‑Ready Beta) and to GA with hardened reliability, provable security, and audit‑grade evidence—without breaking the deployable‑first golden path: *Investigation → Entities → Relationships → Copilot → Results*.

**Non‑Goals.** Not targeting advanced marketplace integrations, full multi‑region DR automation, or air‑gap export tooling beyond baseline in MVP‑2 (those are GA+).

**Constraints.** Org defaults (SLOs, cost guardrails), tenant isolation, provenance-first, least privilege, weekly release cadence w/ evidence bundles, canary gates, and error‑budget policy.

**Assumptions.** Current stack: React 18 + MUI, Apollo GraphQL, Node/TS, Neo4j + Postgres(+pgvector) + Redis + Timescale; Docker Compose dev; GitHub Actions; OTel+Prometheus+Grafana. MVP‑0/1 complete per README. Open Issues indicate CI failures, canary & observability items pending.

**Risks.** CI flakiness, Playwright coverage gaps, provenance/export assurance gaps, policy drift (OPA), secrets hygiene, cost burn from LLM/infra.

**Definition of Done (MVP‑2).** Golden path runs clean in local+staging; CI 100% green; Playwright critical flows stable; persisted queries + ABAC enforced; Grafana dashboards + burn alerts live; canary + rollback runbooks proven; evidence bundle attached to releases; cost/SLO alerts wired.

**Definition of Done (GA).** See Section 5; includes region sharding option, privacy ops at scale (RTBF), DR drills, and SOC2‑ready controls pack.

---

## 1) Where We Are (Repo Snapshot — MC View)
- **Golden Path:** One‑command bootstrap (`make bootstrap`, `make up`, `make smoke`) passes locally; client at :3000, GraphQL :4000, Neo4j :7474.
- **Features:** Auth+RBAC+OPA, graph analytics, AI Copilot orchestration, ingestion (CSV/STIX/TAXII), vector search, CV/NLP/STT, OTel+Prometheus+Grafana hooks, perf optimizations.
- **Gaps flagged by issues:** CI build failures (Maestro pipeline), PR dashboards, GA micro‑canary, post‑cutover chaos drill, Playwright “critical flows”, dashboards & alerts.

**Implication:** Core is functionally rich; production hardening, quality gates, and ops proof need to be finished for MVP‑2; GA focuses on multi‑region/residency, privacy ops, DR, and connector breadth.

---

## 2) MVP‑2 PRD (Production‑Ready Beta)
### 2.1 Objectives
1) **Reliability & Testability**: Green CI, deterministic builds, Playwright critical‑path suite, smoke & load gates (k6), provenance‑attached artifacts.
2) **Security & Privacy**: Persisted GraphQL queries + ABAC (OPA) enforcement; field‑level encryption for sensitive attrs; secrets hygiene; audit hooks.
3) **Observability & SLOs**: OTel traces, service/error budgets, Grafana dashboards, burn‑rate alerts; p95/p99 targets per defaults.
4) **Release Safety**: Micro‑canary w/ automatic rollback; runbooks; chaos drills; release train evidence bundle.
5) **Cost Guardrails**: LLM + infra budgets with alerts and per‑unit costs tracked in dashboards.

### 2.2 Users & Use Cases (MVP‑2)
- **Analyst:** Create investigations, ingest data, run Copilot, visualize graphs, export findings.
- **Supervisor:** Review evidence trails, manage tenants, approve canary/rollbacks.
- **SRE/On‑Call:** Watch dashboards/alerts, execute drills and runbooks.
- **Compliance:** Verify provenance, privacy controls, and release evidence bundles.

### 2.3 Scope (In)
- Golden‑path E2E hardened; **no new ML models**, only stabilization.
- Persisted GraphQL queries; ABAC policy pack ship; secrets scanning; SBOM.
- Playwright E2E for: login, create investigation, ingest CSV, run Copilot, view results, export.
- Grafana dashboards: API SLO, Graph ops SLO, Ingest throughput, Error budget burn, Cost.
- Micro‑canary + automated rollback; chaos drill T+24h post‑cutover.

**Out (MVP‑2)**: multi‑region routing, air‑gap bundle UX, residency migrations, marketplace connectors (beyond S3/CSV + HTTP), advanced XAI UX.

### 2.4 Functional Requirements (selected)
- **Auth & ABAC**: OIDC→JWT; tenant+case scopes; OPA sidecar policy decisions; policy simulation in CI.
- **Graph API**: Persisted queries only in prod; rate‑limit per tenant; query budget tokens.
- **Ingest**: S3/CSV and HTTP connectors with provenance attach; ≥50MB/s per worker (dev benchmark target).
- **Copilot**: Orchestrator streaming status; evidence of prompts/outputs; redaction rules.
- **Exports**: Signed evidence bundle (hash manifest + lineage) on release and per‑case export.

### 2.5 Non‑Functional (SLOs / Guardrails)
- **GraphQL Reads** p95 ≤ 350ms, p99 ≤ 900ms; **Writes** p95 ≤ 700ms, p99 ≤ 1.5s; **Subs** p95 ≤ 250ms.
- **Graph Ops (Neo4j)**: 1‑hop p95 ≤ 300ms; 2–3 hop p95 ≤ 1200ms.
- **Ingest**: ≥ 1000 ev/s per pod; pre‑storage processing p95 ≤ 100ms.
- **Availability**: 99.9% monthly (API).
- **Budgets**: See Org Defaults; alert at 80% of monthly cap.

### 2.6 Acceptance Criteria (excerpt)
- [ ] CI green across lint/type/unit/integration/e2e; flaky tests <1% failure over 200 runs.
- [ ] Playwright critical flows pass in CI + nightly.
- [ ] Grafana dashboards show SLOs + burn; alerts page with paging policy.
- [ ] Prod only accepts persisted GraphQL queries; non‑persisted blocked at gateway.
- [ ] Evidence bundle attached to release tags vX.Y; includes SBOM, test reports, SLO snapshot.
- [ ] Micro‑canary gate + automatic rollback demonstrated in staging; post‑cutover T+24h chaos drill completed with report.

### 2.7 Verification Steps
- **k6**: load 1x/3x baseline; ensure SLOs.
- **Chaos**: kill pods, Neo4j leader failover, Redis restart; verify error budgets intact.
- **Security**: ZAP baseline; dependency scan; secrets check; OPA policy tests; persisted query enforcement test.

---

## 3) GA PRD (Hardened, Multi‑Region‑Ready)
### 3.1 Objectives
- **Resilience & Residency**: Single‑primary region + read replicas; tenant region sharding; DR drills (RPO≤5m, RTO≤30m target).
- **Privacy Ops at Scale**: RTBF, legal hold, retention automation (short‑30d for PII by default), purpose tagging.
- **Air‑Gapped Topology**: Offline bundle w/ provenance ledger resync, signed export channels.
- **Connector Breadth**: JDBC (Postgres/MySQL), GCS/Azure Blobs, webhooks; message bus adapters.
- **Trust & Compliance**: SOC2‑ready controls pack, audit workbench, warrant/authority binding, SCIM + WebAuthn.

### 3.2 Scope (In)
- Region sharding overlays (Helm), tenant routing, read replicas.
- Residency tags on tenants, data localization enforcement via OPA + gateway.
- Privacy features: k‑anonymity/redaction, RTBF workflows, retention tiering + auto‑purge.
- DR runbooks + quarterly drills; export signing + ledger verify tooling.
- Connector SDK expansion.

### 3.3 Acceptance (excerpt)
- [ ] Residency tests pass; cross‑region requests blocked unless policy allows.
- [ ] DR drill report demonstrates RPO/RTO targets.
- [ ] RTBF executes within SLA (≤24h) with audit.
- [ ] Air‑gap export/import round‑trip verified (hash match + ledger reconciliation).
- [ ] Cost per 1M GraphQL calls ≤ $2; per 1k ingested events ≤ $0.10.

---

## 4) Architecture & ADRs
### 4.1 Updated Reference Architecture (MVP‑2 → GA)
- **Gateway**: Apollo Router/GraphQL Gateway with persisted queries, authz at edge, rate limits, request budgets.
- **Services**: `gateway`, `graph-service` (Neo4j), `featurestore`, `ingest-pipeline`, `copilot-orchestrator`, `audit/provenance`, `observability`.
- **Data Plane**: Neo4j primary; Postgres(+pgvector); Redis; Timescale metrics; optional Kafka.
- **Security Plane**: OIDC provider; OPA policy engine; KMS for envelope encryption; secrets via Vault or SOPS.
- **Observability**: OTel SDKs → OTLP → Prometheus/Grafana; trace IDs in user‑visible error dialogs.

### 4.2 ADRs to Ratify
- **ADR‑001**: Persisted GraphQL queries enforced in prod.
- **ADR‑002**: ABAC via OPA with tenant/case scopes; policy bundles versioned.
- **ADR‑003**: Provenance evidence bundle format (JSON manifest + hashes + lineage graph).
- **ADR‑004**: Canary strategy (5%/15%/50% waves) with auto‑rollback triggers.
- **ADR‑005**: Residency & region sharding (Helm overlays, routing headers, data tags).

---

## 5) Data & Policy Model
- **Entities**: Investigation, Entity, Relationship, Document, Media, User, Tenant, Case, Policy, Evidence.
- **Edges**: belongsTo(Tenant→Case), contains(Case→Investigation), references(Investigation→{Document|Media}), mentions(Document→Entity), relates(Entity↔Entity), produced(Evidence→{Investigation|Release}).
- **Labels/Tags**: `purpose`, `license/TOS`, `retentionTier`, `sensitivity`.
- **Retention Defaults**: `standard-365d`; PII → `short-30d` unless legal‑hold; `long-1825d` for mandated archives.

---

## 6) APIs & Schemas
### 6.1 GraphQL (SDL – excerpt)
```graphql
"""Security & tenancy"""
scalar TenantID
scalar CaseID

interface Node { id: ID! createdAt: DateTime! updatedAt: DateTime! }

type Investigation implements Node { id: ID!
  title: String! description: String
  status: String! # draft|active|closed
  entities: [Entity!]! relationships: [Relationship!]!
  evidence: [Evidence!]!
}

type Evidence implements Node { id: ID! kind: String! # test-report|sbom|provenance|export
  hash: String! manifestUrl: String! createdBy: UserRef! }

"""Persisted queries only in prod – enforced at gateway"""
input PersistedQueryRef { sha256: String! name: String! }

# Mutations (excerpt)
input CreateInvestigationInput { title: String!, description: String, caseId: CaseID! }

type Mutation { createInvestigation(input: CreateInvestigationInput!): Investigation!
  runCopilot(investigationId: ID!, goal: String!, options: JSON): CopilotRun!
  exportEvidence(investigationId: ID!): Evidence!
}
```

### 6.2 Cypher/SQL (cost hints – excerpt)
```cypher
// 1‑hop neighborhood (SLO target p95 ≤ 300ms)
MATCH (i:Investigation {id:$id})-[:RELATES_TO]->(e:Entity)
RETURN e LIMIT 200;
```
```sql
-- Evidence insert with hash manifest
INSERT INTO evidence (id, kind, hash, manifest_url, created_by)
VALUES ($1,$2,$3,$4,$5);
```

---

## 7) Security & Privacy
- **AuthN/Z**: OIDC→JWT; ABAC via OPA sidecar; gateway enforces tenant/case claims.
- **Encryption**: TLS everywhere; field‑level enc for PII; KMS‑managed keys; envelope enc for exports.
- **Policies**: License/TOS classes; purpose limitation; retention tiers (auto purge); warrant/authority binding for sensitive queries.
- **Testing**: ZAP baseline; dependency+SBOM; secret scanning; policy simulation.

---

## 8) Testing Strategy
- **Unit** (Jest/ts‑jest), **Contract** (pact‑like for GraphQL schemas), **Integration** (containers), **E2E** (Playwright), **Load** (k6), **Chaos** (pod kills, DB failover), **Resilience** (retry/backoff), **Security** (ZAP), **Policy** (OPA).
- **Coverage Goals**: unit ≥80%, critical paths 100% E2E.
- **Golden Datasets**: Use `GOLDEN/datasets` for reproducible fixtures.

---

## 9) Observability & SLOs
- **Metrics**: latency histograms (p50/p95/p99), error rates, queue lag, ingest throughput, LLM token spend.
- **Traces**: Gateway→Service→DB; baggage includes tenant/case (hashed); exemplar sampling on error budget burn.
- **Dashboards**: API SLO, Graph Ops, Ingest, Cost, Error Budget, Release Health.
- **Alerts**: Multi‑window burn (2%/1h, 5%/6h), CI failure streaks, budget 80% threshold.

---

## 10) CI/CD & IaC
- **Pipelines**: lint→type→unit→build→int→e2e→load smoke; policy sim; SBOM; image signing; evidence bundle.
- **Release**: trunk‑based; weekly cut to staging, biweekly to prod; micro‑canary; rollback rules.
- **IaC**: Helm charts (overlays for region sharding); Terraform for cloud; SOPS for secrets.

---

## 11) Backlog (MVP‑2 → GA) & RACI
### 11.1 Epics → Stories → Tasks (excerpt)
**E‑01 Observability GA** (Must)
- S‑01 Grafana dashboards (API/Graph/Cost/Error Budget)
  - T‑01 Define Prom queries
  - T‑02 Add OTel spans/attributes
  - T‑03 Alert rules + Pager duty

**E‑02 Persisted Queries & ABAC** (Must)
- S‑02 Persisted query store + gateway enforcement
- S‑03 OPA policy bundles + CI sim

**E‑03 CI Green & E2E** (Must)
- S‑04 Fix Maestro pipeline failures
- S‑05 Playwright “critical flows” suite; flake triage bot

**E‑04 Release Safety** (Must)
- S‑06 Micro‑canary waves + rollback automation
- S‑07 Chaos drill runbook (T+24h) & report

**E‑05 Evidence & Exports** (Should)
- S‑08 Evidence bundle generator (hash manifest); attach to tags

**E‑06 Cost Guardrails** (Should)
- S‑09 LLM/infra cost exporters; unit cost widgets

### 11.2 RACI (example)
- **MC (you)**: Accountable for PRD, gates, SLOs, release.
- **Platform Lead**: Responsible for gateway/OPA/persisted queries.
- **SRE Lead**: Responsible for dashboards/alerts, chaos, canary/rollback.
- **Frontend Lead**: Responsible for Playwright flows & golden‑path UX.
- **Data Lead**: Responsible for Neo4j perf & ingest throughput.
- **Compliance**: Consulted for policy, evidence, retention.
- **All devs**: Informed via release notes + runbooks.

---

## 12) Deliverables (Evidence‑Backed)
- ADR‑001…005; PRD (this doc); dashboards JSON; alert rules; Playwright suite; k6 scripts; OPA bundles; SBOM + dep scan results; release notes + evidence bundle format.

---

## 13) Rollback/Backout
- Canary auto‑rollback on SLO breach or error spike; helm rollback; data migrations behind toggles; provenance ledger ensures auditability of reversions.

---

## 14) Timelines & Cadence
- Weekly staging cut; biweekly prod; pause if error‑budget <50% remaining.

---

## 15) Appendices
- **Threat Model (STRIDE)**: spoofing (OIDC misuse), tampering (graph writes), repudiation (audit gaps), info disclosure (field‑level enc), DoS (heavy queries), elevation (policy bypass). Mitigations enumerated above.
- **Abuse/Misuse**: mass scraping, over‑broad search, privacy‑violating queries; mitigated with rate limits, k‑anonymity, redaction.
- **Runbooks**: Deploy/Upgrade, On‑Call Triage, Neo4j failover, VACUUM/replica lag, LLM provider failover, provenance integrity checks.

