# IntelGraph — Summit • MVP‑2 and GA Product Requirements (PRD)

> Author: Guy IG (Principal Architect)
> Date: September 30, 2025
> Repo: `github.com/BrianCLong/summit` (public)

---

## 0) Executive Snapshot
IntelGraph is a deployable‑first, AI‑augmented intelligence analysis platform unifying ingestion → entity/relationship modeling → graph analytics → AI copilot → reporting. MVP‑0 and MVP‑1 functionality are live in the repo. This PRD defines **MVP‑2** (next shippable within the Summit track) and **General Availability (GA)** for an enterprise‑ready release.

**MVP‑2 Theme:** *Trustworthy, explainable graph AI + analyst‑grade workflows at scale.*  
**GA Theme:** *Federated, provable intelligence with governance and cost guardrails by default.*

**Primary personas:** Intelligence analyst, CTI/DFIR investigator, case supervisor/ombuds, data engineer, governance officer, and partner liaison.

**Golden Path (must never break):** Investigation → Entities → Relationships → Copilot → Results → Report/Export.

---

## 1) Where We Are (Baseline Capabilities)
*(high‑level synopsis; see repo docs for detail)*

- **Core platform online:** AuthN/AuthZ with JWT + RBAC + OPA; React front‑end (MUI/Redux), GraphQL API, Neo4j graph, Postgres/Timescale, Redis; local bootstrap via `make up` with optional AI/Kafka; smoke tests.
- **Analyst workflow:** create investigations, add entities/relationships, run basic link analysis, use Copilot for NL queries, view results.
- **Data intake:** CSV upload, STIX/TAXII support, sample simulators via Kafka option.
- **AI/ML surface:** multimodal extraction stubs (vision/OCR/STT/NLP), embeddings + vector search, cross‑modal matching.
- **Ops:** docker/compose, Grafana/Prometheus dashboards (basic), CI checks, security scaffolding.

> **Assumption:** These baselines are stable and deployable on developer machines and small servers; MVP‑1 introduced multimodal extraction and vector search.

---

## 2) North‑Star & Principles
- **Provenance over prediction:** every claim has source, transform, confidence, and license.
- **Compartmentation & consent:** multi‑tenant by default, case compartments, ABAC policy tags, reason‑for‑access prompts.
- **Explainable automation:** AI results are cited and reproducible; generated queries previewed before execution.
- **Operate degraded:** offline kits; CRDT sync on reconnect; reproducible exports.
- **Deployable‑first:** `make up`/`make smoke` are sacred. No merge may break the golden path.
- **Cost & safety guardrails:** budget‑aware query planning; policy‑bound actions.

---

## 3) MVP‑2 — PRD

### 3.1 Objectives & Outcomes
1) **Graph‑XAI v1:** explanations for pathfinding, centrality, and anomaly scores (saliency, paths, counterfactuals) rendered inline in UI.
2) **Entity Resolution v1 (ER‑Lite):** hybrid rules + probabilistic scoring with human‑in‑the‑loop reconcile queues; full provenance for merges/splits.
3) **Hypothesis Workbench v1:** competing hypotheses, evidence scoring, missing‑evidence prompts; narrative briefs with dissent slots.
4) **Provenance & Claim Ledger v0.9:** register evidence, transformation chains, and export manifests verifiable offline.
5) **Case Workflow v1:** tasks/roles/watchlists, SLA timers, 4‑eyes gate for risky operations; immutable comments & audit.
6) **Connectors Pack A (10+):** RSS/news, sanctions (OFAC/EU/UK), MISP, STIX/TAXII, CSV/Parquet, S3/HTTP; each ships with mapping manifest and golden tests.
7) **Ops & Guardrails:** SLO dashboards, cost guard (query budgets, slow‑query killer), rate‑limits, feature flags, chaos drills (pod/broker kill).

**Definition of Success (MVP‑2):**
- p95 of 3‑hop path query ≤ **1.5s** on 50k node synthetic.
- Time‑to‑first‑insight (seed → path) ≤ **5 min** with sample data.
- All analytics contributing to a report have **explainability panels** and **citations**.
- Reproducible **evidence export** validates with the external verifier.

### 3.2 Functional Requirements
**FR‑A Graph‑XAI**
- Expose per‑algorithm rationales: why a node is high betweenness; why this path; counterfactuals (what link removal flips result).
- API: `/xai/centrality`, `/xai/path/explain`, `/xai/anomaly/explain`.
- UI: XAI overlay toggles; tooltips show top k contributing nodes/edges with weights.

**FR‑B Entity Resolution (ER‑Lite)**
- Deterministic keys (email, phone, exact usernames) + fuzzy matchers (name, address, n‑gram entity keys).
- Scorecards with threshold bands; queue for human reconcile; full undo/merge history.
- Emits `Claim{merge|split}` with features used; every decision is revertible.

**FR‑C Hypothesis Workbench**
- Create hypotheses; attach evidence (nodes, edges, docs) with weights and confidence.
- CH/ACH matrix with automated prompts for counter‑evidence; dissent annex.
- Narrative builder: draft, cite, export; no uncited assertion allowed.

**FR‑D Provenance & Claim Ledger v0.9**
- Register sources, transforms, model versions, and hashes; produce export manifests.
- Verifier CLI: re‑compute checksums; fail on mismatch; print human‑readable chain‑of‑custody.

**FR‑E Case Workflow v1**
- Tasks, roles, SLA timers; watchlists; @mentions; legal hold flag.
- 4‑eyes gate for: merges, deletes, exports above sensitivity X.

**FR‑F Connectors Pack A**
- Minimal config UI; schema mapping wizard with AI suggestions; license/TOS enforcement at export.

**FR‑G Ops & Guardrails**
- Query budget per tenant; rate limiting; slow‑query killer; autoscaling policies documented.
- SLO dashboards (latency/availability/ingest lag); chaos game‑days with runbooks.

### 3.3 Non‑Functional Requirements (MVP‑2)
- **Performance:** as above; ingestion E2E for 10k docs ≤ **5 min**.
- **Security:** OIDC SSO; ABAC/RBAC; OPA policies; WebAuthn/FIDO2 optional; audit trails immutable.
- **Privacy:** purpose limitation tags; k‑anonymity presets for exports; PII classification at ingest.
- **Reliability:** RTO ≤ **1h**, RPO ≤ **5m** (tiered); PITR enabled; cross‑region replica optional.
- **Compliance:** license registry & authority binding (static analyzer) block disallowed exports.

### 3.4 System Design Deltas (MVP‑2)
- **Services:**
  - `graph‑xai‑svc`: wraps Neo4j analytics with explainer endpoints (paths, centrality, anomalies).
  - `prov‑ledger‑svc`: claim/evidence registry + manifest generator + verifier CLI.
  - `er‑svc`: ER scoring + queues + human‑in‑the‑loop API; uses Redis streams for jobs.
- **Data Model:** add `Claim`, `Evidence`, `Narrative`, `Hypothesis`, `License`, `Authority` nodes; policy labels on nodes/edges.
- **Pipelines:** OpenLineage hooks; feature store for anomaly features; Kafka optional path.
- **API:** GraphQL schema additions for XAI, ER, hypothesis, case workflow; query cost hints.
- **Frontend:** Tri‑pane (graph/timeline/map) with XAI overlays; Workbench and Case tabs; report studio.

### 3.5 Acceptance & Tests (MVP‑2)
- Unit/contract tests for GraphQL schema; golden IO tests for each connector.
- XAI snapshot tests on fixture graphs; ACH matrix E2E; export/verify round‑trip.
- K6 load tests; chaos drills (pod/broker kill) monthly; authz depth limits tests.

### 3.6 Deliverables (MVP‑2)
- Helm charts updated; Terraform modules for cloud quickstart; sample datasets; demo mode with synthetic data; user guide & cookbooks.

---

## 4) GA — PRD

### 4.1 Objectives & Outcomes
1) **Zero‑Copy Federation v1:** push‑down graph predicates to partner graphs; return only aggregates/claims + proofs.
2) **License/Authority Compiler v1:** compile case policies (licenses/warrants/DPAs) into query bytecode; unsafe ops are unexecutable.
3) **Selective Disclosure Wallets v1:** portable, revocable evidence bundles with audience filters; revocation propagates.
4) **Runbook Provers:** every runbook emits pre/post condition proofs (citations present, KPIs met) before export.
5) **Adversarial ML Red‑Team:** prompt‑injection, data‑poisoning, correlation‑leak drills with robust mitigations & regression baselines.
6) **Cost/Energy Governor:** budget‑aware planners, cached claims, and energy‑aware batch scheduling.
7) **Edge/Offline Kits v1:** CRDT sync, policy stubs, local PCQ; deterministic replay on reconnect.

**GA Success:**
- Federated query across two isolated graphs meets p95 latency SLOs and zero leakage checks.
- All exports/verdicts are reproducibly verifiable (manifests, citations, model cards).
- Quarterly red‑team runs archived; zero criticals open at GA freeze.

### 4.2 Functional Requirements
- **FR‑H Federation:** multiparty connector; remote capability registry; push‑down plans; claim‑only return with proofs.
- **FR‑I L/A Compiler:** static & dynamic analyzer; “policy diff simulator”; step‑up auth gates.
- **FR‑J Wallets:** audience scopes (court/press/partner); revocation timers; downstream dependency tracing.
- **FR‑K Runbook Provers:** machine‑checkable proofs of preconditions (legal basis, license scope) and postconditions (KPIs, citations).
- **FR‑L Red‑Team:** one‑click adversarial suites; robustness scores in XAI views; ombuds queue.
- **FR‑M Gov/FinOps:** unit‑cost views ($/insight), energy windows; budget alerts; query rewriting suggestions.
- **FR‑N Edge Kits:** expedition bundle; CRDT merges; conflict resolver; signed sync logs.

### 4.3 Non‑Functional Requirements (GA)
- **Scale:** 1M+ nodes/edges; streaming ingest > 5k events/s; horizontal read replicas.
- **Performance:** p95 < 1.5s for common 3‑hop queries; anomaly batch windows bounded; backpressure and budgets.
- **Security/Privacy:** STRIDE mapped; SSO/SCIM; WebAuthn; warrant registry; selector minimization; privacy‑by‑default exports.
- **Reliability:** Multi‑region failover; DR drills; SLO dashboards; autoscaling; cost guardrails.
- **Explainability:** XAI everywhere; model cards; reproducible runs w/ seeds/configs.

### 4.4 System Design Deltas (GA)
- **Services:** `federation‑gateway`, `policy‑compiler`, `wallet‑svc`, `redteam‑svc`, `finops‑svc`, `edge‑sync‑svc`.
- **Crypto/Proofs:** add PCQ (proof‑carrying queries) manifests; ZK overlap proofs for deconfliction.
- **Schemas:** authority, license, purpose clocks, retention, wallet.
- **Observability:** OpenTelemetry traces across services; latency/heatmap dashboards; audit search.

### 4.5 Acceptance & Tests (GA)
- Federation conformance suite (true/false overlaps, leakage bounds, latency SLOs).
- Policy compiler golden corpus: 100% hit‑rate; diff simulator outputs.
- Wallet revocation e2e: downstream derivatives expire on schedule; external validator flags modifications.
- Red‑team benchmarks show measurable robustness deltas; regression gates wired into CI.
- FinOps reports show 20–40% cost reduction on benchmark workloads.

### 4.6 Deliverables (GA)
- Helm/Terraform production reference; audit/compliance packs; playbooks & training (Analyst I/II, Ombuds).

---

## 5) UI/UX — Tri‑Pane + Workbenches
- **Graph/Timeline/Map** kept in lock‑step with brushable time; provenance tooltips and confidence opacity.
- **XAI overlays** per algorithm; “Explain this view” panel.
- **Workbench tabs**: Hypotheses, ER queue, Case/SLA, Runbooks, Red‑team.
- **Report Studio**: compose briefs with evidence maps and dissent excerpts; one‑click HTML/PDF; selective disclosure packager.

**A11y:** keyboard‑first, command palette, AAA.

---

## 6) Data & Security
- **Data model:** canonical ontology (Person, Org, Asset, Account, Location, Event, Document, Communication, Device, Vehicle, Infrastructure, FinancialInstrument, Indicator, Claim, Case, Narrative, Campaign, License, Authority, Sensor, Runbook).
- **Policy labels:** origin, sensitivity, clearance, legal basis, need‑to‑know, purpose limitation, retention class.
- **AuthN/Z:** OIDC, JWT, RBAC + ABAC via OPA; step‑up auth; reason‑for‑access prompts; audit trails immutable.
- **Privacy:** minimization at ingest; redaction presets; purpose clocks; k‑anonymity exports.
- **Crypto:** per‑tenant envelope encryption; field‑level crypto; optional enclave compute for sensitive tasks.

---

## 7) Observability, Ops & Resilience
- **SLOs:** p95 latency for 3‑hop queries; ingest lag; uptime; budget adherence.
- **Telemetry:** OTEL traces; Prometheus metrics; Grafana dashboards; cost heatmaps.
- **Resilience:** PITR, cross‑region replicas, controlled chaos; offline kits with CRDT; DR/BCP runbooks and exercises.
- **Admin Studio:** schema registry; connector health; job retries/backfills; feature flags; audit search.

---

## 8) Delivery Plan & Milestones
> **Calendar assumes TZ America/Denver; today = Sep 30, 2025.**

**MVP‑2 (Target window: Oct–Dec 2025)**
- **Oct:** graph‑xai‑svc alpha; ER‑Lite scoring; Workbench scaffolding; connectors A in dev; prov‑ledger schema.
- **Nov:** XAI overlays; ER queues; ACH & narrative builder; export/verify CLI; SLO dashboards & guardrails.
- **Dec:** hardening; golden path smoke; docs/cookbooks; demo script; pilot tenants.

**GA (Target window: Feb–May 2026)**
- **Feb:** federation‑gateway & policy‑compiler prototypes; wallets alpha; red‑team svc stub.
- **Mar:** federation conformance & leakage tests; wallet revocation; runbook provers; FinOps planner.
- **Apr:** edge kits; energy windows; compliance packs; DR/BCP drills.
- **May:** freeze, red‑team, scale tests; GA release.

---

## 9) Success Metrics
- **Analyst:** 30% faster time‑to‑COA comparison; ≥95% citability in briefs; <2% alert churn.
- **Ops:** 99.5% core uptime; cost/insight down 20–40%; chaos MTTR improvements.
- **Governance:** zero uncited assertions; 100% policy hits; audit verifications pass.

---

## 10) Risks & Mitigations
- **Risk: XAI correctness drift.** Mitigate with golden fixtures, human readable rationales, and regression gates.
- **Risk: ER false merges.** Strict thresholds, dual‑control merges, revert logs, and dissent capture.
- **Risk: Federation leakage.** ZK overlap tests; claim‑only returns; external audits.
- **Risk: Cost spikes.** Budget planner, query rewriting, archived tiers, async heavy jobs.
- **Risk: Model/Prompt attacks.** Red‑team suite + fleet policies; signed reasoning traces; prompt privacy.

---

## 11) Open Questions
- Minimum connector list for GA (legal/e‑discovery vs. SOC/XDR depth)?
- Default purpose clocks per data class?
- Which pilot tenants for federation trials?
- Target cloud(s) for reference deploy (AWS/GCP/Azure)?

---

## 12) Appendix — Engineering Backlog Seeds (by Service)
- **graph‑xai‑svc:** path counterfactuals; salient‑edge sampler; fairness probes; robustness toggles.
- **er‑svc:** blocking keys; fuzzy matchers; threshold tuning UI; reconcile queue metrics.
- **prov‑ledger‑svc:** claim graph; transform lineage; export manifest; verifier CLI.
- **federation‑gateway (GA):** remote caps; push‑down planner; claim marshaling + proofs; leakage tests.
- **policy‑compiler (GA):** static/dynamic analyzers; policy diff simulator; step‑up auth glue.
- **wallet‑svc (GA):** audience filters; revocation oracles; dependency tracing.
- **redteam‑svc (GA):** injection/poison suites; robustness scoring; ombuds queue.
- **finops‑svc (GA):** cost planner; $/insight reports; energy windows.
- **edge‑sync‑svc (GA):** CRDT sync; conflict resolver; signed logs.

---

## 13) Communications & Go‑to‑Market (GA)
- **Narrative:** verifiable intelligence, zero‑copy federation, auditable autonomy, deployable‑first.
- **Assets:** guided demo (investigation → XAI → ACH → report → selective disclosure); whitepaper on PCQ and federation; compliance one‑pagers.
- **Trials:** synthetic datasets; sandbox federation partner.

---

## 14) License & Ethics
MIT‑licensed core; no features that enable unlawful harm. All training and examples use consenting, synthetic, or properly licensed data. Dissent/ombuds workflows are first‑class and enforceable.

—

*End of PRD. This document is the single source of truth for MVP‑2 and GA scope; deviations require RFCs (ADR folder) and approval from Architecture + Product.*

