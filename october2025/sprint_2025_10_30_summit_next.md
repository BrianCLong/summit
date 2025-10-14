```markdown
# Sprint Plan — Summit / IntelGraph / Maestro Conductor
**Slug/Version:** `sprint-2025-10-30-intelgraph-summit-v1.2.0`
**Dates:** Oct 30–Nov 13, 2025 (2 weeks)
**Timezone:** America/Denver

> Focus: **Pilot scale‑up & hardening.** Ship air‑gap playbook v1, OpenAPI v2 + SDKs, cost governance (budgets + alerts), report export & share, and first customer reference package. Land at least **1 signed pilot SOW** while keeping golden path green.

---

## 0) North‑Star & Guardrails
- **North‑Star:** Time‑to‑Insight (TTI) P50 ≤ 5m; P95 ≤ 15m on 100k‑event dataset.
- **Guardrails:** API read P95 ≤ 300 ms; OPA decision P95 ≤ 10 ms; **0 critical** security findings; `make up` and smoke must pass on main.

---

## 1) Objectives (Demo on Nov 13)
1. **Air‑Gap v1:** documented + scripted deploy with offline bundles, mirrored registry, and manual SBOM verify.
2. **OpenAPI v2 & SDKs:** expanded schemas (entities, edges, queries, audit); TS & Python SDKs published.
3. **Cost Governance:** per‑tenant meters, budgets, and alerts; usage dashboard.
4. **Investigation Report Export & Share:** PDF/MD export with citations, policy banner, and redaction applied.
5. **Pilot Ops Pack:** runbooks Day‑2, on‑call, backup/restore; evidence pack v2; pilot SOW(s) ready to sign.
6. **Reference Candidate:** one case study draft (pilot anonymized) + quotes.

---

## 2) Scope & Priority
- **P0 (Must):** Air‑gap playbook + scripts; OpenAPI v2 + TS/Py SDKs; cost budgets + alerts; export/share; pilot SOWs; evidence pack v2.
- **P1 (Should):** Relevance feedback loop (thumbs up/down → stored); connector backpressure + retry tuning; GraphRAG prompt linting.
- **P2 (Could):** Neo4j query cache; map view clustering; multi‑tenant report branding.
- **Won’t:** Full FedRAMP SSP; cross‑region HA; model‑specific fine‑tunes.

---

## 3) Swimlanes & Owners
- **Product/GTM (Felix):** Pilot SOW(s), pricing pack v2, reference case draft, exec deck v2.1, outreach cadence.
- **Frontend:** Report export/share; relevance feedback widget; masking verification in exports; map clustering (P2).
- **Backend:** OpenAPI v2; audit search; relevance feedback capture; query cache (P2).
- **Data/ETL:** Connector backpressure/retry tuning; provenance completeness checks; DLQ inspector.
- **SecEng:** Air‑gap controls; offline OPA bundle signing; SBOM verification procedure; DPIA/DPA finalize.
- **SRE:** Air‑gap scripts; registry mirror; usage/cost dashboards; alerting; backup/restore runbooks.

---

## 4) Backlog (Stories & Tasks)

### P0 — Air‑Gap v1
- **P0‑1** Registry Mirror Script (owner: SRE)
  - Mirror required images; generate `images.lock`; offline `docker load` bundle; verify SHAs.
- **P0‑2** Offline Policy Bundles (owner: SecEng)
  - Signed OPA bundle; rotation procedure; checksum manifest.
- **P0‑3** SBOM Manual Verify (owner: SecEng)
  - Procedure + checklist; attach to evidence pack; demo exercise with sample hash.
- **P0‑4** Air‑Gap Install Runbook (owner: SRE)
  - Networking, secrets, bootstrap order, day‑2 ops; validation script `verify-airgap.sh`.

### P0 — OpenAPI v2 & SDKs
- **P0‑5** OpenAPI v2 schemas (owner: BE)
  - Entities, relationships, search, audit, policy decision log; error model; pagination.
- **P0‑6** SDK TypeScript (owner: BE/FE)
  - Generate + hand‑written convenience methods; publish to `/docs/api/sdk/ts` and npm scope.
- **P0‑7** SDK Python (owner: BE)
  - `summit_intelgraph` package; examples: ingest, search, audit query.
- **P0‑8** API Conformance Tests (owner: QA)
  - Contract tests from OpenAPI; CI gate.

### P0 — Cost Governance
- **P0‑9** Metering (owner: SRE)
  - Track inference tokens, storage GB, connector compute; per tenant.
- **P0‑10** Budgets & Alerts (owner: SRE)
  - Budget thresholds; email/webhook alerts; block/notify modes.
- **P0‑11** Cost Dashboard (owner: SRE)
  - OTel‑backed panels; monthly rollups.

### P0 — Report Export & Share
- **P0‑12** Export Engine (owner: FE)
  - Render current investigation → PDF & Markdown; include citations; respect masks; embedded policy banner.
- **P0‑13** Share Token (owner: BE)
  - Time‑boxed, policy‑aware share link (viewer role); audit every open.

### P0 — Pilot Ops & SOWs
- **P0‑14** Day‑2 Ops Runbooks (owner: SRE/Product)
  - Backup/restore, rotation, patching; on‑call calendar template.
- **P0‑15** Pilot SOW Templates (Gov/Commercial) (owner: Product/GTM)
  - Scope, deliverables, milestones, acceptance, pricing; OTA/CSO language block.
- **P0‑16** Evidence Pack v2 (owner: SecEng/Product)
  - Updated SBOM, SSDF checklist, policy logs, perf screenshots.

### P1 — Feedback & Connectors
- **P1‑1** Relevance Feedback Capture (owner: FE/BE)
  - Thumbs up/down + comment; store on Q/A; surface in eval.
- **P1‑2** Connector Backpressure/Retry (owner: Data)
  - Token buckets; exponential backoff; alert on DLQ growth.
- **P1‑3** Prompt Linting (owner: BE)
  - Lint common GraphRAG prompts; guard tokens; log anomalies.

### P2 — Niceties
- **P2‑1** Query Cache (owner: BE)
  - Cache HOT Cypher w/ TTL + invalidation on ingest.
- **P2‑2** Map Clustering (owner: FE)
  - Cluster markers by zoom; avoids overplot.
- **P2‑3** Report Branding (owner: FE)
  - Tenant logo & footer config.

---

## 5) Acceptance Criteria & DoD
- **Air‑Gap v1:** install succeeds on isolated host; all containers from mirror; policy bundle validates; SBOM hashes match; `verify-airgap.sh` returns OK.
- **OpenAPI & SDKs:** spec v2 merged; TS & Py SDKs pass samples; contract tests green in CI.
- **Cost:** per‑tenant meters non‑zero; budgets fire alerts at thresholds; dashboard shows last 24h and MTD.
- **Export/Share:** export produces PDF & MD; masks applied; share link respects viewer policy; audit logs open events.
- **Evidence:** updated pack committed; demo screenshots; on‑call plan filed.
- **GTM:** ≥1 pilot SOW sent; ≥1 verbal commit or countersigned if available.

---

## 6) Cadence & Dates
- **Standup:** 09:30 MT daily
- **Mid‑sprint demo:** Nov 6, 15:00 MT
- **Code freeze:** Nov 12, 12:00 MT
- **Review & demo:** Nov 13, 15:00 MT
- **Retro:** Nov 13, 16:00 MT

---

## 7) Metrics
- **Quality:** export success rate; SDK adoption (sample runs); relevance feedback volume.
- **Perf:** API P95; OPA P95; connector retry success.
- **Reliability:** error budget; DLQ size; share‑link 4xx/5xx.
- **GTM:** SOWs out; pilots signed; meetings booked; reference quotes captured.

---

## 8) Risks & Mitigations
- **Air‑gap drift:** lock images in `images.lock`; SHA verify; doc exact versions.
- **SDK surface creep:** scope to P0 endpoints; backlog rest.
- **Budget false positives:** start in notify mode; tune thresholds.
- **Export privacy:** unit tests for masking; manual QA with persona swap.

---

## 9) Deliverables (Repos & Docs)
- `ops/airgap/{mirror.sh,images.lock,verify-airgap.sh}`
- `policy/opa/bundles/offline/*.tar.gz` + `checksums.txt`
- `docs/api/openapi.v2.yaml`
- `docs/api/sdk/ts/*` + `docs/api/sdk/python/*`
- `ops/dashboards/costs.json`
- `client/src/features/report/{export-pdf.ts,export-md.ts,share.ts}`
- `server/src/share/{tokens.ts,policy-check.ts}`
- `docs/runbooks/{backup_restore.md,oncall.md}`
- `docs/gtm/pilot_sow_{gov,commercial}.md`
- `docs/evidence/v2/*` (sbom, screenshots, logs)
- `CHANGELOG_sprint-2025-10-30.md`

---

## 10) Week Plan
**Week 1 (Oct 30–Nov 5):** Air‑gap scripts & bundles, OpenAPI v2 schemas, TS SDK, cost meters, export engine v0; draft SOWs.

**Week 2 (Nov 6–Nov 13):** Python SDK; budgets/alerts; share link + audit; DLQ/backpressure tuning; evidence pack v2; demo polish; SOWs out.

---

## 11) Demo Script (Nov 13)
1. Run `mirror.sh` to show air‑gap bundle; deploy from mirror; `verify-airgap.sh`.
2. Query via new SDKs (TS & Python); show audit search endpoint.
3. Ingest burst → show backpressure/retries; provenance stamps.
4. Ask + approve → relevance feedback after answer; thumbs up stored.
5. Export investigation (PDF & MD), open share link as viewer persona.
6. Show cost dashboard; trigger budget alert with simulated load.

---

## 12) Carry‑Over / Defer
- **Carry‑Over:** any OpenAPI edge cases; Reddit throttling tweaks.
- **Defer:** full HA multi‑region; query cache beyond P2; multi‑tenant branding.

---

**Owner:** Felix (The B.I.Z.) — VP Sales/BD/Growth  
**Last Updated:** Oct 3, 2025 (v1.2.0 plan)
```

