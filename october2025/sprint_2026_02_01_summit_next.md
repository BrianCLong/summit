```markdown
# Sprint Plan — Summit / IntelGraph / Maestro Conductor

**Slug/Version:** `sprint-2026-02-01-intelgraph-summit-v1.8.0`
**Dates:** Feb 1–Feb 15, 2026 (2 weeks)
**Timezone:** America/Denver

> Focus: **Marketplace Launch + Second‑Wave Pilots.** Public listings (gated) for first integration, close 2 pilots from Jan ABM wave, deliver CSV Schema Registry v1, stand up STIX/MISP evals with sample datasets, and harden multi‑tenant analytics & audit UX. Target **$300k new ARR in commit** and 1 public webinar registration ≥ 150.

---

## 0) North‑Star & Guardrails

- **North‑Star:** 2 pilots countersigned + Marketplace listing live (private→public gate passed) + webinar scheduled with ≥150 registrants.
- **SLOs:** Availability ≥ 99.7%; Read P95 ≤ 250 ms; Policy P95 ≤ 8 ms.
- **Security:** Critical CVEs = 0; SBOM on `v1.8.0` tag; marketplace security review docs attached.

---

## 1) Objectives (Demo on Feb 15)

1. **Marketplace Public Listing:** Splunkbase **or** ServiceNow Store public listing approved with support/SLA pages.
2. **Pilot Signatures (2):** finalized SOWs, start dates booked, security packet delivered.
3. **CSV Schema Registry v1:** UI + API for dataset schemas, validation errors, and map editor.
4. **Threat Intel Track:** MISP/TAXII end‑to‑end with sample STIX sets, indicator linking, and enrichment hook.
5. **Audit & Analytics UX:** audit facets + export, tenant analytics dashboard (usage, costs, TTI proxy).
6. **Marketing & Events:** webinar landing page + assets, outreach cadence, press/analyst brief draft.

---

## 2) Scope & Priority

- **P0 (Must):** Marketplace listing public; 2 pilot SOWs signed; schema registry UI/API; MISP/TAXII E2E; audit facets + export; tenant analytics.
- **P1 (Should):** Enrichment hook (VT/OTX stub); ABM wave 2 emails; docs refresh; connector health board.
- **P2 (Could):** Simple entity resolution rules in registry; map clustering polish; AI prompt guardrails lint v2.
- **Won’t:** Payment processing; multi‑region HA; full SOC2 audit.

---

## 3) Swimlanes & Owners

- **Product/GTM (Felix):** Marketplace package, pilots closure, webinar, press/analyst draft, ABM wave 2.
- **Frontend:** Schema registry UI, audit facets/export, tenant analytics dashboard.
- **Backend:** Registry APIs, MISP/TAXII pipeline, enrichment hook, audit search API v2, analytics rollups.
- **Data/ETL:** Schema validation, sample datasets, connector health metrics, DLQ signals.
- **SecEng:** Marketplace security responses, SBOM/tag, DPIA updates for new pilots.
- **SRE:** Release `v1.8.0`, dashboards for tenant analytics, uptime/SLO panels, alerting hygiene.

---

## 4) Backlog (Stories & Tasks)

### P0 — Marketplace Public Listing

- **P0‑1** Listing Artifacts (owner: Product)
  - Description, screenshots, video, support/SLA page, privacy & security FAQ.
- **P0‑2** Security Review Docs (owner: SecEng)
  - SBOM, data handling, permission scopes, support contacts.
- **P0‑3** Submission & QA (owner: Product/Integrations)
  - Address reviewer feedback; track status; announce when live.

### P0 — Pilots Closure

- **P0‑4** Pilot SOWs (owner: Product/GTM)
  - Redlines closed; countersignature; scheduled kickoff; CRM stage moved.
- **P0‑5** Security Packet Delivery (owner: SecEng)
  - Packet tailored per pilot; confirmation receipts.

### P0 — CSV Schema Registry v1

- **P0‑6** Registry API (owner: BE/Data)
  - CRUD schemas; versioning; validation endpoint; provenance.
- **P0‑7** Registry UI (owner: FE)
  - List/edit schemas; validation errors feedback; sample mapping import/export (JSON).

### P0 — Threat Intel Track (MISP/TAXII)

- **P0‑8** E2E Flow (owner: BE/Data)
  - Pull STIX bundles; normalize indicators → graph; provenance + throttle.
- **P0‑9** Enrichment Hook (owner: BE) _(P1)_
  - Stub callout to VirusTotal/OTX; cache; toggle via config.

### P0 — Audit & Analytics UX

- **P0‑10** Audit Facets + Export (owner: BE/FE)
  - Actor/action/date facets; CSV export; P95 ≤ 400 ms for facet queries on demo data.
- **P0‑11** Tenant Analytics (owner: SRE/BE/FE)
  - Usage, costs, tokens, TTI proxy (query span); dashboard + admin page.

### P1 — Marketing & ABM

- **P1‑1** Webinar Landing & Emails (owner: GTM)
  - Reg page copy; confirmation & reminders; presenter deck outline.
- **P1‑2** Press/Analyst Brief (owner: GTM)
  - 1‑pager with proof points; embargo plan.
- **P1‑3** Connector Health Board (owner: SRE)
  - Panel showing status, retry rate, DLQ size per connector.

---

## 5) Acceptance Criteria & DoD

- **Marketplace:** Public listing live; reviewer checklist passed; support/SLA page public; announcement copy ready.
- **Pilots:** Two signed SOWs with kickoff dates; CRM updated; security packet receipts.
- **Registry:** Create/edit schema works; validation catches errors; export/import JSON; tests pass.
- **MISP/TAXII:** STIX bundle pulls succeed; indicators linked to entities; enrichment stub toggle works.
- **Audit/Analytics:** Faceted search returns ≤ 400 ms P95 on demo; CSV export downloaded; tenant analytics dashboard populated.
- **Marketing:** Webinar landing live; first 100+ registrants; press/analyst brief drafted.

---

## 6) Cadence & Dates

- **Standup:** 09:30 MT daily
- **Mid‑sprint demo:** Feb 8, 15:00 MT
- **Code freeze:** Feb 14, 12:00 MT
- **Review & demo:** Feb 15, 15:00 MT
- **Retro:** Feb 15, 16:00 MT

---

## 7) Metrics

- **Business:** pilots signed, ARR commit, webinar registrations, marketplace installs/leads.
- **Product:** schema validation errors rate, audit facet latency, TTI proxy, connector health.
- **Reliability/Cost:** error budget, DLQ size, anomaly count.

---

## 8) Deliverables (Repos & Docs)

- `docs/marketplaces/{listing_assets/*,security_faq.md}`
- `docs/contracts/pilots/{pilotA_signed.md,pilotB_signed.md}`
- `server/src/registry/{schemas.ts,validation.ts}` + `client/src/admin/registry/*`
- `ingestion/connectors/taxii/*` + `server/src/ti/enrichment_stub.ts`
- `client/src/admin/audit/{facets.tsx,export.ts}` + `server/src/audit/search_v2.ts`
- `ops/dashboards/tenant_analytics.json` + `client/src/admin/analytics/*`
- `docs/gtm/webinar/{landing_copy.md,emails.md,deck_outline.md}`
- `docs/analyst/press_brief.md`
- `CHANGELOG_sprint-2026-02-01.md`

---

## 9) Demo Script (Feb 15)

1. Show marketplace listing live + support/SLA page; install flow overview.
2. Confirm two pilot SOWs countersigned; display kickoff plan snippet.
3. Create/edit a CSV schema; ingest sample; show validation errors then success; provenance visible.
4. Pull STIX via TAXII; view indicators and links; toggle enrichment stub.
5. Use audit facets & export; open tenant analytics; discuss TTI proxy trend.
6. Show webinar landing & registration count; walk through press/analyst brief highlights.

---

**Owner:** Felix (The B.I.Z.) — VP Sales/BD/Growth  
**Last Updated:** Oct 12, 2025 (v1.8.0 plan)
```
