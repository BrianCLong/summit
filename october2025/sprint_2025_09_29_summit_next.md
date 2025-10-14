```markdown
# Sprint Plan — Summit / IntelGraph / Maestro Conductor
**Slug/Version:** `sprint-2025-09-29-intelgraph-summit-v1.0.0`
**Dates:** Sep 30–Oct 14, 2025 (2 weeks)
**Timezone:** America/Denver

> This sprint converts the current repo state (IntelGraph + Maestro Conductor, deployable-first) into a pilot-ready release that proves **Provenance‑first AI** for investigations with auditability, policy, and fast ingress from priority data sources.

---

## 0) North‑Star & Guardrails
- **North‑Star Metric:** Time‑to‑Insight (TTI) from new dataset → grounded answer **P50 ≤ 5 min; P95 ≤ 15 min**.
- **Guardrails:**
  - P0 API latency **P95 ≤ 300 ms** on core read paths (entities/relationships/search).
  - **Zero critical** security findings; DLP/OPA policy enforced for P0 flows.
  - **Deployable‑first**: `make up` & smoke tests green at all times.

**Why now:** Aligns with project plan in repo (GraphRAG, connectors, RBAC/ABAC, obs) and GTM pilots (Gov/Prime + Regulated Enterprise).

---

## 1) Sprint Goals (What we will demo on Oct 14)
1. **Investigator‑ready GraphRAG** path: upload sample corpus → entity/rel graph → ask natural language → grounded answer with citations & policy banner.
2. **Connectors Ready (MVP):** Splunk (search API), CSV/S3 ingest, Reddit OSINT pull. One click via Conductor.
3. **Policy & Audit:** Role + attribute-based policy with OPA, redaction in UI, immutable audit log for queries.
4. **Observability:** OTel traces & dashboards covering 80% of core resolvers; error budget tracker.
5. **Pilot Pack:** Evidence bundle (capability statement, SBOM pointer, DPA template), one‑pager, and 6–12 week paid pilot offer.

---

## 2) Scope & Priorities
- **P0 (Must):** Golden path works end‑to‑end; Splunk + S3/CSV connectors; ABAC with OPA; OTel tracing; smoke tests; minimal SBOM; demo dataset and scripted demo.
- **P1 (Should):** Reddit OSINT; cost guardrails (limits/budgets); OpenAPI contract for public API; role‑based redaction; TCO calculator v0.
- **P2 (Could):** Basic Kafka ingest profile; cost dashboards; Terraform module hardening.
- **Out of Scope (Won’t):** FedRAMP authorization; advanced model governance; multi‑cloud failover; full CRDT offline.

---

## 3) Workstreams (Swimlanes)

### A) Product & GTM (Felix | BIZ)
- PRD: Provenance‑first Investigation (rev A) with acceptance criteria.
- Pilot Offer: 8‑week paid pilot template (pricing, success criteria).
- Exec One‑Pager + 6–8 slide deck (Gov/Prime + Enterprise variants).
- Case Study skeleton + Evidence bundle index.

**Artifacts:** `/docs/gtm/PRD_provenance_investigation.md`, `/docs/gtm/pilot_offer.md`, `/docs/gtm/executive_deck/`, `/docs/evidence/README.md`.

### B) Frontend / Investigator UI (Owner: FE lead)
- Tri‑pane **Graph / Timeline / Map** layout skeleton; policy banner component; citations panel.
- Redaction UI (role‑based mask) and query audit viewer.
- NL→Cypher handoff: query editor showing generated Cypher with approval.

**Artifacts:** `/client/src/features/investigation/*`, Storybook stories, e2e smoke.

### C) Backend API & Graph (Owner: BE lead)
- Entity/Relationship schema hardening; OpenAPI contract for core endpoints.
- NL→Cypher service interface; retriever/summarizer orchestrator hook (GraphRAG).
- Immutable audit log (append‑only) with signer; OPA policy hooks.

**Artifacts:** `/server/*`, `/graph-service/*`, `openapi.yaml`, migration scripts.

### D) Ingestion & Connectors (Owner: Data/ETL)
- **Splunk** search connector (read‑only); **S3/CSV** batch loader (schema‑aware); **Reddit** OSINT pull (P1).
- Ingest registry + provenance metadata; idempotent re‑ingest.

**Artifacts:** `/ingestion/connectors/splunk/*`, `/ingestion/connectors/s3csv/*`, `/ingestion/connectors/reddit/*`.

### E) Policy, Security, Compliance (Owner: SecEng)
- OPA bundles + ABAC policy (personas: Investigator, Supervisor, External Reviewer).
- DLP redaction patterns; privacy modes; DPIA/DPA templates.
- SBOM (CycloneDX) pipeline step; CISA SSDF checklist; SLSA provenance attestation (builder stub).

**Artifacts:** `/policy/opa/*`, `/docs/compliance/*`, `.github/workflows/security.yml`.

### F) Observability & Cost (Owner: SRE)
- OTel tracing + dashboards (API, resolvers, connectors); error budget SLOs.
- Budget guardrails for AI inference; per‑tenant cost meter.

**Artifacts:** `/ops/otel/*`, `/ops/dashboards/*`, `/ops/costs/*`.

---

## 4) Concrete Backlog (User Stories & Tasks)

> **Note:** IDs are sprint-local for planning; link to your issue tracker accordingly.

### P0 — Golden Path & Connectors
- **P0‑1** Golden Path Smoke: `make up` → seed data → query → answer with citations (owner: BE/FE)  
  – Create `scripts/demo/golden_path.sh`; seed fixtures in `/seed/*`.  
  – Cypress test `e2e/golden_path.cy.ts`.
- **P0‑2** Splunk Connector (read‑only) (owner: Data)  
  – API key/OAuth config, search query mapping → normalized events.  
  – Provenance metadata per batch; idempotent cursor.
- **P0‑3** S3/CSV Loader (owner: Data)  
  – Schema map file; bulk upsert into Neo4j + Postgres; error DLQ.
- **P0‑4** ABAC via OPA (owner: SecEng)  
  – Personas & attributes; `allow` decision integrated at API gateway; unit tests.
- **P0‑5** Immutable Audit Log (owner: BE)  
  – Append‑only store + hash chain; signed records; viewer endpoint.
- **P0‑6** OTel Tracing (owner: SRE)  
  – API & connectors spans; dashboards; alert on SLO breach.
- **P0‑7** UI: Policy Banner + Citations Panel (owner: FE)  
  – Shows policy in effect; toggled redaction; copy‑to‑report.
- **P0‑8** Security Gate (owner: SecEng)  
  – CodeQL + Trivy + secret-scan in CI; **no criticals** to merge main.

### P1 — NL→Cypher, OSINT, Contracts, TCO
- **P1‑1** NL→Cypher service interface + UI approval (owner: BE/FE)
- **P1‑2** Reddit OSINT Pull (owner: Data) — subreddits + keyword rules; rate limits.
- **P1‑3** OpenAPI `openapi.yaml` for Entities/Relationships/Search (owner: BE)
- **P1‑4** Role‑based redaction masks (owner: FE/SecEng)
- **P1‑5** TCO Calculator v0 (owner: BIZ) — spreadsheet + JSON spec; 3 scenarios.

### P2 — Cost & Infra niceties
- **P2‑1** Inference budget limits per tenant (owner: SRE)
- **P2‑2** Terraform hardening for demo stack (owner: SRE)

---

## 5) Acceptance Criteria & DoD
- **Golden Path:** From clean checkout → `make up` → run `scripts/demo/golden_path.sh` → Cypress e2e passes → demo video recorded.
- **Latency:** P95 < 300 ms for `GET /entities/:id`, `GET /search?q=…` on seeded dataset.
- **Security:** CI security workflow green; SBOM generated; OPA decisions logged; audit log tamper‑evidence verified.
- **Docs:** PRD, API contract, runbook, pilot offer, and evidence bundle committed.
- **Observability:** Dashboards show traces for 80% of spans on demo path; SLO alert simulated.

---

## 6) Team, Cadence, and Ownership
- **Daily standup:** 09:30 MT; **Demo/Review:** Oct 14, 15:00 MT; **Retro:** Oct 14, 16:00 MT.
- **RACI:**
  - **FE:** UI tri‑pane, redaction — *Owner:* FE lead | *Backup:* Full‑stack.
  - **BE:** API, audit log, NL→Cypher iface — *Owner:* BE lead.
  - **Data/ETL:** Connectors — *Owner:* Data lead.
  - **SecEng:** OPA/DLP, CI security — *Owner:* Sec lead.
  - **SRE:** OTel, SLOs, budgets — *Owner:* SRE lead.
  - **BIZ:** PRD, pilot, TCO, one‑pagers — *Owner:* Felix.

---

## 7) Scaffolding & Repo Changes (PR Checklist)
- **Directories:**
  - `/client/src/features/investigation/{graph,timeline,map,citations,policy}/`
  - `/server/src/{api,auth,policy,audit}/` + `openapi.yaml`
  - `/ingestion/connectors/{splunk,s3csv,reddit}/`
  - `/policy/opa/{bundles,tests}/`
  - `/ops/{otel,dashboards,costs}/`
  - `/docs/{gtm,compliance,evidence}/`
- **Make targets:** `make up` (golden), `make smoke`, `make up-ai`, `make up-full`, `make demo` (runs golden script).
- **CI:** `.github/workflows/{ci.yml,security.yml,conftest.yml,smoke.yml}` add steps: build, test, sbom, scan, publish OPA bundle.
- **Config:** `.env.example` include Splunk, S3, Reddit credentials (commented); policy mode toggles.

---

## 8) Compliance & Responsible Use Pack
- **SBOM:** CycloneDX JSON attached to release; location `/evidence/sbom/cyclonedx.json`.
- **Security Whitepaper (rev A):** `/docs/compliance/security_whitepaper.md`.
- **Data Handling & DLP:** `/docs/compliance/data_handling.md` + OPA rules.
- **AI Responsible Use:** `/docs/compliance/ai_responsible_use.md` (guardrails & human‑in‑loop).
- **Export/ITAR:** screening statement and data‑classification table.

---

## 9) Pilot Offer (Land → Expand)
- **Scope:** 8 weeks, up to 3 datasets (Splunk + CSV/S3 + optional Reddit), 10 seats, single tenant.
- **Price:** $75k fixed or $45k + success milestone (go‑live ≤ 60 days). Gov: OTA/CSO‑friendly language.
- **Success Criteria:** time‑to‑insight, policy auditability, SOC‑2‑style controls, referenceable champion.
- **Exit:** production proposal with ramp pricing; training & role‑based packaging.

**Artifacts:** `/docs/gtm/pilot_offer.md`, `/docs/gtm/exec_onepager.md`, `/docs/gtm/deck/*`.

---

## 10) Risks & Mitigations
- **Connector friction (auth/rate limits):** provide mocked fixtures + contract tests; progressive enhancement.
- **Policy latency:** OPA sidecar + local cache; benchmark.
- **Graph cost/perf:** limit chunk sizes; pre‑compute common traversals; add budget guardrails.
- **Security regressions:** block merges on CI security; weekly hygiene workflow.

---

## 11) Metrics & Reporting
- **Pipeline:** # pilots created, # qualified meetings, conversion pilot→prod.
- **Product:** TTI P50/P95; latency P95; test pass rate; error budget.
- **Compliance:** SBOM generated; # criticals (target 0); policy coverage %.

**Weekly report:** `/reports/sprint_2025-09-29_weekly.md` with deltas, blockers, asks (top 5 with $$ impact).

---

## 12) Week‑by‑Week Plan
**Week 1 (Sep 30–Oct 6):**
- Golden path scaffolds (FE/BE), Splunk + S3/CSV connectors, OPA initial, OTel base, PRD & pilot draft.
- Deliver smoke tests; first demo by Oct 3; fix latency hotspots.

**Week 2 (Oct 7–Oct 14):**
- NL→Cypher iface, Reddit OSINT, redaction masks, OpenAPI, dashboards, evidence bundle, GTM assets.
- Freeze Oct 13; demo Oct 14.

---

## 13) Demo Script (Oct 14)
1. `make up` → seed sample data.
2. Conductor: enable Splunk & S3 connectors; ingest 10k events + CSV entities.
3. Investigator UI: ask question → show graph, timeline, map; citations & policy banner.
4. Flip persona → redactions kick in; audit log view.
5. Dashboards: traces & SLO; show error budget.
6. Close with pilot offer & TCO.

---

## 14) Open Questions (Log & Decide by Oct 3)
- Preferred hosting for pilot (VPC vs on‑prem demo)?
- Splunk auth mode for target pilot(s)?
- Tenant isolation boundary for demo (namespace vs cluster)?

---

## 15) Issue Seeds (create in tracker)
- `FE-101` Tri‑pane layout + policy banner
- `BE-201` Audit log with hash chain
- `ETL-301` Splunk search connector
- `ETL-302` S3/CSV loader
- `SEC-401` OPA ABAC policy personas
- `SRE-501` OTel traces + dashboards
- `FE-102` Citations & report export
- `BE-202` OpenAPI contract
- `ETL-303` Reddit OSINT pull
- `BIZ-601` Pilot offer & deck

---

## Appendix A — Useful Make Targets (as found in repo)
- `make up`, `make up-ai`, `make up-full`, `make smoke`, `make demo`, `make down`, `make logs`, `make ps`.

## Appendix B — Directory Map (to create/confirm)
- `/client/src/features/investigation/*`
- `/server/src/{api,auth,policy,audit}/`
- `/ingestion/connectors/{splunk,s3csv,reddit}/`
- `/policy/opa/{bundles,tests}/`
- `/ops/{otel,dashboards,costs}/`
- `/docs/{gtm,compliance,evidence}/`
- `/scripts/demo/*`, `/seed/*`

---

**Owner:** Felix (The B.I.Z.) — VP Sales/BD/Growth  
**Last Updated:** Sep 29, 2025 (v1.0.0)
```

