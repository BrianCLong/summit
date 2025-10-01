```markdown
# Sprint Plan — Summit / IntelGraph / Maestro Conductor
**Slug/Version:** `sprint-2025-10-15-intelgraph-summit-v1.1.0`
**Dates:** Oct 15–Oct 29, 2025 (2 weeks)
**Timezone:** America/Denver

> Focus: convert pilot‑ready MVP into **pilot‑in‑a‑box** with NL→Cypher v1, connector hardening, policy performance, and a repeatable deployment & eval harness. Includes packaging for 2 pilot lanes (Gov VPC, Enterprise VPC) and readiness to sign SOWs.

---

## 0) North‑Star & Guardrails (unchanged)
- **North‑Star:** Time‑to‑Insight (TTI) P50 ≤ 5m; P95 ≤ 15m on new dataset.
- **Guardrails:** Core read path latency P95 ≤ 300 ms; **0 critical** security findings; deployable‑first (`make up` & smoke pass on main).

---

## 1) Sprint Objectives (Demo on Oct 29)
1. **NL→Cypher v1** with approval UX, templates, and eval set → measured precision/recall, error analysis.
2. **Connectors Hardened:** Splunk (error handling, auth variants), S3/CSV (schema maps + DLQ), Reddit OSINT throttling & provenance stamps.
3. **Policy Performance:** OPA decision cache; redaction masks per persona; P95 policy decision ≤ 10 ms at gateway.
4. **Pilot‑in‑a‑Box:** Terraform modules + runbooks for Gov VPC & Enterprise VPC; one‑click seed + demo script; “Day 2” ops checklist.
5. **Evidence & Contracts:** Pilot SOW template (Gov/Commercial), DPA + DPIA fillable, SBOM automated on release tag.

---

## 2) Scope
- **P0 (Must):** NL→Cypher v1 + eval harness; Splunk auth variants; S3/CSV schema mapping; OPA cache; Terraform stack for two lanes; CI gates for SBOM + security.
- **P1 (Should):** Reddit connector throttling & retry; OpenAPI v1; cost meters and budget guardrails; UI redaction masks; investigator report export.
- **P2 (Could):** Air‑gap deploy playbook (doc + scripts); Kafka ingest profile stub; Relevance feedback loop in UI.
- **Won’t:** Full FedRAMP package; cross‑tenant multi‑region; advanced auto‑tuning for NL→Cypher.

---

## 3) Swimlanes & Owners
- **Product/GTM (Felix):** SOWs, pricing pack, exec deck v2, references pipeline.
- **Frontend:** Approval UX for NL→Cypher; redaction masks; report export (PDF/MD); audit viewer polish.
- **Backend:** NL→Cypher templates + orchestrator; audit log API enhancements; OpenAPI v1; policy cache at gateway.
- **Data/ETL:** Splunk auth variants (Token, Basic, SAML proxy); S3/CSV schema maps; Reddit throttling; provenance stamps.
- **SecEng:** OPA bundle perf + tests; CI security gates; DPIA/DPA forms; PII patterns.
- **SRE:** Terraform `pilot_vpc_gov` & `pilot_vpc_ent`; OTel dashboards v2; cost meters & budgets; release pipeline with SBOM.

---

## 4) Backlog (User Stories & Tasks)

### P0 — NL→Cypher v1
- **P0‑1** NL→Cypher Templates (owner: BE)
  - Define 10 canonical graph queries (entity lookup, neighborhood, paths, co‑occurrence, time‑bounded events).
  - Prompt/plan generator maps NL → template + params; fallbacks.
  - **Acceptance:** ≥ 80% of eval set choose correct template.
- **P0‑2** Approval UX (owner: FE)
  - Show generated Cypher + rationale; user can edit and approve; persist audit link to question.
- **P0‑3** Eval Harness (owner: BE/Product)
  - `eval/nl2cypher/*.json` truth set (50 queries); scorer for template selection accuracy + answer grounding.

### P0 — Connectors Hardened
- **P0‑4** Splunk Auth Variants (owner: Data)
  - Support **Bearer**, **Basic**, and **SAML‑proxy API**; config via `.env` & Conductor; retries + backoff; pagination.
- **P0‑5** S3/CSV Schema Mapping (owner: Data)
  - Map file format with field types + PK; bad‑row DLQ; idempotent upsert; unit tests with fixtures.

### P0 — Policy Performance & Cache
- **P0‑6** OPA Decision Cache (owner: SecEng)
  - In‑process LRU with TTL; cache key = policy + attributes + resource sensitivity; **P95 ≤ 10 ms**.
- **P0‑7** Policy Telemetry (owner: SRE)
  - OTel spans for `authz_decision`; dashboard panel with hit/miss ratio.

### P0 — Pilot‑in‑a‑Box
- **P0‑8** Terraform Lanes (owner: SRE)
  - `ops/terraform/pilot_vpc_gov` (GovCloud‑like) and `pilot_vpc_ent` (commercial); variables for tenant name, CIDR, instance sizes.
  - **Acceptance:** `terraform apply` + `make demo` works in a clean account.
- **P0‑9** Runbooks (owner: SRE/Product)
  - Install, networking, secrets, connector enablement, seed, demo; Day‑2 ops (backup, rotate, patch).

### P1 — API, Cost, UI Polish
- **P1‑1** OpenAPI v1 (owner: BE)
  - flesh out schemas; generate SDK (TypeScript); publish to `/docs/api`.
- **P1‑2** Cost Meter & Budgets (owner: SRE)
  - track inference calls & storage; per‑tenant budgets + alerts.
- **P1‑3** Redaction Masks UI (owner: FE/SecEng)
  - Persona‑based masks; tooltip explains policy; copy‑to‑report respects masks.
- **P1‑4** Report Export (owner: FE)
  - Export current investigation state to PDF/MD with citations and policy banner.
- **P1‑5** Reddit Throttling + Provenance (owner: Data)
  - Rate limiters; source stamps on nodes/edges.

### P2 — Hardening & Air‑gap
- **P2‑1** Air‑gap Playbook (owner: SRE)
  - Image registry mirroring; offline OPA bundles; manual SBOM verification.
- **P2‑2** Kafka Ingest Profile Stub (owner: Data)
  - Contract + small harness; not wired into demo path yet.

---

## 5) Acceptance Criteria & Definition of Done
- **NL→Cypher v1:** ≥80% template match on eval set; approval UX merged; audit links created.
- **Connectors:** Splunk supports 3 auth modes; S3/CSV DLQ visible; retries/backoff tested; provenance recorded.
- **Policy:** OPA cached decisions P95 ≤ 10 ms; hit ratio ≥ 80% on demo path; policy spans visible in dashboard.
- **Pilot‑in‑a‑Box:** Both Terraform lanes pass `apply` in test accounts; runbooks validated by a non‑author.
- **Evidence:** SBOM attached to `v1.1.0` release; DPA/DPIA templates filled; SOW templates committed.
- **Docs:** OpenAPI v1 + SDK published; demo script updated; report export works.

---

## 6) Cadence & Key Dates
- **Daily standup:** 09:30 MT  
- **Mid‑sprint demo:** Oct 22, 15:00 MT  
- **Code freeze:** Oct 28, 12:00 MT  
- **Sprint review & sign‑off:** Oct 29, 15:00 MT  
- **Retro:** Oct 29, 16:00 MT

---

## 7) Metrics & Dashboards
- **Quality:** NL→Cypher template accuracy; grounded answer precision; UI approval adoption rate.
- **Performance:** Policy decision P95; API read P95; ingest throughput.
- **Reliability:** Error budget burn; connector retry success %.
- **GTM:** # pilots scoped; # SOWs out; meetings booked; pilot lane deployments.

---

## 8) Risks & Mitigations
- **NL→Cypher quality variance:** add manual overrides + quick‑edit; maintain eval set; capture false positives.
- **Connector auth complexity:** matrix tests for Splunk; feature flags per pilot.
- **Policy cache consistency:** conservative TTL + invalidation on role/attr change; log decisions.
- **Terraform drift in customer VPCs:** lock versions; preflight checks; dry‑run plans attached to PRs.

---

## 9) Deliverables List (PRs & Docs)
- `eval/nl2cypher/sets/pilot_v1.json` (50 items) + `eval/score_nl2cypher.ts`  
- `client/src/features/investigation/approval/*`  
- `server/src/nl2cypher/{templates,orchestrator}.ts`  
- `ingestion/connectors/splunk/auth/*` + tests  
- `ingestion/connectors/s3csv/{schema-map.json,dlq/}`  
- `policy/opa/{bundles,tests}/perf/*`  
- `ops/terraform/pilot_vpc_{gov,ent}/`  
- `docs/runbooks/{install,day2}.md`  
- `docs/api/openapi.yaml` + `/docs/api/sdk/ts/*`  
- `docs/gtm/pilot_sow_{gov,ent}.md`  
- `docs/compliance/{dpa_template.md,dpia_template.md}`  
- `CHANGELOG_sprint-2025-10-15.md`

---

## 10) Week Plan
**Week 1 (Oct 15–Oct 21):** NL→Cypher templates + eval, Splunk auth variants baseline, OPA cache prototype, Terraform lane skeletons, SOW templates draft.

**Week 2 (Oct 22–Oct 29):** Approval UX, OpenAPI v1 + SDK, cost meters, S3/CSV DLQ + schema maps, Terraform validation in test accounts, evidence pack & release tagging.

---

## 11) Demo Script (Oct 29)
1. Deploy **pilot_vpc_ent** via Terraform → `make demo` seeds data.
2. Ask NL question → show generated Cypher, approve, run; present grounded answer + citations.
3. Switch persona → redaction masks apply; audit viewer shows trace + policy decision with cache hit.
4. Show Splunk auth switch; re‑ingest; provenance stamps.
5. Dashboards: policy P95, API P95, error budget; cost meter.
6. Export investigation report (PDF/MD) & show SBOM on release `v1.1.0`.

---

## 12) Carry‑Over & Defer Log
- **From previous sprint:** Reddit connector initial; some OpenAPI endpoints; outreach assets v1.  
- **Deferred:** Air‑gap automation; Kafka profile integration; advanced NL→Cypher self‑tuning.

---

**Owner:** Felix (The B.I.Z.) — VP Sales/BD/Growth  
**Last Updated:** Oct 1, 2025 (v1.1.0 plan)
```

