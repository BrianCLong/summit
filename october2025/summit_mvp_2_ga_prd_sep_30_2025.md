# Summit — MVP‑2 & GA PRD

> Author: Topicality co‑CEO · Date: 2025‑09‑30 · Scope: IntelGraph Platform + Maestro Conductor + Governance Pack

---

## 0) Executive Summary

**Thesis:** Summit (IntelGraph + Maestro + Governance) is a deployable‑first, provenance‑centric intelligence platform. MVP‑0/1 established the golden path (investigation → entities → relationships → Copilot → results) and a production‑ready core (React client, GraphQL API, Neo4j, Postgres/pgvector, Redis, OTel, Docker). **MVP‑2** converts this into repeatable customer value with **proof‑first modules, white‑labeling, and governance you can sell**. **GA** hardens scale, compliance, and operability for design‑partner expansion.

**90‑day outcomes:**
1. Two‑week value slice available out‑of‑the‑box for 3 design‑partner use cases (see §6).  
2. 100% provenance manifests per artifact (runs, graphs, exports) and Decision nodes persisted (see §3.3, §4.3).  
3. Maestro plan→run→artifact workflows operable from Client (UI + API), with budget & attestation gates (see §4.2).  
4. White‑label pack (branding, roles, policy bundles, templates) installable via `make wl:<profile>` (see §4.4).  
5. Canary + rollback baked into Releases with success criteria and SBOM/SLSA attached (see §8).

---

## 1) Where We Are (Sep 30, 2025)

**Observable status (from repo):**
- README advertises **MVP‑0 complete** (auth, Graph analytics, React, Copilot, ingestion) and **MVP‑1 complete** (AI/ML extraction, CV, ASR, vector search, cross‑modal, OTel, perf, security hardening, CI/CD).  
- Golden path make targets exist (`make bootstrap`, `make up`, `make smoke`); optional `up-ai`, `up-kafka`, `up-full`.  
- Stacks present: `/client` (React/MUI/Cytoscape), `/api` (Node/TS GraphQL), `/graph-service`, `db/`, `docker/`, `deploy/`, `grafana/`, `alerting/`, `feature-flags/`, `connectors/`, `maestro/.maestro` (conductor), governance & security dirs (`SECURITY/`, `.security/`, `governance/`, `audit/`).  
- Evidence of operational rigor: OTel + Prometheus + Grafana dashboards, smoke tests, bug‑bash artifacts (`bug-bash-results/20250922`), `RUNBOOKS/`, `adr/`.  
- Issues/PR volume is high (≥300 each), implying active iteration and debt to triage.

**Gaps to customer value:**
- Provenance is described but **not end‑to‑end enforceable** (claim ledger + manifests not wired through all surfaces).  
- Maestro exists but **Plan→Run→Artifact loops are not yet first‑class in the UI** (or trivial to templatize).  
- **Design‑partner ready packs** (white‑label, policy, roles, dashboards, demo datasets) are fragmented.  
- **Cost/SLO guardrails** (budgets, auto‑rollback, freeze windows) need productized controls.  
- **Export & disclosure packs** must be one‑click with redaction/watermarking.  
- **Connector catalog** needs a minimal, stable set with lineage (3–5 high‑value sources).  
- **Unit economics instrumentation** (per‑investigation cost, pipeline utilization) needs first‑class dashboards.

---

## 2) Product Strategy Frame (recap)

- **Mission:** Deliver provable intelligence & automation with provenance over prediction.  
- **Flywheel:** Targeted design partners → fast, provable wins (disclosure‑first) → convert to revenue via white‑label modules → reinforce graph memory & automations → lower CAC, higher LTV.  
- **Portfolio lenses:** Mission value; Time‑to‑proof (≤14 days to demo, ≤8 weeks to ROI); Compliance fit; Strategic leverage.  
- **North star:** # of provable decisions customers trust (with manifests + Decision nodes).

---

## 3) MVP‑2 PRD (Next 4–8 weeks)

### 3.1 Goals
1. **Provenance Everywhere:** Every material artifact (graph mutations, analyses, exports) carries a manifest + claim ledger entry.  
2. **Conductor in the Loop:** Run Maestro plans directly from Client with budgets, attestations, and live run status.  
3. **Design‑Partner Ready:** Ship three installable value slices with demo data, dashboards, and disclosure packs.  
4. **White‑Label‑able:** Theming, logos, email templates, RBAC roles, and policy bundles as profiles.  
5. **Guardrails:** Cost/SLO budgets, freeze windows, and automatic rollback on policy or SLO breach.

### 3.2 Non‑Goals
- Internet‑scale multi‑tenant SaaS (GA).  
- Advanced Auto‑ETL design studio; limit to curated connectors.  
- Fully custom ML training pipelines (provide inference & orchestration only).

### 3.3 User Stories
- **Analyst** can start an Investigation from a template, ingest sample data, run a guided Copilot, and export a disclosure pack with sources & hashes in < 30 minutes.  
- **Lead** can view Decision nodes, see evidence & costs, approve with WebAuthn step‑up, and trigger a canary run.  
- **Admin** can install a white‑label profile, set budgets & freeze windows, and enforce policy via OPA bundles.  
- **SecOps** can audit who did what, where the data came from, and see SBOM/SLSA on every release artifact.

### 3.4 Requirements

**A. Provenance & IntelGraph**
- Claim ledger schema: `Claim{ id, subject_id, predicate, object, evidence_refs[], hash, policy_labels{origin,sensitivity,legal_basis}, created_by, run_id }`.  
- Manifest generator (server‑side): Hook GraphQL resolvers & job runners to emit JSON‑LD manifests per mutation & analysis.  
- Decision nodes: `Decision{ id, context, options[], decision, reversible, risks[], owners[], checks[], evidence_claim_ids[], cost_estimate, okr_links[] }` with UI read/write.

**B. Maestro Conductor Integration**
- Plan registry: YAML plans under `.maestro/plans/` with `budgets{time,cost}`, `attestations`, `artifacts`.  
- Client UI: Run panel (queue, status, logs, artifacts), Budget guardrails, Attestation checklist, "Promote to canary" CTA.  
- API: `POST /runs` (plan_id, inputs, budget), `GET /runs/:id`, `POST /runs/:id/cancel`, WebSocket stream.

**C. White‑Label & Policy Bundles**
- Profiles in `brands/<profile>/` (logo, palette, email templates), `governance/bundles/<profile>/` (OPA policies, roles), `comms/templates/`.  
- CLI: `make wl:list | wl:apply PROFILE=<name> | wl:revert`.  
- RBAC presets: Admin, Lead, Analyst, Auditor; mappable to IdP groups.

**D. Connector Mini‑Catalog (curated 3–5)**
- CSV/Excel (local), STIX/TAXII, Web (fetcher with safelist), and **1 paid** (eg. OpenAI usage logs or Salesforce) with lineage.  
- Each connector emits Source claims `{url, retrieved_at, checksum, license}`.

**E. Disclosure Pack (one‑click)**
- Export bundle: `report.md`, `claims.ndjson`, `manifests/`, `sbom.json`, `slsa.json`, redacted datasets with watermark.  
- UI export: choose redaction policy, watermark, and share‑link with expiry.

**F. Guardrails & FinOps**
- Budgets per investigation + per run; stop on exceed.  
- Freeze windows (cron) enforced by Maestro.  
- Auto‑rollback triggers: SLO breach (p95>300ms for API; uptime<99.9%), cost anomaly, policy violation.  
- Dashboards: Cost per investigation, run success rate, budget utilization, SLA heatmap.

### 3.5 Acceptance Criteria
- 100% of exports contain a disclosure pack; random sample manifests verifyable by hash.  
- 3 value slices demoable E2E in new env with `make demo:<slice>` in <15 minutes each.  
- Conductor runs launch from Client, show live status, respect budgets, and produce artifacts.  
- White‑label profile switches branding + policies without rebuild; email templates render.  
- Grafana shows cost/SLO dashboards with real data; alerting routes to Slack/email.

### 3.6 UX Notes (Client)
- Add **Runs** sidebar tab under each Investigation.  
- **Decision** editor modal with options/risks owners.  
- **Export** wizard (destination, redaction, watermark).  
- **Profile switcher** for white‑label (Admin‑only).  
- **Audit trail** drawer on graph events (hover → claim popover).

---

## 4) GA PRD (12–16 weeks)

### 4.1 Goals
- Multi‑tenant GA with org isolation, quotas, and regional data residency.  
- HA & scale: horizontal API, read‑replica Neo4j strategy, queue backpressure.  
- Compliance pack: SOC2‑lite controls, DPA/DPIA scaffolds, data residency & redaction defaults.  
- Self‑serve install: `make up-ga` with health checks, migrations, and seed roles.

### 4.2 Platform Requirements
- ** tenancy:** Org table + tenant_id propagation; OPA policies evaluated with tenant context.  
- **Secrets & KMS:** Pluggable envelope encryption; key rotation; at‑rest encryption across stores.  
- **Queues:** NATS/Kafka with idempotent job runners; dead‑letter + replay UI.  
- **Search:** pgvector for semantic; OpenSearch optional.  
- **Observability SLOs:** p95 API ≤300 ms, uptime ≥99.9%, job success ≥99%, mean cost/run within budget.  
- **Backups & DR:** Nightly backups; RPO≤24h, RTO≤4h; restore runbook tested.

### 4.3 Governance & Provenance (GA hardening)
- Mandatory manifest validation middleware.  
- Evidence storage WORM bucket for claims/manifests.  
- Public verification endpoint (hash→artifact available?).  
- Decision catalog with OKR links + outcome tracking.  
- Full disclosure pack API; watermarking defaults to **on**.

### 4.4 White‑Label & Extensibility
- Profile marketplace (JSON index + signatures).  
- Policy bundle versioning + migration scripts.  
- Plugin points: Ingest processors, Copilot tools, Run artifacts viewers.

### 4.5 Security & Compliance
- Step‑up auth for high‑risk actions (WebAuthn).  
- PII tagging with auto‑redaction.  
- CSP, COOP/COEP hardened; Persisted GraphQL queries only in prod.  
- Supply‑chain: SBOM on every service; cosign, osv‑scan, trivy in CI.

### 4.6 Acceptance Criteria (GA)
- Passes canary policy in two customer envs (10% traffic slice) without auto‑rollback for 14 days.  
- Evidence pack generated for all customer exports; auditors can validate hashes.  
- Multi‑tenant load test with 200 concurrent analysts; p95 within SLOs; zero data bleed.  
- Disaster recovery drill executed successfully (RTO/RPO met).

---

## 5) System Design & Interfaces

### 5.1 Data Model (additions)
- `Run{ id, plan_id, inputs, status, budget{time,cost}, started_at, finished_at, artifacts[], attestation[], owner_id, investigation_id }`  
- `Artifact{ id, type, uri, checksum, claim_ids[] }`  
- `Profile{ id, name, theme, policies[], roles[] }`

### 5.2 APIs
- **GraphQL**:
  - `mutation createDecision(input)`; `query decisions(filter)`; `mutation linkEvidence(decisionId, claimIds)`  
  - `mutation startRun(planId, inputs, budget)`; `subscription runStatus(runId)`  
  - `mutation exportDisclosure(investigationId, options)`
- **REST (internal or gateway)**: `/runs/*`, `/profiles/*`, `/disclosure/*`

### 5.3 Events & Provenance Hooks
- Resolver middleware emits Claim + Manifest per mutation.  
- Job runner emits Claim per artifact creation; artifacts reference run_id.  
- Exporter packages claims + manifests; stores WORM copy.

### 5.4 Deployment Targets
- **Dev**: `make up` minimal; `make up-ai` optional services; seed data via `make ingest` & `make graph`.  
- **Staging**: `make up-full` + alerting + budget policies.  
- **Prod**: `make up-ga` + HA + DR; freeze windows enforced.

---

## 6) Two‑Week Value Slices (MVP‑2)

1) **OSINT Investigation Starter**  
- Inputs: CSV/URLs; STIX/TAXII.  
- Copilot: entity extraction + enrichment.  
- Output: Graph + Decision + Disclosure pack.  
- Success: Analyst completes end‑to‑end in <30 min; export verifies.

2) **Incident & Risk Review (Internal)**  
- Inputs: audit logs + PR diffs.  
- Copilot: surface policy drift, cost spikes.  
- Output: Decision with owners/risks; canary plan to remediate.  
- Success: Lead signs with WebAuthn; budget respected.

3) **Sales Intelligence Brief**  
- Inputs: CRM export + web pages.  
- Copilot: account map; opportunity risks.  
- Output: shareable brief + disclosure pack.  
- Success: AE gets 3 actionable intros; provenance intact.

---

## 7) Metrics & Telemetry

- **Product KPIs:** TTFV ≤14 days; provenance coverage 100%; p95 ≤300 ms; uptime ≥99.9%.  
- **Business:** 5 design partners/quarter; payback ≤12 months; gross margin ≥70%.  
- **Governance:** SBOM+attestation per release; 0 critical policy violations; disclosure pack adoption 100%.

---

## 8) Release Gate (MVP‑2 → GA)

**Required artifacts:** sbom, slsa_provenance, risk_assessment, dpa/dpia_if_applicable, rollback_plan, disclosure_pack.  
**Canary policy:** traffic_slice 10%; success: error_rate<=X, latency_p95<=300ms, cost/req<=Z; **auto_rollback_on:** SLO breach ×2 windows, security finding, data policy violation.  
**Freeze windows:** prod changes require WebAuthn and policy exception note.

---

## 9) Work Plan & Owners (8‑week MVP‑2)

**Week 1–2:** Provenance hooks + manifest generator; Decision nodes; export skeleton.  
**Week 3–4:** Maestro UI + budgets; curated connectors; value slice #1.  
**Week 5–6:** White‑label profiles; disclosure exporter (redaction/watermark); dashboards.  
**Week 7–8:** Value slices #2/#3; guardrails + auto‑rollback; docs & runbooks; bug bash.

**Owners** (suggested):  
- Platform/API: Owner A  
- Client/UX: Owner B  
- Maestro/CI/CD: Owner C  
- Governance/Sec: Owner D  
- GTM/Design Partners: Owner E

---

## 10) Risk Register & Mitigations

- **Graph perf/Neo4j limits** → LOD + viewport pruning; async analytics; read replicas in GA.  
- **Provenance overhead** → sample verification; compress manifests; WORM offload.  
- **Connector legal/licensing** → safelist; license capture in Source claims; DPA templates.  
- **UI complexity** → templates + wizards; progressive disclosure.  
- **Cost blowouts** → strict budgets; kill‑switch; anomaly alerts.  
- **Security drift** → policy bundles in CI; step‑up auth; quarterly audit.

---

## 11) Documentation & Demos to Ship

- `docs/ONBOARDING.md` refresh; `docs/README.md` index; `RUNBOOKS/`.  
- Demo scripts: `make demo:osint`, `make demo:incident`, `make demo:sales`.  
- Screens: Decision editor, Runs panel, Export wizard, White‑label switcher, Cost/SLO dashboards.  
- Disclosure Pack example in `artifacts/` with hashes and manifest viewer.

---

## 12) Backlog for GA

- Multi‑region residency; WORM store abstraction; plugin marketplace; persisted queries enforcement; DR drill automation; profile signing & verification.

---

## 13) Definition of Done (per Epic)

- Code + tests + runbooks; Grafana panels updated; budget tests; policy checks pass; SBOM/SLSA attached; disclosure pack present; demo recorded; claims & decisions written to graph.

---

## 14) Appendix — Pointers

- Quickstart & features: project README  
- Onboarding: `docs/ONBOARDING.md`  
- Plans: `.maestro/plans/`  
- Governance: `governance/`, `SECURITY/`, `.security/`, `audit/`  
- Client: `client/` · API: `api/` · Graph: `graph-service/`  
- Dashboards: `grafana/dashboards/`  
- Connectors: `connectors/`  
- Bug bash: `bug-bash-results/`  
- Runbooks: `RUNBOOKS/`  

> End of PRD — iterate via Issues labeled `prd:mvp2` and `prd:ga`; link commits to Decision nodes.

