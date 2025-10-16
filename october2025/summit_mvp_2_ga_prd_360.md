# Summit — MVP‑2 & GA PRD (360°)

*A living product spec that unifies product, architecture, UX, data, ops, and governance. This version assumes current public repo state and the Council Wishbooks as the north star. Ethics and lawful‑use guardrails apply everywhere. “Provenance Before Prediction.”*

---

## 0) TL;DR

- **Theme:** Ship a credible **intel‑graph core** with **auditable AI** and **oversight by design**, then layer **verifiable trust** & **federated leverage**.
- **MVP‑2 (Next 6–10 weeks):** Solidify ingest→graph→analysis→RAG→report loop; lock multi‑tenant authz, provenance export, tri‑pane UI, core runbooks, SLOs, and cost guard.
- **GA (Post‑MVP‑2, 2–3 releases):** Graph‑XAI everywhere, prov‑ledger GA, predictive suite beta→GA, federated search alpha, offline kit v1, deeper integrations, expanded runbooks, policy binding at query time, disclosure bundles.

**Success criteria:** Analysts complete 3 canonical tasks end‑to‑end on synthetic/demo data with citations and provenance in < 45m, audited. Cost/SLOs enforced. Exports verifiable.

---

## 1) Where We Are (Repo Reality Check)

**Active surfaces (representative):**
- `apps/web/` React+TS+Tailwind tri‑pane UI foundation; auth/routing; graph explorer; alerts; case mgmt basics.
- `server/src/ai/*` extraction engines (OCR/STT/object/face* for **redaction/analysis only**), deepfake sentinel/triage, investigative thread quality agent, XAI audit logging, service continuity orchestrator.
- `graph-xai/` explainability APIs (paths, counterfactuals, saliency, fairness, robustness) + ethics/audit hooks.
- `prov-ledger/` provenance/claim ledger service: evidence registration, claim parsing, export manifests.
- `predictive-threat-suite/` timeline prediction, causal explainer, counterfactual simulator; Helm chart stubs.
- `data-pipelines/`, `ingestion/`, `connectors/`: universal ingest clients, CSV/Kafka consumers, mapping contracts.
- `helm/`, `terraform/`: deploy charts and infra modules.
- `docs/project_management/*`: epics (Autonomous Copilot, War Rooms, Federated Search, Predictive Graph AI, Real‑Time Simulation, Unified Multimodal Graph), roadmaps/RACI.

**Gaps to close for productization:**
- Contract tests + fixtures per connector; GDPR/License policy checks wired to ingest/export.
- p95 query/SLOs consistently observed + dashboards; cost guard policies enforced.
- Audit trail end‑to‑end (who/what/why/when) exposed to Admin/Ombuds.
- Acceptance packs (golden data + reproducible outputs) per critical capability.

---

## 2) Product Objectives

1) **Analyst‑grade core**: ingest→resolve→analyze→hypothesize→simulate→decide→report with citations & provenance.
2) **Auditable AI**: glass‑box copilot generates Cypher/SQL with preview, GraphRAG with inline citations, and XAI panels.
3) **Oversight by design**: ABAC/RBAC, OPA policies, reason‑for‑access prompts, warrant/license binding at query/export.
4) **Operate degraded**: offline/edge kit (v1) with CRDT sync and verifiable resync logs.
5) **FinOps & SRE**: cost guard, SLOs, chaos drills, RTO/RPO, autoscaling, observability.

---

## 3) MVP‑2 Scope (What We Will Ship Next)

### 3.1 Functional Scope
- **A. Ingest & Prep**: Connector catalog (10–15), ingest wizard (schema map, PII classifier, DPIA checklist, redaction presets), streaming ETL enrichers (GeoIP, lang, hash/perceptual hash, EXIF scrub, OCR), **Data License Registry** with query‑time/export enforcement.
- **B. Graph Core**: Canonical ER model (Person, Org, Asset, Account, Location, Event, Document, Communication, Device, Vehicle, FinancialInstrument, Infrastructure, Claim, Indicator, Case), bitemporal truth, geo‑temporal constructs (trajectories, stay‑points), provenance/lineage on every node/edge, policy labels.
- **C. Analytics & Tradecraft**: link/path/community/centrality suite; pattern miner (temporal motifs, co‑travel/co‑presence, structuring); anomaly/risk scoring with feature store + triage queues; **Hypothesis Workbench** (competing hypotheses, Bayes updates, evidence weights); **COA planner** (DAGs + Monte‑Carlo) with assumptions logged.
- **D. AI Copilot (Auditable)**: NL→generated Cypher preview with row/cost estimates and sandbox execute; GraphRAG with inline snippet citations; schema‑aware ETL assistant; narrative builder (timelines/maps from graph snapshots); guardrails (policy reasoner explains denials).
- **E. Collaboration & Workflow**: Case spaces (tasks/roles/watchlists; 4‑eyes for risky steps), report studio (timeline/map/graph figures), commenting + legal hold, **Disclosure Packager** (manifest with hashes & license terms).
- **F. Security/Governance**: multi‑tenant isolation; ABAC/RBAC; **OPA externalized policies**; SCIM; OIDC SSO; WebAuthn/FIDO2; comprehensive audit (who/what/why/when) with reason‑for‑access prompts; **Policy Simulation** dry‑runs.
- **G. Ops/Observability/Reliability**: OTEL traces, Prom metrics, latency heatmaps; **Cost Guard** (budgeter + slow‑query killer + archival tiering); DR/BCP (PITR, cross‑region replicas); **Offline kit v1** (CRDT merges + signed sync logs); Admin Studio (schema registry, connector health, retries/backfills).
- **H. Frontend Experience**: command palette, A11y AAA, dark/light, undo/redo, tri‑pane (timeline/map/graph) with synchronized brushing, **Explain this view** panel with provenance tooltips and confidence opacity.
- **I. Starter Runbooks (DAGs)**: R1 Rapid Attribution (CTI), R2 Phishing Cluster (DFIR), R3 Disinformation Mapping, R4 AML Structuring, R5 Human Rights Vetting, R6 Supply‑Chain Compromise, R7 Insider‑Risk (consent‑bound), R8 Infrastructure Sabotage (defensive sim), R9 Crisis Ops (civic), R10 Dark‑Web Lead Vetting (lawful).

### 3.2 Non‑Functional Scope
- **Performance targets:** p95 graph query < **1.5s** at 3 hops, 50k neighborhood; ingest 10k docs ≤ **5m**.
- **Reliability:** RTO ≤ **1h**, RPO ≤ **5m** (tiered). Monthly chaos drills (pod/broker kill; topology failover).
- **Security/Privacy:** STRIDE controls mapped; SBOM, dependency scanning, secret hygiene; minimization at ingest; purpose limitation tags; dual‑control deletes; redaction tools; export manifests verifiable.
- **Compliance:** DPIA templates; warrant/authority registry; audit immutability; right‑to‑reply fields.
- **FinOps:** dashboards for unit costs; budget caps; downshift modes; archival policies.

### 3.3 Acceptance & Demos
- Golden‑path E2E: “Ingest → Resolve → Runbook → Report” with reproducible screenshots & manifests.
- Connector conformance tests (manifest, mapping, rate‑limit policy, golden IO).
- GraphRAG citations resolve to evidence; missing citations block publish.
- COA comparisons deliver likelihood/impact bands + sensitivity sliders; assumptions logged.
- Export bundles include hash manifest & transform chain; external verifier passes.

### 3.4 Out of Scope (for MVP‑2)
- Multi‑graph federation (push‑down/cross‑tenant) — prototype later.
- ZK deconfliction & proof‑carrying queries — move to GA+.
- Advanced simulations market; narrative causality tester; liaison escrow — GA+.

---

## 4) GA Scope (What “Core GA” Includes)

**Adds on top of MVP‑2:**
- **Graph‑XAI everywhere** (anomaly/ER/forecasts; fairness/robustness views).
- **Prov‑Ledger GA** (claim extraction, contradiction graphs, disclosure bundles; external verifier CLI).
- **Predictive Suite** beta→GA (timeline forecasting w/ confidence bands; causal explainers; counterfactual sim).
- **Federated Search (alpha)** — push‑down predicates to partner graphs (claims only, no raw copy) behind feature flag.
- **Offline/Edge Kit v1** productionized (CRDT merges, conflict resolver UI, signed resync logs).
- **Warrant/Authority Binding at query time** (policy reasoner annotates/blocks; simulation for policy changes).
- **Expanded Runbooks (25+)** across CTI/DFIR/Fraud/Civic/Ops incl. policy change simulation, audit closure sprint, cost‑guard enforcement, retention/purge, tenant separation tests.
- **Integrations:** SIEM/XDR bridges (Splunk/Elastic/Chronicle/Sentinel), STIX/TAXII bi‑dir, MISP/OpenCTI bridges, GIS layers, Relativity/Nuix exports.

**Stretch (post‑GA):** federated multi‑graph GA, deconfliction across tenants (hashed/ZK), advanced simulations (network interdiction & narrative), crisis cell live ops.

---

## 5) Target Architecture (Service Boundaries)

- **GraphQL Gateway** (persisted queries, field‑level authz, cost limits) → **Graph Store** (Neo4j/JanusGraph option) with bitemporal + geo.
- **Provenance & Claim Ledger** (service): evidence registry, claim parsing, contradiction graphs, export manifests (+ external verifier).
- **AI Services**: NL→Cypher generator, GraphRAG retriever, XAI explainers, predictive suite. All runs emit **XAI cards** + **replay seeds**.
- **Ingest/ETL**: connectors → streaming enrichers (OCR/STT/perceptual hash/EXIF scrub) with PII detection + license tagging.
- **Policy Engine**: OPA for ABAC/RBAC & license/TOS engine; policy simulation environment.
- **Audit/Compliance**: immutable audit store; reason‑for‑access prompts; warrant/authority registry; disclosure packager.
- **Admin/Observability**: OTEL/Prom stack; SLO dashboards; cost guard; chaos/DR orchestrator; Admin Studio.
- **Edge/Offline**: CRDT storage; sync service with signed logs; divergence reports; operator approvals.

**Data flow:** Source → Ingest+Enrich → Canonical Graph (+policy labels) → Analytics/AI/XAI → Case/Reports → Disclosure Manifests → External Verifier.

---

## 6) API Contracts (Excerpts)

- **Graph**: `query Subgraph(timeSlice?, policyFilter?)`, `mutation UpsertEntity`, `mutation LinkEntities`, `query Paths(A→B, constraints)`.
- **Provenance**: `POST /prov/registerEvidence`, `POST /prov/claim`, `GET /prov/manifest/:exportId`, `GET /prov/contradictions?entityId=...`.
- **Copilot**: `POST /copilot/generateCypher { prompt } → { cypher, cost, sampleRows }` (requires sandbox token).
- **RAG**: `POST /rag/search { caseId, question } → { passages[], citations[] }` (citations carry evidence IDs and offsets).
- **Policy/Audit**: `POST /policy/simulate`, `GET /audit/trail?entityId=...`, `POST /access/reason`.
- **Runbooks**: `POST /runbooks/execute { id, inputs } → { dagRunId, replaySeed, artifacts[] }`.

---

## 7) Canonical Data Model (Essentials)

**Entities:** Person, Org, Asset, Account, Location, Event, Document, Communication, Device, Vehicle, FinancialInstrument, Infrastructure, Claim, Indicator, Case, Narrative, Campaign, Authority, License.

**Edges:** communicatesWith, funds, controls, locatedAt, observedWith, derivedFrom, contradicts, supports, mentions, attributedTo.

**Labels/Tags:** sensitivity, legalBasis, purpose, retentionClass, licenseClass, clearance, needToKnow.

**Temporal:** `validFrom/validTo`, `observedAt/recordedAt` for bitemporal truth; time‑slice queries.

**Provenance:** source→transform chain, checksum, model/version, confidence; export manifest (hash tree + transform chain).

---

## 8) Security, Privacy, Compliance

- ABAC/RBAC via OPA; SCIM for users/groups; OIDC SSO; step‑up auth (WebAuthn/FIDO2).
- Privacy‑by‑design: minimization at ingest; k‑anonymity/redaction suite; purpose limitation; jurisdictional routing; data residency tags.
- Immutable audit; reason‑for‑access prompts; ombuds review queues; dual‑control deletes; license/TOS engine with human‑readable denials + appeal path.
- Threat model: insider misuse, model prompt injection, data poisoning, lateral movement; controls include honeytokens, query heuristics, anomaly alerts, red‑team drills.

---

## 9) Observability, Reliability & SRE

- **SLOs:** p95 query <1.5s (3 hops, 50k neighborhood); ingest 10k docs in ≤5m; uptime 99.5% (MVP‑2) → 99.9% (GA).
- **Signals:** traces, metrics, logs; saturation maps; SLO burn alerts.
- **Ops Runbooks:** perf regression, ingest backlog, authz drift, cost spike, poisoned feed.
- **DR/BCP:** PITR, cross‑region replicas; monthly chaos; autoscaling policies; cost guard dashboards.

---

## 10) FinOps & Unit Economics

- Unit costs tracked per GB‑ingest, per‑edge storage, per‑query CPU/inference; quotas.
- Budget caps and downshift modes; archival policies; spot‑friendly workers.
- Tenant cost explorer; ROI proxies (time‑to‑insight, false‑positive reduction).

---

## 11) UX: Core Flows & Screens (MVP‑2)

1) **Ingest Wizard** → map schema, PII flags, license rules, sample preview, lineage.
2) **Graph Explorer** → pivot/link/path; filters (time/space/policy); XAI overlay.
3) **Copilot Panel** → NL prompt → Cypher preview (cost/rows) → sandbox execute → diff vs manual.
4) **Hypothesis Workbench** → competing hypotheses, evidence weights, missing‑evidence prompts.
5) **COA Planner** → DAG builder; likelihood/impact bands; sensitivity sliders; assumptions ledger.
6) **Report Studio** → timeline/map/graph figures; narrative builder; inline citations; disclose packager.
7) **Audit & Policy** → access reasons; appeals; policy simulation.

A11y AAA; keyboard‑first; dark/light; undo/redo; “Explain this view.”

---

## 12) Runbook Library (Initial)

- R1–R10 as listed in 3.1 *I*. Each ships with: Purpose, Triggers, Inputs, Outputs, Preconditions (legal/authority), Steps, KPIs, Failure Modes, XAI notes, Rollback.

**GA adds:** Policy Change Simulation, Audit Closure Sprint, Cost Guard Enforcement, Retention/Purge, Tenant Separation Tests, plus domain runbooks to 25+.

---

## 13) Roadmap & Milestones

**MVP‑2 (6–10 wks)**
- ✅ Ingest wizard + 10–15 connectors (manifests, tests).
- ✅ Graph core (bitemporal + geo) + ER explainability scorecards.
- ✅ Link/path/community suite + pattern miner subset + anomaly triage.
- ✅ Copilot NL→Cypher preview + GraphRAG with citations; narrative builder.
- ✅ Prov‑ledger beta: export manifest + external verifier alpha.
- ✅ Case/Report studio + disclosure packager.
- ✅ ABAC/RBAC via OPA; audit trail; policy simulation; license/TOS engine (block/appeal).
- ✅ Observability (OTEL/Prom), Cost Guard, DR/BCP; offline kit v1.
- ✅ Acceptance packs & demo datasets; E2E screenshot diffs; chaos drill #1; security checks.

**GA (Next 2–3 releases)**
- Graph‑XAI everywhere; predictive suite beta→GA; prov‑ledger GA (contradiction graphs).
- Federated search alpha; offline kit v1 harden; integrations (SIEM/XDR, STIX/TAXII/MISP/OpenCTI, GIS, Relativity/Nuix).
- Runbooks to 25+; policy binding at query time; expanded Admin Studio; monthly chaos cadence.
- Performance hardening; SLO ↑ to 99.9%; FinOps dashboards; a11y audits.

**Post‑GA (H2+):** federated multi‑graph GA; cross‑tenant hashed/ZK deconfliction; advanced simulations, narrative causality tester; liaison escrow; crisis cell live ops.

---

## 14) KPIs & Exit Criteria

- **Analyst Productivity:** time‑to‑first‑insight; task completion time; path discovery rate.
- **Trust & Integrity:** % exports with valid manifests; external verifier pass rate; contradiction coverage.
- **Safety & Compliance:** policy‑blocked attempts with clear reasons/appeals; ombuds cycle time; adverse event rate.
- **SRE & Cost:** p95 query; ingest latency; uptime; $/insight; SLO burn; cost guard savings.
- **Adoption:** connectors enabled; runbooks executed; active case spaces.

**MVP‑2 exit:** all acceptance tests green; three reference runbooks produce reproducible reports with citations & manifests; SLOs met for a week; chaos drill passes.

---

## 15) Risks & Mitigations

- **Scope creep** → Rigid MVP‑2 cut; feature flags; weekly governance review.
- **Graph perf under load** → caching, hot/cold tiering, backpressure; Jepsen‑style consistency tests.
- **Citation brittleness** → strict publish‑blockers when citations missing; evidence manifolds.
- **Policy complexity** → policy simulator + golden packs; ombuds appeal path.
- **Connector fragility** → contract tests + sample fixtures; synthetic data for demos.
- **Security posture** → SBOM, dependency scans; red‑team prompts; honeytokens; immutable audit.

---

## 16) Open Questions (Track to Decision)

1) Neo4j vs JanusGraph target for GA? (Migrate path, perf tradeoffs.)
2) Minimum viable predictive horizon & models for first GA? (Bench + datasets.)
3) Data residency/jurisdiction tags default policy per environment?
4) Disclosure bundle format v1 (JSON‑LD vs custom + external verifier interface details).
5) STIX/TAXII vs OpenCTI bridge priority ordering.
6) Offline kit device storage encryption & key management details.

---

## 17) Appendix — Repo Mapping → Capabilities

- `apps/web/` → tri‑pane UI, command palette, explain‑this‑view, report studio.
- `server/src/ai/*` → NL→Cypher, GraphRAG, OCR/STT/redaction helpers, deepfake sentinel, XAI audit logs.
- `graph-xai/` → path/counterfactual/saliency/fairness/robustness APIs; ethics overlays.
- `prov-ledger/` → evidence registration, claim/manifest services, contradiction graphs (GA).
- `predictive-threat-suite/` → timeline forecasting, causal explainer, counterfactual sim.
- `ingestion/`, `connectors/`, `data-pipelines/` → ingest wizard + streaming ETL enrichers + license tagging.
- `helm/`, `terraform/` → deploy/IaC; DR/BCP scaffolding; sealed‑secrets.
- `docs/project_management/*` → epics → roadmap alignment (Autonomous Copilot, War Rooms, Federated Search, Predictive Graph AI, Real‑Time Simulation, Unified Multimodal Graph).

---

### Ethic Gates (Reaffirmed)
No targeted violence enablement, unlawful surveillance, mass repression instrumentation, or human‑subject manipulation. Deception tooling is **defensive/testing only** with risk caps. All exports carry provenance manifests. All high‑risk actions require dual‑control and dissent capture.

---

**Owner:** Product (Confidential Design) • **Partners:** Eng, UX, SRE, Security, Ombuds • **Review Cadence:** Weekly ship room + Monthly council review.

