```markdown
# Sprint Plan — Summit / IntelGraph / Maestro Conductor
**Slug/Version:** `sprint-2026-01-02-intelgraph-summit-v1.6.0`
**Dates:** Jan 2–Jan 16, 2026 (2 weeks)
**Timezone:** America/Denver

> Focus: **GA Launch & Q1 Scale Kickoff.** Turn GA‑candidate into GA release, light up co‑sell motions with partners, tighten multi‑tenant ops, finalize pricing/packaging, and open two new pilot lanes. Target **2 signed pilots** + **1 production upsell** by end of January.

---

## 0) North‑Star & Guardrails
- **North‑Star:** GA tag `v1.6.0` shipped + **2 new pilots** in contracting + **$150k** new ARR in commit.
- **SLOs:** Availability ≥ 99.5%; Read P95 ≤ 300 ms; Policy P95 ≤ 10 ms; Error budget burn < 20%.
- **Security:** 0 criticals in CI; SBOM attached to GA tag; access reviews completed.

---

## 1) Objectives (Demo on Jan 16)
1. **GA Release:** cut/tag `v1.6.0`, migration verified, changelog + SBOM, upgrade playbook.
2. **Packaging & Pricing v1.0:** role‑based tiers (Investigator, Supervisor, Viewer), usage add‑ons (tokens/storage), Gov vs Commercial price cards.
3. **Partner Co‑Sell Ready:** Splunk app/ServiceNow webhook listed (private), partner brief + demo video, referral margin doc.
4. **Multi‑Tenant Ops:** quotas & budgets UI, tenant branding, admin controls; isolation preflight in CI.
5. **SDKs GA:** TS & Python SDKs versioned `1.0.0`, quickstarts, sample notebooks.
6. **GTM Engine:** Q1 ABM sequences live (first 50 accounts), webinar plan, event calendar, customer story v1 published (anon if needed).

---

## 2) Scope & Priority
- **P0 (Must):** GA tag; packaging/pricing docs; partner app listing (private); tenant admin UI; SDKs 1.0; ABM go‑live.
- **P1 (Should):** Query cache (HOT paths) on by default; report branding; success plan template v2; marketplace listing intake forms.
- **P2 (Could):** Cost anomaly alerts; audit search facets in UI; simple evaluator for GraphRAG changes.
- **Won’t:** Public marketplace listing (until legal review); FedRAMP SSP; multi‑region HA.

---

## 3) Swimlanes & Owners
- **Product/GTM (Felix):** Pricing & packaging, partner brief, ABM launch, webinar & events, case study publish.
- **Frontend:** Tenant admin (quotas/budgets/branding), audit facets, export polish.
- **Backend:** GA migrations, query cache default, audit search API v2, usage/budget endpoints.
- **Data/ETL:** Usage rollups & invoice stability, provenance completeness checks, connector fixtures.
- **SecEng:** Access reviews, SBOM on tag, policy coverage report, DPIA for GA customers.
- **SRE:** Release pipeline for GA, backup/restore verification, isolation preflight in CI, dashboards tweaks.

---

## 4) Backlog (User Stories & Tasks)

### P0 — GA Release
- **P0‑1** GA Tag & Migrations (owner: SRE/BE)
  - Cut branch `release/v1.6.0`; tag; run migrations on staging; smoke & synthetics green.
- **P0‑2** SBOM & Changelog (owner: SecEng/Product)
  - SBOM artifact uploaded; `CHANGELOG_v1.6.0.md` with notable changes & breaking notes.
- **P0‑3** Upgrade Guide (owner: Product/SRE)
  - v1.5.x → v1.6.0 steps; rollback plan; timing guidance.

### P0 — Packaging & Pricing v1.0
- **P0‑4** Price Cards (owner: Product)
  - Gov & Commercial, per‑seat and usage add‑ons; discount guidance; ramp options.
- **P0‑5** Order Form / Quote Template (owner: Product/Legal)
  - SKUs, terms, usage bands; DPA/DPIA references.
- **P0‑6** Internal Calculator (owner: Product/Finance)
  - Margin guardrails; floor/ceiling; promo code fields.

### P0 — Partner Co‑Sell Ready
- **P0‑7** App Listing (Private) (owner: Product/Integrations)
  - Splunkbase private listing or ServiceNow private store; README; support notes.
- **P0‑8** Partner Brief & Demo (owner: GTM)
  - 2‑pager + 3‑min video; referral/resell margin; lead routing.
- **P0‑9** Co‑Marketing Plan (owner: GTM)
  - Webinar + field event outline; joint target list.

### P0 — Multi‑Tenant Admin UI
- **P0‑10** Quotas/Budgets UI (owner: FE/BE)
  - View usage; set budgets; alerts recipients; audit changes.
- **P0‑11** Branding (owner: FE)
  - Logo/footer config; report export respects branding.
- **P0‑12** Isolation Preflight in CI (owner: SRE)
  - Tenant boundary tests; badge in PR checks.

### P0 — SDKs 1.0
- **P0‑13** TS SDK 1.0.0 (owner: BE/FE)
  - Version bump; examples: ingest/search/audit; NPM README.
- **P0‑14** Python SDK 1.0.0 (owner: BE)
  - PyPI publish; notebooks in `/docs/sdk/notebooks`.

### P0 — ABM & GTM Engine
- **P0‑15** ABM Launch (owner: GTM)
  - 50 named accounts; 3‑touch sequence; calendar invites; SDR/named‑AE owners.
- **P0‑16** Webinar & Events (owner: GTM)
  - Topic: Provenance‑first AI for investigations; date/time; speakers; reg page copy.
- **P0‑17** Case Study Publish (owner: GTM/Legal)
  - Approved copy; visuals; link from one‑pager & deck.

### P1 — Performance & UX
- **P1‑1** Query Cache Default (owner: BE)
  - HOT Cypher cache enabled; invalidation on writes; metrics.
- **P1‑2** Audit Search Facets (owner: BE/FE)
  - Actor, action, date; export CSV.
- **P1‑3** Success Plan Template v2 (owner: GTM/CS)
  - Milestones, risks, comms cadence.

### P2 — Analytics & Guardrails
- **P2‑1** Cost Anomaly Alerts (owner: BE/SRE)
  - z‑score on token & storage; notify mode only.
- **P2‑2** GraphRAG Eval Stub (owner: Product/BE)
  - Sample Q/A set; precision/recall snapshot.

---

## 5) Acceptance Criteria & DoD
- **GA:** Tag exists; migrations pass; SBOM & changelog published; upgrade guide merged.
- **Pricing:** price cards & order form committed; calculator available; internal approval received.
- **Partner:** private listing live; demo video + brief ready; margin doc approved.
- **Tenant Admin:** budgets/quotas configurable; branding visible; isolation test runs in CI.
- **SDKs:** TS/Py 1.0.0 published with working examples; notebooks run.
- **GTM:** ABM live to 50 accounts; webinar date set; case study link included in deck/one‑pager.

---

## 6) Cadence & Dates
- **Standup:** 09:30 MT daily  
- **Mid‑sprint demo:** Jan 9, 15:00 MT  
- **Code freeze:** Jan 15, 12:00 MT  
- **Review & demo:** Jan 16, 15:00 MT  
- **Retro:** Jan 16, 16:00 MT

---

## 7) Metrics
- **Business:** pilots signed; ARR commit; partner‑sourced pipeline.
- **Product:** cache hit rate; policy P95; audit search latency; upgrade success rate.
- **Adoption:** SDK downloads; admin usage edits; webinar registrations.

---

## 8) Deliverables (Repos & Docs)
- `docs/releases/CHANGELOG_v1.6.0.md` + SBOM under `docs/evidence/v1.6/*`
- `docs/gtm/pricing/{price_cards.md,order_form.md,internal_calc.xlsx}`
- `integrations/{splunk-app/* | servicenow-webhook/*}/LISTING.md`
- `docs/partners/{brief.pdf,demo_video_link.md,margin.md}`
- `client/src/admin/tenant/{budgets.tsx,branding.tsx}`
- `server/src/admin/tenant/{budgets.ts,usage.ts}`
- `docs/sdk/{typescript_quickstart.md,python_quickstart.md}` + `docs/sdk/notebooks/*`
- `docs/gtm/case_studies/{customer_v1_published.md}`
- `docs/abm/Q1_2026_campaign_plan.md` + `docs/abm/named_50.csv`

---

## 9) Demo Script (Jan 16)
1. Show GA upgrade path: migrate from rc → `v1.6.0`; smoke passes; SBOM & changelog.
2. Walk pricing: price cards & order form; create a sample quote; margin check.
3. Open partner app listing; play 3‑min demo; show referral flow.
4. Tenant admin: set budget & branding; isolation preflight in CI passes.
5. Run SDK samples (TS & Py) and notebook; show audit facets & cache hit metrics.
6. GTM: ABM live view; webinar page; published case study.

---

**Owner:** Felix (The B.I.Z.) — VP Sales/BD/Growth  
**Last Updated:** Oct 10, 2025 (v1.6.0 plan)
```

