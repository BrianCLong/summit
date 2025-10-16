```markdown
# Sprint Plan — Summit / IntelGraph / Maestro Conductor

**Slug/Version:** `sprint-2026-01-17-intelgraph-summit-v1.7.0`
**Dates:** Jan 17–Jan 31, 2026 (2 weeks)
**Timezone:** America/Denver

> Focus: **Post‑GA scale & expansions.** Land 2 pilots from ABM wave, progress 1 enterprise production upsell, expand connector coverage, publish SDK samples, and ready marketplace listings (private → public gate). Raise reliability bar and close first external reference.

---

## 0) North‑Star & Guardrails

- **North‑Star:** **$250k** new ARR in commit (2 pilots + 1 upsell) and 1 public or anonymized reference story live.
- **SLOs:** Availability ≥ 99.7%; Read P95 ≤ 250 ms; Policy P95 ≤ 8 ms; Error budget burn < 15%.
- **Security:** 0 criticals; SBOM on `v1.7.0`; monthly access review.

---

## 1) Objectives (Demo on Jan 31)

1. **Pilots Signed (2):** proposals out, security packs delivered, start dates scheduled.
2. **Enterprise Upsell Path:** success plan v2 + scoped expansion SOW drafted.
3. **Connector Expansion:** Jira/Confluence (Cloud) read‑only ingest; MISP/STIX TAXII pull; CSV schema registry v1.
4. **SDK Learn Hub:** notebooks + code samples (search, graph ops, audit) for TS/Py; sample datasets.
5. **Marketplace Readiness:** Splunkbase/ServiceNow listing checklists completed; legal & support plans reviewed.
6. **Reliability & Cost:** query cache tuning; cost anomaly notifications (notify‑only); DLQ inspector UI.

---

## 2) Scope & Priority

- **P0 (Must):** 2 pilot proposals & security packet; Jira/Confluence + MISP/TAXII connectors; SDK learn hub; cache tuning; anomaly notify; DLQ inspector; listing checklists.
- **P1 (Should):** CSV schema registry; audit search facets in UI; report branding polish; partner co‑marketing dates.
- **P2 (Could):** Simple entity resolution rules; geo clustering improvements; OpenAPI minor endpoints.
- **Won’t:** Payment rails; FedRAMP package; full SOC 2 (prep only).

---

## 3) Swimlanes & Owners

- **Product/GTM (Felix):** Pilot proposals, upsell scope, reference story, marketplace checklist, partner calendar.
- **Frontend:** Audit facets, DLQ inspector UI, branding polish, SDK docs site styling.
- **Backend:** Jira/Confluence connector services, MISP/TAXII client + normalizer, cache tuning, anomaly notifier.
- **Data/ETL:** CSV schema registry, provenance completeness, sample datasets.
- **SecEng:** Security packet refresh, access review, marketplace support/SLA notes.
- **SRE:** Dashboards tune, anomaly pipeline wiring, error budget monitor, release `v1.7.0` tagging.

---

## 4) Backlog (Stories & Tasks)

### P0 — Pilots & Upsell

- **P0‑1** Pilot Proposal Template v2 (owner: GTM)
  - Tailor to 2 targets; scope, success, pricing; OTA/CSO language blocks.
- **P0‑2** Security Packet Refresh (owner: SecEng)
  - SBOM v1.7, SSDF mapping, data handling, OPA policy samples; PDF bundle.
- **P0‑3** Enterprise Upsell Scope (owner: GTM/Product)
  - Seat expansion + dataset add‑on; ramp pricing; SOW draft.

### P0 — Connectors

- **P0‑4** Jira Cloud Connector (owner: BE/Data)
  - OAuth; JQL search; normalize issues/comments → entities/edges; provenance per batch; tests.
- **P0‑5** Confluence Cloud Connector (owner: BE/Data)
  - Space/page pull; content → chunks → entities; linkbacks; rate limiting.
- **P0‑6** MISP/TAXII Pull (owner: BE/Data)
  - TAXII 2.1 client; STIX objects to graph; indicators provenance; throttle & retries.

### P0 — SDK Learn Hub

- **P0‑7** Notebooks & Samples (owner: Product/BE)
  - `/docs/sdk/notebooks/{search.ipynb,graph.ipynb,audit.ipynb}`; TS scripts equivalents; sample dataset loader.
- **P0‑8** Docs Site (owner: FE)
  - Minimal landing under `/docs/sdk/README.md`; links to quickstarts & notebooks.

### P0 — Reliability & Cost

- **P0‑9** Query Cache Tuning (owner: BE)
  - Hot path cache; invalidation metrics; target hit rate ≥ 60% on demo dataset.
- **P0‑10** Cost Anomaly Notify (owner: BE/SRE)
  - z‑score spike detect on tokens/storage; notify channels; false positives < 10% on week sample.
- **P0‑11** DLQ Inspector UI (owner: FE)
  - View DLQ batches; retry/purge; provenance preview; RBAC‑guarded.

### P1 — UX & Data

- **P1‑1** CSV Schema Registry v1 (owner: Data)
  - JSON schema per dataset; validation; map editor stub.
- **P1‑2** Audit Search Facets UI (owner: FE)
  - Actor/action/date; export CSV.
- **P1‑3** Branding Polish (owner: FE)
  - Tenant logo in headers; PDF export check.

### P2 — Extras

- **P2‑1** Entity Resolution Rules (owner: BE)
  - Email/domain/company fuzzy; threshold config; audit of merges.
- **P2‑2** Geo Clustering (owner: FE)
  - Zoom‑level thresholds; performance check.

---

## 5) Acceptance Criteria & DoD

- **Pilots:** 2 proposals out with security packets; calendar holds for start dates; internal green‑light.
- **Upsell:** expansion SOW draft completed; pricing alignment documented.
- **Connectors:** Jira & Confluence read‑only ingest deliver normalized events with provenance; TAXII STIX objects ingested; rate limits obeyed.
- **SDK:** notebooks run; TS scripts run; docs site live; sample dataset load script works.
- **Reliability/Cost:** cache hit ≥ 60%; anomaly notifications triggered in test; DLQ inspector functions with RBAC.
- **Marketplace:** listing checklists completed; legal/support sign‑off notes captured.

---

## 6) Cadence & Dates

- **Standup:** 09:30 MT daily
- **Mid‑sprint demo:** Jan 24, 15:00 MT
- **Code freeze:** Jan 30, 12:00 MT
- **Review & demo:** Jan 31, 15:00 MT
- **Retro:** Jan 31, 16:00 MT

---

## 7) Metrics

- **Business:** proposals sent, pilots signed, ARR commit, upsell stage.
- **Product:** cache hit rate, ingest throughput, DLQ size, anomaly count.
- **Adoption:** SDK notebook runs, docs visits, connector usage.

---

## 8) Deliverables (Repos & Docs)

- `ingestion/connectors/{jira,confluence,taxii}/` + tests
- `server/src/costs/{anomaly.ts}`
- `client/src/admin/dlq/*`
- `docs/sdk/notebooks/*` + `docs/sdk/README.md`
- `docs/gtm/pilot_proposals/{targetA.md,targetB.md}`
- `docs/contracts/SOW_upsell_enterprise.md`
- `docs/marketplaces/{splunkbase_checklist.md,servicenow_checklist.md}`
- `docs/evidence/v1.7/*` (sbom, policy samples)
- `CHANGELOG_sprint-2026-01-17.md`

---

## 9) Demo Script (Jan 31)

1. Show Jira/Confluence ingest and graph view with provenance.
2. Pull STIX via TAXII; display indicators linked to entities.
3. Run SDK notebook & TS sample; navigate docs site.
4. Show DLQ inspector; retry a batch; observe success.
5. Trigger cost anomaly notify in test; show alert and audit log.
6. Walk through pilot proposals & upsell SOW; show marketplace checklists.

---

**Owner:** Felix (The B.I.Z.) — VP Sales/BD/Growth  
**Last Updated:** Oct 11, 2025 (v1.7.0 plan)
```
