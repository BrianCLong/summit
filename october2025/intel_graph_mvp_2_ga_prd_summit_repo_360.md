# IntelGraph — MVP‑2 & GA PRD (Summit repo, 360°)

> Author: J. Robert LeMay — blunt, surgical, outcomes‑first. This is the cut list and the build list.

---

## 0) TL;DR (Orders)
- **MVP‑2 ships**: hardened core (graph + copilot + ingest), provenance-on-export, 10 golden connectors, case spaces, tri‑pane UI, SLO dashboards, policy guardrails (OPA), cost guard, and smoke‑clean deploys (`make up`, `make smoke`) on fresh machines.
- **Tech North Star (GA)**: multi‑tenant, evidence‑first **intelligence graph** with **provenance ledger**, **Graph‑XAI**, defensive **predictive suite**, and **offline expedition kit** — governed by **ABAC/OPA** and audited end‑to‑end.
- **What’s out** for MVP‑2: exotic simulations, federation, marketplace, anything that fights the clock.

---

## 1) Where We Are (Repo → Reality)
**Golden path works locally** with Docker: frontend (React @ 3000), GraphQL API @ 4000, Neo4j @ 7474, optional AI/Kafka add‑ons. Quickstart and smoke path exist. Baseline feature set lands as: auth (JWT/RBAC/OPA), graph analytics (Neo4j + Postgres/Timescale + Redis), AI copilot orchestration, CSV + STIX/TAXII ingest, OpenTelemetry/Prometheus/Grafana, persisted queries, tenant isolation, audit logging. UI ships with real‑time graph, layouts, collaboration presence, NL query, A11y baseline. **MVP‑0/1 are tagged complete** in README‑level claims.

**Code surface (high‑signal folders)**: `apps|frontend`, `graph-service`, `graph-xai`, `data-pipelines|connectors`, `copilot`, `governance|controls`, `feature-flags`, `etl/openlineage`, `finops`, `grafana/dashboards`, `helm|compose|deploy`, `RUNBOOKS`, `docs`. The repo shows **3.7k+ commits**, active issues/PR volume, and “deployable‑first” doctrine baked into Make targets and docs.

**Operational posture**: smoke tests, OTEL traces, Grafana boards, ZAP/security scaffolding, CI bits, and feature flags exist; chaos artifacts are present but not productionized.

**Reality check risks**: breadth > depth in places (many modules, uneven maturity), provenance/export integrity partial, ER explainability likely basic, guardrails/policy sim not fully enforced, connectors coverage uneven, offline/edge not integrated, golden demo happy‑path fragile under load.

---

## 2) What We Need (Gap Map → MVP‑2/GA)
### 2.1 Non‑negotiables for MVP‑2
1) **Provenance & Export Integrity v1** — every export bundles a manifest (hash tree + transform chain) and is verifiable offline.
2) **Case Spaces & Audit** — tasks/roles, @mentions, immutable audit, 4‑eyes on high‑risk steps.
3) **Guardrails** — OPA‑backed ABAC; reason‑for‑access prompts; license/TOS enforcement on export.
4) **Ingest→ER→Graph happy path** — CSV + STIX/TAXII + at least 8 more high‑value connectors with schema mapping, PII flags, and lineage recording.
5) **Tri‑pane analyst UI** — synchronized **Timeline + Map + Graph** with time‑brushing, pinboards, saved views, and **“Explain this view.”**
6) **SLOs + Cost Guard** — p95 graph‑query target, ingest E2E target, query budgets, slow‑query killer, archived tiering.
7) **Copilot with citations** — NL→Cypher preview with cost estimate, sandbox execution, **inline citations** in reports.
8) **Smoke‑clean deploys** — one‑command up, gold tests, per‑PR preview env.

### 2.2 Non‑negotiables for GA
- **Graph‑XAI everywhere** (why this path, why this merge, why this score) with model cards & replay logs.
- **Predictive Threat Suite (defensive)**: timeline forecast stub + counterfactuals, causal explainer, COA comparison.
- **Offline expedition kit v1**: CRDT sync, signed resync logs, divergence report.
- **Multi‑tenant hardening**: strict isolation, SCIM, WebAuthn, warrant registry, policy simulation.
- **Runbook library (10 productionized)** with KPIs & XAI notes.

---

## 3) MVP‑2 — Product Requirements (PRD)
### 3.1 Goals & Success Metrics
- **Goal**: Analysts complete the **Ingest → Resolve → Analyze → Hypothesize → Report** loop with verifiable exports in ≤ **60 minutes** on a new tenant.
- **North‑stars**: time‑to‑first‑insight ↓ 40%, false‑positive rate at triage < 2%, export verifier pass rate = 100%, p95 query < 1.5s on standard bench, zero broken golden‑path merges.

### 3.2 Personas
- CTI/DFIR Analyst, Fraud Investigator, Policy Advisor, Ombudsman, SRE/Operator.

### 3.3 User Stories (must‑have)
1) **As an analyst**, I map a CSV or STIX feed to canonical entities in <10 min, with PII flags and license hints.
2) **As a case lead**, I collaborate in a **case space** with tasks, mentions, and immutable audit; risky actions require 4‑eyes.
3) **As an analyst**, I run NL prompts that show **generated Cypher**, cost/row estimate, and sandbox results before commit.
4) **As a reviewer**, I export a **disclosure bundle** with provenance manifest; a verifier tool validates it offline.
5) **As an operator**, I see SLO dashboards, hot queries, and can kill/limit costly workloads; budgets auto‑throttle.
6) **As a governance officer**, I get **reason‑for‑access** prompts and a license/TOS engine that blocks disallowed exports with an appeal path.

### 3.4 Functional Requirements
**FR‑1 Ingest & ETL Assistant**
- Connectors v1 (see §7.1): CSV, STIX/TAXII, MISP, RSS/HTTP, S3/Blob, Email (EML/MSG metadata), DNS/WHOIS, sanctions lists, CISA KEV, AbuseIPDB.
- Schema‑aware mapping w/ AI suggestions; DPIA checklist; PII classifier; redaction presets; lineage on every transform.

**FR‑2 Entity Resolution v1.5**
- Deterministic + probabilistic candidates; explainable scorecards; reversible merges; adjudication queue.

**FR‑3 Graph Core & Queries**
- Bitemporal edges; snapshot‑at‑time queries; geo‑temporal primitives (trajectory, stay‑point, co‑presence windows).

**FR‑4 Copilot (Auditable)**
- NL→Cypher preview; cost/row estimate; sandbox; rollback; citations that link to evidence snippets.

**FR‑5 Analyst UI (Tri‑pane)**
- Synchronized timeline/map/graph; pinboards; saved views; **Explain This View** overlay (paths, filters, time scope).

**FR‑6 Collaboration & Audit**
- Case spaces; tasks/mentions; immutable audit; legal hold; disclosure packager (manifest + license terms).

**FR‑7 Security & Governance**
- ABAC/RBAC via OPA; SCIM users; WebAuthn optional; reason‑for‑access prompts; policy simulation (dry‑run) for changes.

**FR‑8 Ops, SLO & Cost Guard**
- OTEL traces; Prom metrics; p95/p99 heatmaps; query budgets; slow‑query killer; cold tiering to S3/Glacier; admin console.

### 3.5 Non‑Functional Requirements
- **Performance**: p95 < 1.5s (3‑hop, 50k node neighborhood), ingest 10k docs in ≤ 5m.
- **Reliability**: RTO ≤ 1h, RPO ≤ 5m; monthly chaos drill; autoscaling policies codified.
- **Security/Privacy**: field‑level labels, minimization at ingest, envelope encryption per tenant; immutable audit.
- **Compliance**: warrant/authority tags at query time; DPIA templates; export manifests.
- **Explainability**: model cards; rationale logs; replayable runs.

### 3.6 Acceptance Criteria (samples)
- **CSV→Graph** wizard completes with lineage and PII flags on sample packs; golden tests green.
- **Export bundle** validates with CLI verifier; failure produces actionable diff.
- **NL→Cypher** yields valid queries ≥ 95% on test set; sandbox prevents high‑cost plans unless approved.
- **Case space** shows complete audit trail; 4‑eyes gate blocks risky actions until second approver.
- **OPA policies** deny a blocked export and show human‑readable reason + appeal path.

### 3.7 Out of Scope (MVP‑2)
- Federated multi‑graph search; advanced simulations (network interdiction); marketplace; heavy mobile.

---

## 4) GA — Product Requirements (PRD)
### 4.1 Goals & Metrics
- **Goal**: Deploy to regulated tenants with hardened governance, **Graph‑XAI**, **predictive suite**, and **offline kit**, with 10+ production runbooks and cross‑tenant hashed deconfliction.
- **Metrics**: decision latency ↓ 50% (vs. baseline), audit appeal throughput ≤ 72h, detector ROC‑AUC ≥ 0.8 on bench, 0 critical vulns at GA gate.

### 4.2 GA Must‑Haves
1) **Graph‑XAI** across anomaly, ER, and forecasts (path rationales, counterfactuals, saliency, fairness/robustness views).
2) **Provenance & Claim Ledger** service backing contradiction graphs and verifiable disclosures.
3) **Predictive Threat Suite** (timeline forecast, COA comparison, counterfactuals) with Helm deploys.
4) **Offline/Edge Expedition Kit v1** — CRDT merges, conflict UI, signed sync logs.
5) **Runbook Library (≥10)** productionized (CTI, DFIR, AML, disinfo, HRD, crisis ops) with KPIs & XAI notes.
6) **Integrations**: STIX/TAXII/MISP bi‑directional; SIEM/XDR bridges; Slack/Jira bots; Relativity/Nuix exports.
7) **Governance**: warrant registry, policy simulation, ombuds workflows, cross‑tenant hashed deconfliction.

### 4.3 GA Acceptance Gates
- **Prov‑ledger** export manifests verifiable by external tool; contradiction graph shows lineage and confidence bands.
- **XAI overlays** active in UI; per‑model cards published; subgroup fairness deltas within bounds.
- **Offline kit** passes expedition drill (collect→sync→reconcile) with divergence report.
- **Runbooks** meet KPIs on sample benches; after‑action auto‑reports generated.

---

## 5) Architecture & Specs (Build‑to‑Win)
### 5.1 Services (MVP‑2 → GA)
- **Graph API Gateway**: GraphQL with persisted queries, cost limits, field‑level authz; add **policy‑aware planning**.
- **Graph Store**: Neo4j primary (+ optional JanusGraph path later); bitemporal edges; geo‑temporal indices.
- **Ingest/ETL**: Kafka optional; connectors sandbox; OpenLineage events; schema registry; DPIA hooks.
- **ER Service**: blocking strategies (LSH/MinHash), pairwise classifiers, reversible merges, `/er/explain` endpoint.
- **Copilot**: prompt→Cypher generator with cost/row estimator; RAG over case corpus with citations.
- **Provenance/Claim Ledger (GA)**: evidence registration, hash/signature, contradiction graphs, export manifester.
- **Predictive Suite (GA)**: forecast API + counterfactual simulator; causal explainer endpoints.
- **Gov/Audit**: OPA/ABAC, SCIM, WebAuthn, reason‑for‑access prompts, audit search; warrant registry.
- **Ops**: OTEL traces, Prom metrics, Grafana boards, SLO burn alerts, query budgeter, slow‑query killer.

### 5.2 Data Model (MVP‑2 → GA)
- **Entities**: Person, Org, Asset, Account, Location, Event, Document, Communication, Device, Vehicle, Infrastructure, FinancialInstrument, Indicator, Claim, Case, Narrative, Campaign.
- **Policy Labels**: origin, sensitivity, legal basis, purpose, retention, license class.
- **Temporal**: `validFrom/validTo` + `observedAt/recordedAt`; snapshot‑at‑time queries.
- **Geo‑Temporal**: trajectories, stay‑points, co‑presence windows; corridor risk later.

### 5.3 APIs (examples)
- `/ingest/map`: POST schema mapping → canonical forms (+PII flags, license hints).
- `/exports/bundle`: POST case → signed manifest (hash tree + transform chain) → ZIP.
- `/verify/bundle`: local CLI → returns pass/fail + diff.
- `/copilot/nl2cypher`: POST prompt → Cypher + cost estimate + sandbox token.
- `/er/explain`: GET id → features, similarity, overrides, reversible links.

### 5.4 Security/Privacy Controls
- ABAC via OPA; field‑level redaction; k‑anonymity tools; envelope encryption per tenant; step‑up auth for risky ops; **two‑person control** on exports above sensitivity.

### 5.5 Observability/SRE
- Golden signals: latency, errors, saturation, traffic; heatmaps for query cost; autoscaling runbooks; chaos class: pod kill, broker loss, graph read replica failover.

---

## 6) Delivery Plan
### 6.1 Milestones
- **M2.0 (Code Freeze for MVP‑2)**: FR‑1..8 complete; export verifier CLI; SLO dashboards; 10 connectors GA.
- **M2.1 (Hardening)**: chaos drill pass, perf bench green, security scan zero criticals, docs & demo packs.
- **GA‑Beta**: Graph‑XAI overlays for ER/anomaly; prov‑ledger beta; predictive suite alpha; offline kit alpha.
- **GA**: prov‑ledger GA, predictive suite GA, offline kit v1, 10+ runbooks prod, SIEM bridges.

### 6.2 Resourcing (indicative)
- **Core graph/API** (2–3), **Ingest/Connectors** (2–3), **Copilot/XAI** (2–3), **Prov‑ledger** (1–2), **UI** (2), **SRE/Infra** (2), **Gov/Compliance** (1).

### 6.3 Exit Criteria
- MVP‑2 exits only when **golden path** runs clean on a fresh laptop and a clean cloud env; 0 Sev‑1, ≤ 3 Sev‑2 with workarounds.

---

## 7) Scope Details & Checklists
### 7.1 Connector Pack (MVP‑2)
- **Ship**: CSV/Parquet, STIX/TAXII, MISP, RSS/HTTP, S3/Blob, DNS/WHOIS, sanctions (OFAC/EU/UK), CISA KEV, AbuseIPDB.
- **Acceptance**: each ships manifest + mapping, sample datasets, rate‑limit policy, golden IO tests.

### 7.2 UI Tasks (MVP‑2)
- Tri‑pane sync, pinboards, saved views; command palette; A11y AAA; dark/light; diff/undo/redo; **Explain View** overlay.

### 7.3 Copilot (MVP‑2)
- NL→Cypher validity ≥95% on test prompts; cost/row estimator; sandbox token; rollback; **citations mandatory** in outputs.

### 7.4 ER (MVP‑2)
- Explainable scorecards, reversible merges, adjudication queue; override log (user + reason).

### 7.5 Governance (MVP‑2)
- Reason‑for‑access prompts; license/TOS engine; export blockers with human‑readable reasons; policy simulation dry‑run.

### 7.6 Ops (MVP‑2)
- Grafana SLO boards; query budgeter + killer; archived tiering; admin console for schema registry, connector health, job retries/backfills.

---

## 8) Risks & Mitigations
- **Breadth creep** → **Mitigation**: MVP‑2 cutline enforced; feature flags; weekly kill list for distractions.
- **Prov‑ledger complexity** → **Mitigation**: start with **export manifester + verifier**, ledger service follows.
- **Query cost blowups** → **Mitigation**: persisted queries, budgets, estimators, slow‑query killer.
- **Connector flakiness** → **Mitigation**: golden IO tests, sample packs, backpressure & rate limits.
- **Model misuse/prompt injection** → **Mitigation**: guardrail prompts logged, quarantine, red‑team runs.

---

## 9) Definition of Done (DoD)
- Golden path demo repeatable from **clone → make up → make smoke**.
- All FRs have **acceptance packs** (fixtures + golden outputs).
- Security review passes (STRIDE mapped), 0 criticals, dual‑control deletes verified.
- Docs: onboarding, cookbooks, runbooks; reproducible screenshots; sample datasets.
- **One‑click demo** shows Ingest → Resolve → Analyze → Report with **verifiable export**.

---

## 10) Appendices
- **A. Directory→Capability Map**: `graph-service` (GraphQL + policy), `graph-xai` (explainability APIs), `connectors|data-pipelines` (ingest), `copilot` (NL→Cypher/RAG), `governance|controls` (OPA/ABAC), `grafana|alerting|alertmanager` (SRE), `RUNBOOKS` (operational playbooks), `deploy|helm|compose` (IaC), `docs|docs-site` (guides), `finops` (budgets), `etl/openlineage` (lineage), `feature-flags` (progressive delivery).
- **B. Bench Targets**: entity count 10M+, edges 100M+, p95 1.5s @ 3 hops/50k nodes, ingest 10k docs/5m.
- **C. Won’t Build**: any feature enabling unlawful harm, mass repression, deanonymization without lawful authority; human‑subject manipulation.

— End of PRD —

