# IntelGraph — Product Requirements (MVP‑2 → GA)

_Chair: Markus Wolf — Council of Spies & Strategists_

---

## 0) Scope & Intent

This PRD translates the current IntelGraph repository state into a concrete build plan for **MVP‑2** and **GA**. It anchors on: deployability‑first, provenance‑first, compartmentation, explainable automation, and lawful/ethical guardrails. It provides acceptance criteria, architecture deltas, delivery checkpoints, and cutlines.

---

## 1) Where We Are (Baseline)

- **Core Platform running locally** via Docker (`make bootstrap/up/smoke`).
- **MVP‑0/1 implemented** at a functional level: authentication/RBAC/OPA, React frontend, GraphQL API, Neo4j + Postgres + Timescale + Redis, ingestion (CSV + STIX/TAXII), basic Copilot orchestration, graph analytics, dashboards, CI, OTEL/Prom metrics, persisted queries, tenant isolation primitives.
- **Golden Path** demo: Investigation → Entities → Relationships → Copilot → Results.
- **Repo Surface** (illustrative): `graph-service`, `graph-xai`, `prov-ledger` (proto), `predictive-threat-suite`, `data-pipelines/ingestion`, `apps/web`, `helm/terraform`, `ga-graphai`, `RUNBOOKS`, `SECURITY`, `docs/*`.
- **Open items** (representative): deepen provenance (claim ledger), unify XAI overlays across analytics, expand connectors, tighten policy-by-default, case collaboration/audit UX, cost guardrails, offline kit hardening, disclosure packaging with verifiable manifests.

**Assumptions for planning**

- Current stack versions: Node 20+, React 18, Apollo Server v4, Neo4j 5, Postgres 16 (+pgvector), Redis 7, Timescale 2, Docker Compose for local; GitHub Actions CI.
- Tenancy and OPA policies present but need scenario coverage and policy simulation.
- Copilot works for NL→Cypher and RAG basics; needs Evidence‑First GraphRAG and guardrail rationales.

---

## 2) Vision North Star (GA)

A **secure, multi‑tenant intelligence graph platform** with **provenance by design**, **compartmented case rooms**, **explainable AI across the stack**, **defensive deception tooling**, **lawful authority binding**, and **offline expedition kits**. The analyst UX is a synchronized **Graph + Timeline + Map** tri‑pane with XAI and provenance overlays; the org UX includes **audit, policy simulation, disclosure packager**, and **cost/reliability SLOs**.

---

## 3) MVP‑2 PRD

### 3.1 Objectives

1. **Provenance & Claim Ledger (PCL) v1** — verifiable chain‑of‑custody for all assertions.
2. **Graph‑XAI Overlays v1** — explainability panels for path, community, anomaly, ER.
3. **Evidence‑First Copilot v1** — NL→Cypher with preview + GraphRAG citations and guardrails.
4. **Connector/ETL Upgrade** — Ingest Wizard, 10 priority connectors with license/TOS enforcement.
5. **Case Spaces & Disclosure** — basic tasks, 4‑eyes gates, disclosure packager v1.
6. **Ops & Cost Guardrails v1** — query budgeter, slow‑query killer, SLO dashboards.

### 3.2 User Stories & Acceptance Criteria

**PCL v1**

- As an analyst, when I import/transform data, every node/edge gets a provenance chain (source→transform→hash; license + legal basis optional).
  - _Acceptance:_ exporting a case yields a **manifest** (Merkle tree + transforms) verifiable by the CLI; redaction map preserved; external verifier returns “valid”.
- As a reviewer, I can see contradictions between claims and trace their origins.
  - _Acceptance:_ a **Claim** view renders supporting/contradicting evidence; clicking entries highlights subgraph and sources.

**Graph‑XAI v1**

- As a user, any analytics result (path/community/anomaly/ER merge) shows “**Why?**” with features/parameters and counterfactual toggles.
  - _Acceptance:_ XAI pane displays top features, path rationales, and a one‑click “Show me the node/edge changes that would flip the result.”

**Evidence‑First Copilot v1**

- As an analyst, I type a natural‑language question and see generated **Cypher preview** with cost estimates; execution requires my confirm.
  - _Acceptance:_ ≥95% syntactic validity on test prompts; diff view vs manual query; rollback/undo.
- As a report author, my Copilot narrative includes inline **citations** resolvable to PCL entries; publishing is blocked when citations are missing.

**Connector/ETL Upgrade**

- Ingest Wizard maps CSV/JSON to canonical entities with **AI suggestions**, PII flags, and license checks in ≤10 minutes.
  - _Acceptance:_ golden fixtures pass; policy engine blocks disallowed fields with human‑readable reasons.
- Priority connectors (phase‑A 10): STIX/TAXII, MISP, CISA KEV, RSS/Atom, Wikidata, ACLED sample, sanctions (OFAC/EU/UK), DNS/WHOIS (licensed), CSV/Parquet, Slack/Jira meta (case‑scoped, consented).

**Case Spaces & Disclosure v1**

- Case roles (Owner/Analyst/Reviewer) with **four‑eyes** for risky exports; comments with immutable audit.
  - _Acceptance:_ disclosure pack bundles evidence + manifest + license terms; hash check passes on re‑import.

**Ops & Cost v1**

- SLO board: p95 graph query <1.5s (3‑hop/50k node graph); ingestion E2E <5m for 10k docs.
  - _Acceptance:_ alerts on SLO breach; budgeter enforces per‑tenant query tokens; slow‑query killer returns hint + partial results when enabled.

### 3.3 Architecture Deltas

- New **`prov-ledger` service boundary** (API + Kafka topics `claim.register`, `evidence.attach`, outbox→Graph).
- **Graph‑XAI API** stable surface for `paths`, `saliency`, `counterfactuals`, `er.explain`.
- **Policy engine**: OPA policies externalized; **policy simulation** dry‑run endpoint.
- **ETL assistant** embedded in `ingestion/*` with schema‑mapping suggestions and DPIA checklist.
- **Disclosure CLI** to sign/export/verify bundles.

### 3.4 UX Requirements (MVP‑2)

- Tri‑pane **Graph/Timeline/Map** with synchronized brushing; **Provenance tooltips**; **Explain this view** sidebar.
- Copilot panel with **Query Preview**, **Evidence Drawer**, and **Citations Status**.
- Ingest Wizard: drag‑drop, field mapping, PII badges, license banner, lineage preview.

### 3.5 Security, Privacy, Governance

- ABAC/RBAC enforced at query time; “reason‑for‑access” prompts; audit log immutability.
- **License/TOS engine**: block/allow at export with appeal workflow.
- **K‑anonymity/redaction** helpers in wizard + disclosure.

### 3.6 Non‑Functional

- Performance targets (above),
- Reliability: PITR, daily backups; RTO ≤ 1h, RPO ≤ 5m (Tier‑1 data),
- Observability: OTEL traces; Prom metrics; Grafana dashboards shipped.

### 3.7 Deliverables

- Services: `prov-ledger v1`, `graph-xai v1`, `policy-sim v1` (OPA wrapper), `disclosure-cli v1`.
- Apps: `apps/web` tri‑pane + XAI pane + Copilot preview & citations; Ingest Wizard.
- Docs: ONBOARDING updates; Admin Studio quickstart; XAI/Provenance model cards; Security/Privacy guide.
- Tests: golden fixtures; E2E ingest→resolve→report; chaos drill (pod/broker kill); cost guard tests.

### 3.8 Out‑of‑Scope (Cutlines)

- Federated multi‑graph search; advanced simulations; live disinfo campaigns; blockchain anchoring; air‑gapped update train.

---

## 4) GA PRD

### 4.1 Objectives

1. **Multi‑Tenant GA** with **Authority Binding** (warrant/legal basis) and **Policy Simulation**.
2. **PCL v2 (Verifiable Exports)** with external verifier + reproducible analysis bundles.
3. **Graph‑XAI v2** across anomaly/risk scoring, ER, forecasts; fairness/robustness dashboards.
4. **Predictive Threat Suite v1** (timeline forecast + counterfactual simulator) gated by XAI.
5. **Case Ops GA**: 4‑eyes everywhere, legal holds, disclosure packager v2, ombuds queue.
6. **Offline/Edge Kit v1**: CRDT merges, signed resync logs, conflict resolution UI.
7. **Runbook Library (25+)** with replay logs and KPIs across CTI/DFIR/AML/Humanitarian.

### 4.2 Acceptance Highlights

- **Authority Binding**: every sensitive query carries legal basis; policy sim shows “before/after” diffs on rule changes.
- **PCL v2**: export → third‑party verifier (CLI + docs) passes; contradiction graphs included; retention/purpose tags preserved.
- **XAI v2**: each model ships a **Model Card**; dashboards show performance by subgroup; counterfactuals logged.
- **Predictive v1**: time‑horizon forecasts with confidence bands; counterfactual simulator with assumptions log.
- **Case GA**: disclosure pack includes **right‑to‑reply** fields; dual‑control deletes; immutable audit with anomaly alerts.
- **Offline v1**: expedition kit reproduces tri‑pane locally; merges on reconnect; divergence report.

### 4.3 Architecture Deltas (GA)

- Event mesh hardened (Kafka + outbox/idempotency);
- **Gateway** with persisted GraphQL queries + cost limits;
- **Schema registry** for canonical model;
- **Feature Store** for anomaly/risk scoring;
- **Admin Studio** for schema/connector health/job control/feature flags.

### 4.4 SLOs/Resilience (GA)

- p95 query <1.5s on 100k nodes/300k edges (3‑hop); sustained ingest >5k events/s; autoscaling rules documented.
- DR: cross‑region replicas; monthly chaos drills; recorded incident runbooks.

### 4.5 Security & Compliance (GA)

- STRIDE‑mapped controls; SBOM + dependency scanning; WebAuthn/FIDO2 step‑up;
- Privacy: minimization at ingest; purpose limitation; data residency/jurisdiction routing;
- Governance: ombuds reviews; abuse‑of‑power tripwires; insider‑risk analytics with consent and due‑process; warrant registry.

### 4.6 Deliverables (GA)

- Services: `predictive-threat-suite v1`, `featurestore v1`, `admin-studio v1`, `gateway v1`, `offline-kit v1`.
- Apps: tri‑pane GA with **Explain this view**, runbook runner, disclosure v2, policy sim UI, authority binding prompts.
- Docs: Model Cards; Security/Privacy Ops; Operator OPSEC training (defensive); Playbooks/Cookbooks.

---

## 5) Backlog → Milestones

### M‑1 (MVP‑2 Core)

- PCL v1, Graph‑XAI v1, Copilot preview+citations, Ingest Wizard P1 connectors, SLO board, Cost guard.

### M‑2 (MVP‑2 UX & Case)

- Case spaces v1, disclosure v1, tri‑pane polishing, OPA policy sim, docs & golden demos.

### M‑3 (GA Core)

- Authority binding + policy sim UI; PCL v2; Runbooks 15+; Feature Store; Predictive v1; Admin Studio; Offline kit v1.

### M‑4 (GA Hardening)

- Fairness/robustness dashboards; DR drills; cross‑region replicas; integrations depth; runbooks 25+; compliance pack.

---

## 6) Risks & Mitigations

- **Data licensing & privacy** → License engine + consent receipts + export blockers with appeal.
- **Model misuse/prompt‑injection** → Guardrail reasoner; quarantine/red‑team logs; sandwich explanations.
- **Query cost explosions** → Budgeter, persisted queries, planner hints, slow‑query killer, partial results.
- **ER/Anomaly false positives** → Human‑in‑the‑loop adjudication; confidence bands; counterfactual checks.
- **Tenant bleed/ABAC drift** → Policy simulation; chaos tests for tenant separation; audit anomaly alerts.

---

## 7) Success Metrics

- **TTI (time‑to‑insight)** reduction ≥40% on labeled tasks.
- **Citation coverage**: 100% of published briefs cite evidence; 0 uncited claims allowed.
- **SLO adherence**: p95 met ≥99% days/month; cost budget breaches auto‑curtailed.
- **Runbook adoption**: ≥60% of cases use at least one runbook; replay fidelity verified.

---

## 8) Appendices

### A) Canonical Data Model (excerpt)

- Entities: Person, Org, Asset, Account, Location, Event, Document, Communication, Device, Vehicle, Infrastructure, FinancialInstrument, Indicator, Claim, Case, Narrative, Campaign, Authority, License.
- Edges: communicatesWith, funds, controls, locatedAt, observedWith, derivedFrom, contradicts, supports, mentions, attributedTo.
- Temporal: `validFrom/validTo`, `observedAt/recordedAt` (bitemporal).

### B) API Surfaces (delta)

- `POST /claims/register`, `POST /evidence/attach`, `GET /claims/:id`, `GET /export/:caseId/manifest`.
- `POST /policy/simulate`, `GET /policy/diff`.
- `POST /copilot/compile` → Cypher + cost plan; `POST /copilot/publish` with citation check.

### C) Test/Validation

- Unit/contract tests for connectors & GraphQL; Cypher test benches; k6 load tests; chaos; soak; authz depth tests.

### D) Won’t‑Build (Ethics Gate)

- Targeted violence enablement, unlawful surveillance, bulk deanonymization without lawful authority, human‑subject manipulation.

— _End of PRD_ —
