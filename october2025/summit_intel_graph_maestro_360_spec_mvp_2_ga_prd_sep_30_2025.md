# Summit / IntelGraph + Maestro — 360° Spec, MVP‑2 + GA PRD

**Author:** Felix “The B.I.Z.” (VP Sales, BizDev & Growth)  
**Date:** Sep 30, 2025  
**Scope:** IntelGraph (analyst platform) + Maestro Conductor (orchestration) — product, architecture, compliance, go‑to‑market, and execution plan from a revenue/capture vantage.

---

## 0) Executive Snapshot

**Thesis:** We have a credible platform crossing from well‑instrumented MVP to hardened GA. The repo shows breadth: Graph + Conductor microservices (\~130+ services) with Docker Compose patterns, connectors (STIX/TAXII, RSS, Splunk/Sentinel/Chronicle, OFAC SDN, CSV/S3/DuckDB), GraphQL gateway, provenance ledger, policy gates, Graph‑XAI, and a Vite/React front‑end for Maestro. To win revenue now, we need: (1) tighten **analyst UX** (tri‑pane Graph/Timeline/Map, NL→Cypher, task kits), (2) **compliance-by-design** artifacts ready for procurement, (3) deterministic **pilot→production** path with success criteria, (4) partner motions for **primes/SIs**.

**North-star business goals (next 90 days):**
- 20+ qualified pilots across Gov/Prime/Regulated Enterprise; ≥ 40% pilot→production.
- 3 referenceable wins with signed Security/Compliance bundles (CMMC/FedRAMP path, SBOM, DLP/OPA, audit trails).
- Land vehicles via OTA/CSO teaming and prime‑led IDIQ task orders.

---

## 1) Where We Are (as‑is assessment)

### 1.1 Repository & Components (signals of maturity)
- **Orchestration & Platform services:** `services/` includes `api-gateway` (Apollo/GraphQL), `conductor` (schema.graphql, routing/conduct), `agent-runtime`, `prov-ledger` (provenance ledger), `graph-xai`, `license-registry`, `predictive-suite`, `audit(-log)`, `compliance`, `schema-registry`, `search`, `scheduler`, etc.
- **Connectors:** `connectors/` includes `stix_taxii_connector`, `rss_news_connector`, `splunk_connector`, `sentinel_connector`, `chronicle_connector`, `ofac_sdn_connector`, `esri_connector`, `elasticsearch_connector`, `duckdb_connector`, `s3csv`, `json/csv`.
- **Front‑end:** `conductor-ui/frontend` (Vite/React/TS, Playwright tests, build scripts; studio-lite present). IntelGraph analyst UI is emerging; Maestro has a dedicated front‑end.
- **Deployment:** `deploy/compose/docker-compose.full.yml` and `dev.yml` wire gateway → prov‑ledger → graph‑xai → conductor → registries, Redis/PG/Neo4j. Dev container + CI hooks exist.
- **Docs & Ops:** `docs/` contains Architecture, GA criteria, Compliance posture, Federal deployment guide, Acceptance checklists, Runbooks, OKRs, Observability SLOs, Roadmap, Conductor 30/60/90.
- **Issues & Release hygiene:** Open issues track GA micro‑canary, CI failures, PR dashboards, chaos drills.

**Verdict:** Depth is solid for an MVP+ with credible GA runway. Main revenue blockers are UX coherence, hardenings (authZ, quotas, multi‑tenant), deterministic deploys, and the compliance/evidence pack needed for procurement.

### 1.2 Core Strengths
- **Provenance‑first:** Prov‑ledger, attest/crypto, policy via OPA/ABAC; license/plug‑in registry implies supply‑chain guardrails (SBOM hooks exist).
- **Interoperability:** STIX/TAXII + SIEM/EDR/logs + OSINT/RSS + CSV/S3/DuckDB.
- **AI/Graph:** Graph‑XAI service; Predictive suite; NL orchestration via Conductor; GraphQL schema for router/experts.
- **Deploy Anywhere:** Compose today, K8s/Helm/ArgoCD patterns in docs; air‑gap patterns referenced in federal guide.

### 1.3 Gaps & Risks
- **Analyst UX debt:** Tri‑pane (Graph/Timeline/Map), NL→Cypher, task kits, saved investigations, audit trails in UI.
- **Multi‑tenant & policy:** Tenant isolation (row/col ABAC), usage quotas/budgets, data retention/lifecycle, PII redaction in UI flows.
- **Security hardening:** End‑to‑end authZ (OPA in gateway), secrets rotation, envelope‑encryption (BYOK/HSM), signing/verify on plug‑ins; rate‑limit/throttle.
- **DevEx/Release:** Merge‑queue tuning, flaky test quarantine, micro‑canary, perf budgets (p95). CI flakes on Maestro builds.
- **Compliance pack completeness:** CMMC mapping depth, FedRAMP path, SBOM/SLSA automation, DPIA templates, DLP guardrails surfaced in UI.

---

## 2) MVP‑2 (next 6–10 weeks) — Product Requirements Document

### 2.1 Product Objectives
1) **Analyst Velocity:** Deliver tri‑pane investigation UX with NL→Cypher and task kits;
2) **Trust & Control:** Tighten provenance/audit in‑product, OPA‑backed ABAC, PII guardrails;
3) **Deployability:** One‑click pilot stack, hard SLOs, micro‑canary;
4) **Evidence Pack:** Compliance artifacts embedded and exportable.

### 2.2 In‑Scope (MVP‑2)
- **UX/Workflow**
  - Tri‑pane **Graph/Timeline/Map** canvas with case sidebar (entities, notes, evidence locker).  
  - **NL→Cypher**: type‑ahead + explainability panel; preview query cost/impact.  
  - **Task Kits**: DFIR, Fraud, Disinfo — prebuilt queries, playbooks, and dashboards.  
  - **Saved Cases & Audit**: immutable timeline, chain‑of‑custody stamps from prov‑ledger.
- **Data/Connectors**
  - Hardening & docs for **STIX/TAXII**, **Splunk/Sentinel/Chronicle**, **RSS/OSINT**, **OFAC SDN**, **CSV/S3/DuckDB**.  
  - **Schema Registry** v0.1: managed entity/edge types; versioned mapping (connector → IntelGraph entities).
- **Security/Compliance**
  - **OPA‑backed ABAC** in API‑gateway; row/column policies; rationale logging.  
  - **PII redaction & privacy modes** in UI; DLP “copy/export” gates per role.  
  - **SBOM generation** for services & plug‑ins; Cosign verify on start.  
  - **BYOK/HSM** stub (KMIP interface) with envelope encryption for sensitive stores.
- **Operations/Quality**
  - **Micro‑canary**: tenant‑scoped rollouts; automated rollback on SLO breach.  
  - **p95 ≤ 300ms** for GraphQL read paths at pilot scale; perf tests in CI.  
  - **Test policy**: quarantine flaky tests; merge‑queue concurrency tuned; smoke + chaos mini‑drill T+24h post‑cutover.
- **Packaging**
  - **Pilot stack**: `docker compose -f ...full.yml` + seed data;  
  - **Pilot Kit**: success criteria sheet, evidence bundle export, 2‑week spike plan.

### 2.3 Out‑of‑Scope (MVP‑2)
- JanusGraph backend; blockchain anchoring; autonomous counter‑ops agents; deep neuroadaptive systems.

### 2.4 Functional Requirements & Acceptance Criteria
**FR‑UX‑01 Tri‑Pane Canvas**  
- *Req:* Render graph (Cytoscape), timeline view, map view; sync selections; case sidebar with notes/evidence.  
- *AC:* On demo dataset (10k nodes/50k edges), interactions stay ≤ 100ms median; selection sync < 50ms.

**FR‑UX‑02 NL→Cypher**  
- *Req:* Natural‑language query -> generated Cypher with explanation and preview; allow edit before run.  
- *AC:* ≥ 85% task success on curated benchmark; incorrect queries never execute without user confirm; audit log captures prompt, draft Cypher, user approval.

**FR‑SEC‑01 ABAC/OPA**  
- *Req:* ABAC policies enforced at gateway; policy decisions recorded with subject/object/attributes and rule id.  
- *AC:* 100% policy decision coverage in audit log; deny‑by‑default verified in tests; row/column filters applied.

**FR‑SEC‑02 DLP/Privacy Modes**  
- *Req:* Role‑based export/copy gates; field‑level masking; privacy “no‑trace” session flag for sensitive explorations.  
- *AC:* Attempted restricted export blocks with user‑visible OPA reason; masking applied on UI and API; metrics visible in Grafana.

**FR‑OPS‑01 Micro‑Canary**  
- *Req:* Feature flags + tenant whitelist; automated rollback if p95 > SLO for 5 min or error‑rate > threshold.  
- *AC:* Dry‑run canary passes in staging; prod canary reports per‑tenant status; rollback under 2 minutes.

**FR‑COMP‑01 SBOM & Signing**  
- *Req:* Generate SBOM (SPDX/CycloneDX) for services; verify Cosign signatures for plug‑ins.  
- *AC:* Evidence bundle includes SBOM and signature provenance per component; failing verify blocks load.

**FR‑DATA‑01 Schema Registry v0.1**  
- *Req:* Register entity/edge schemas; version connector mappings; emit deprecation warnings.  
- *AC:* Connectors publish mapping version; IntelGraph validates on ingest.

### 2.5 Non‑Functional Requirements (MVP‑2)
- **SLOs:** API p95 ≤ 300ms (read), p95 ≤ 700ms (write) at pilot scale; 99.5% monthly availability for pilot tenants.  
- **Observability:** OTel traces from UI→Gateway→Services; Red/USE dashboards; synthetic probes; per‑tenant budgets.  
- **Security:** Secrets rotation ≤ 90d; rate limit per user/token; CIS Docker baseline.  
- **Docs:** Runbooks, playbooks, and connector quickstarts; pilot success worksheet.

### 2.6 Deliverables (MVP‑2)
- `v0.9` Pilot Release notes; Pilot One‑Pager; Compliance Evidence Bundle v0.9; Demo dataset & scripts; Bench harness & report.

### 2.7 Owners/Resourcing
- **PM/Eng:** Platform (Gateway/OPA, Prov‑ledger, Schema‑registry); Data (Connectors); UX (Tri‑pane/NL→Cypher); DevEx/CI; Sec/Compliance.  
- **GTM:** Felix + Marketing for ABM, pilots, and partner‑led pursuits.

---

## 3) GA (8–16 weeks) — Product Requirements Document

### 3.1 Objectives
- **Production‑grade multi‑tenant** IntelGraph + Maestro with compliance‑by‑design, hardened pipelines, and partner integration kits.

### 3.2 In‑Scope (GA)
- **Multi‑Tenant Controls**: org/workspace model; tenant‑scoped secrets; quotas & cost budgets; retention & legal hold.  
- **Governance**: OPA policy packs (Gov, FSI, Healthcare); evidence export; audit report templates.  
- **Maestro**: bandit router hardening; expert catalog with attestation; per‑task cost/latency telemetry; fail‑safe & timeouts.  
- **Analyst UX**: case management, collaboration (mentions, share‑links), redaction flows, report composer.  
- **Scale Path**: K8s Helm chart; ArgoCD app‑of‑apps; zero‑downtime deploy; blue/green; backup/restore drills.  
- **Resilience**: chaos mini‑game; circuit breakers; back‑pressure; bulk ingest guardrails.  
- **Compliance**: SBOM automation in CI; SLSA‑2 pipeline posture; DPIA templates; data‑map & ROPA starter; SOC2 mapping starter; FedRAMP path doc.

### 3.3 Acceptance Gates (GA)
- **SLOs:** p95 read ≤ 250ms; 99.9% availability across three consecutive weeks in staging; prod micro‑canary rollouts green across ≥ 5 tenants.  
- **Security:** 0 critical audit findings; 100% services with SBOM; plug‑ins signed & verified; DAST/ZAP no criticals.  
- **Ops:** Backup/restore TTR ≤ 30m; DR runbook exercised; on‑call rotations staffed; error budgets enforce release throttles.  
- **GTM:** Three referenceable customers with completed Evidence Bundle; pricing/packaging published; partner kit live.

### 3.4 Deliverables (GA)
- `v1.0 GA` notes; Helm charts; ArgoCD manifests; Policy Pack v1; Evidence Bundle v1; Training curriculum; Playbooks; Partner kit.

---

## 4) Architecture / System Spec (condensed)

### 4.1 Services (golden path)
- **API Gateway (Node/Apollo)**: AuthN/AuthZ (JWT/OIDC), OPA policy check, rate‑limit, GraphQL schema unifying IntelGraph + Maestro.  
- **Conductor**: GraphQL `conduct`/`previewRouting`; bandit/Thompson sampler; cost/perf router; timeout & retries; expert catalog.  
- **Agent Runtime**: tool/skill sandbox; policy‑fenced execution; JSON‑RPC to subsystems.
- **Provenance Ledger (PG)**: immutable event store; chain‑of‑custody; plug‑in/agent attestations; evidence export.
- **Graph‑XAI**: explanation service for graph queries and NL→Cypher rationale.
- **License/Plugin Registry**: register/approve plug‑ins with digest/signature, SBOM, capabilities, risk notes.
- **Predictive Suite**: analytics/ML micro‑services (anomaly, GNN hooks, scoring pipelines).
- **Datastores**: Neo4j (graph), Postgres (relational/prov), Redis (cache), optional DuckDB columnar for local.

### 4.2 Data & Schema
- **Entity/Edge Registry**: versioned schemas; mapping catalog for connectors; backward/forward‑compat guidance.  
- **Provenance Model**: source→transform→artifact lineage; cryptographic stamps; user actions as first‑class events.

### 4.3 Security & Compliance
- **OPA/ABAC** at gateway; attribute sources: user roles, tenant, data sensitivity, origin, purpose.  
- **DLP & Privacy**: mask/show by role; export gates; privacy mode; redaction logs.  
- **Supply‑chain**: Cosign signatures; SBOM; SLSA‑2 CI; secret rotation; BYOK/HSM envelope.

### 4.4 Observability & SRE
- OTel down the stack; RUM in UI; SLO dashboards (latency, error rate, saturation); per‑tenant cost & budget metrics; canary controller.

### 4.5 Deployment
- **Pilot:** Compose full stack with seeded data; one‑command install script; health checks.  
- **Prod:** Helm + ArgoCD; secrets via external KMS; ingress with WAF; multi‑AZ; backup/restore; DR pattern; blue/green; micro‑canary.

---

## 5) UX Spec (IntelGraph & Maestro)

### 5.1 Analyst Workspace
- **Canvas**: Graph (Cytoscape) + Timeline + Map; linked selections; context panel with notes, entities, relationships, evidence locker.  
- **Query Bar**: NL→Cypher with explanation; show planned cost; one‑click edit.  
- **Cases**: create/share; role‑gated visibility; export report with embedded provenance.

### 5.2 Maestro Console
- **Runbook builder**; **Expert Catalog** (capabilities, SBOM, risk); **Routing preview**; **Per‑task cost/latency** view; **Feature flags** and canary status.

---

## 6) Compliance Field Kit (ship with pilots & deals)
- **Capability Statement** (Gov, Commercial variants).  
- **Security Whitepaper**: OPA/ABAC, DLP, audit, provenance, supply‑chain.  
- **SBOM** for core services; **SLSA‑2 CI** notes; **Cosign Policy**.  
- **CMMC mapping** (phased), **SOC2 mapping starter**, **FedRAMP path** narrative; **DPIA template** and **ROPA/Data Map** starter.  
- **Data Handling & Export Control**: ITAR/EAR stance, privacy modes, DLP gates.  
- **Sample Evidence Bundle**: audit logs, policy decisions, provenance trails, SBOM, test reports.

---

## 7) Go‑To‑Market (my vantage)

### 7.1 ICPs (initial)
- **Gov/Defense/Intel:** OSINT/all‑source fusion; provenance/audit; policy‑gated AI; deploy‑anywhere including air‑gap.  
- **Primes/SIs:** need graph/AI substrate + compliant workflows to accelerate delivery; pursue teaming for IDIQ/OTA/CSO.  
- **Regulated Enterprise (FSI/Health/Energy):** fraud/threat/supply‑chain risk; evidence & DLP mandatory.  
- **NGOs/Think Tanks/Journalism:** disinfo tracking; verifiable analysis.

### 7.2 Offers & Packaging
- **Land (Pilot 6–12 weeks):** $75–150k fixed‑fee; success criteria; exec sponsor; security review pack; option to credit toward Year‑1.  
- **Expand:** role‑based packaging (Analyst, Investigator+, Orchestrator), usage tiers, training, multi‑year with ramp.  
- **Education/NGO pricing** where mission‑aligned.

### 7.3 Partner Ecosystem
- **Primes/SIs:** Better‑Together architectures; referral/resell margins 10–25%; joint pipeline; co‑sell enablement.  
- **ISVs:** SIEM/EDR, Threat Intel, Case Management integrations.  
- **Research Labs/Universities:** CRADAs, eval harness contributions.

### 7.4 Proof & Evidence
- **Bench harness** on curated datasets; **task success** & **time‑to‑insight** deltas; **cost/latency** telemetry; red‑team disinfo sandbox.  
- Publish **case studies** (Fraud/Disinfo/DFIR), **ROI/TCO** model vs. status quo.

### 7.5 Motions
- ABM to 100 named Gov/Prime and 100 Regulated Enterprise accounts.  
- 3‑email/LinkedIn sequences by role.  
- Field events (mission conferences); webinars with credible co‑hosts.

---

## 8) Delivery & Ops Plan

### 8.1 Milestones
- **MVP‑2 Code Complete**: T+6–8 weeks → Pilot v0.9 cut.  
- **Pilot Cohort‑1**: 10 tenants; micro‑canary; weekly success tracking.  
- **GA RC**: T+12–14 weeks; perf & chaos sign‑off; Evidence Bundle v1 complete.  
- **GA Launch**: T+14–16 weeks with 3 referenceable customers.

### 8.2 RACI (condensed)
- **PM/Eng**: Features, SLOs, release quality.  
- **Security/Compliance**: Field Kit, SBOM/SLSA, audits.  
- **Biz/GTM (Felix)**: ICPs, pilots, partners, pricing, ABM, case studies.  
- **Legal**: DPAs/DPIAs, export controls, data locality.  
- **Ops/SRE**: Deploys, DR, on‑call, canaries.

### 8.3 KPIs
- Pipeline coverage ≥ 3× target; Pilot→Prod ≥ 40%; Win rate vs. status quo; CAC payback < 12 months; p95 latency met; audit findings = 0 critical.

---

## 9) Backlog by Theme (top items)

**Analyst UX**: tri‑pane, NL→Cypher, saved cases, report composer, privacy mode UI.  
**Policy/ABAC**: column‑level masks; purpose binding; OPA decision exports.  
**Compliance**: SBOM automation; SLSA‑2; DPIA/ROPA templates; SOC2 starter; FedRAMP path doc.  
**DevEx**: merge‑queue tuning; flaky test quarantine; PR dashboards; deterministic builds.  
**Ops**: micro‑canary, blue/green, DR drills; cost budgets; error budgets.  
**Connectors**: harden SIEM/EDR; schema registry; mapping UI (GA+).

---

## 10) Assumptions & Data Needed Next
- Assume Neo4j primary graph; Postgres for prov; Redis cache; Compose for pilots → Helm for prod.  
- Need: current customer logos & pilots list; open security findings; SBOM coverage %; CI pass/fail trend; target account list; partner roster; pricing guardrails.

---

## 11) Appendices

### A) Example API/Schema hooks
- **Conductor**: `conduct`, `previewRouting`, `registerPlugin`, `approvePlugin`, `plugins(name)`, `pluginVulns(pluginId)`.

### B) Evidence Bundle Manifest (v0.9)
- SBOMs; Cosign verify logs; OPA decisions; audit logs; provenance sample; DAST/ZAP report; perf/chaos report; DPIA template; DPAs/ROPA starter.

### C) Pilot Success Template
- Use‑case goals; time‑to‑insight baseline vs. Summit; policy gates validated; SLO attainment; rollout plan; expansion roadmap.

---

**Owner’s note (Felix):** This is the revenue‑backed PRD. If we ship MVP‑2 as scoped, we can credibly run paid pilots in Gov/Prime/Regulated Enterprise now, convert 40%+, and walk into GA with references and partner leverage. Let’s move.

