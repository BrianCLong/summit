```markdown
# Sprint Plan — Summit / IntelGraph / Maestro Conductor

**Slug/Version:** `sprint-2025-12-17-intelgraph-summit-v1.5.0`
**Dates:** Dec 17–Dec 31, 2025 (2 weeks, holiday cadence)
**Timezone:** America/Denver

> Focus: **GA Candidate & Q1 launch setup.** Stabilize year‑end, close case study + reference, finish Partner Integration 1, soft‑launch billing exports, lock GTM assets, and prep Q1 ABM + events. Freeze on Dec 29 EOD; only P0 fixes after.

---

## 0) North‑Star & Guardrails

- **North‑Star:** GA candidate branch `release/ga-candidate-2025.12` tagged, with **0 critical** security, golden path green, and 1 referenceable customer story finalized.
- **SLOs (unchanged):** API availability ≥ 99.5%; read P95 ≤ 300 ms; policy P95 ≤ 10 ms.
- **Change Control:** Feature freeze Dec 29; hotfix only with approver from SRE + Product.

---

## 1) Objectives (Show on Dec 31)

1. **Partner Integration 1 complete** (Splunk app _or_ ServiceNow webhook) with README + sample video.
2. **Billing/Metering polish:** invoice CSV/PDF stable; budgets UI minimal; export automation.
3. **Case Study v1 signed** by customer (or anonymized approval) + reference quote captured.
4. **GA Candidate branch:** cut, tagged, SBOM published, upgrade/runbooks done, migration script tested.
5. **GTM pack locked:** exec deck v2.2, one‑pager v1.1, ROI readout template, Q1 ABM list & cadence.
6. **Security & hygiene:** CVE backlog zero for criticals; backups verified; retention jobs audit sample.

---

## 2) Scope & Priority

- **P0 (Must):** Partner Integration done; billing exports & invoice stable; GA branch + SBOM; case study approved; GTM pack; CVE sweep; backups/retention verified.
- **P1 (Should):** Admin budgets UI; success tracker polish; ROI charts; ABM list enrichment; demo environment hardening.
- **P2 (Could):** Report multi‑tenant branding; cost anomaly stub; read replica notes.

---

## 3) Swimlanes & Owners

- **Product/GTM (Felix):** Case study approval, ROI template, deck/one‑pager final, Q1 ABM (50–150 named), event calendar.
- **Frontend:** Budgets UI minimal; export polish; partner app UI
- **Backend:** Invoice generator stability, export automation, partner endpoints, migration scripts for GA tag.
- **Data/ETL:** Usage aggregation resilience; DLQ inspector polish; connector fixtures for demo.
- **SecEng:** CVE sweep, SBOM on tag, retention audit sample; access reviews.
- **SRE:** GA branch/tag pipeline; backups verify; restore drill lite; demo env hardening; export scheduler.

---

## 4) Backlog (Stories & Tasks)

### P0 — Partner Integration Completion

- **P0‑1** Finalize Splunk App _or_ ServiceNow Webhook (owner: FE/BE)
  - Settings UI; auth; deep‑link; audit capture; README & sample demo video.

### P0 — Billing/Metering Polish

- **P0‑2** Invoice Stability (owner: BE/SRE)
  - Deterministic totals; rounding & timezone; unit tests; PDF layout.
- **P0‑3** Export Automation (owner: SRE)
  - Nightly export cron; failure alert; sample S3 path or local drop.

### P0 — GA Candidate Branch & Hygiene

- **P0‑4** Cut GA Branch + Tag (owner: SRE)
  - `release/ga-candidate-2025.12`; tag `v1.5.0-rc1`; SBOM on tag; changelog.
- **P0‑5** Migration Script Test (owner: BE)
  - From v1.4.0 → rc1; seed data; back‑compat tests.
- **P0‑6** CVE/Criticals Zero (owner: SecEng)
  - Dependency updates; CodeQL/Trivy clean; doc notable changes.
- **P0‑7** Backup/Restore Verify (owner: SRE)
  - Snapshot + restore dry‑run; checksum; runbook note.
- **P0‑8** Retention Audit Sample (owner: BE/SecEng)
  - Run purge on sample; verify audit entries & legal hold respect.

### P0 — Case Study & GTM

- **P0‑9** Case Study Approval (owner: Product/GTM)
  - Legal wording; anonymization if needed; quote + logo or masked.
- **P0‑10** GTM Pack Lock (owner: Product/GTM)
  - Deck v2.2, one‑pager v1.1, ROI readout template; add QR codes/links.
- **P0‑11** Q1 ABM List (owner: Product/GTM)
  - 50–150 named; by segment; persona mapping; 3‑touch sequence dates.

### P1 — Nice‑to‑have

- **P1‑1** Budgets UI Minimal (owner: FE)
  - Set thresholds; show current usage; save to API.
- **P1‑2** Success Tracker Polish (owner: FE/Product)
  - Status rollups; CSV export.
- **P1‑3** Demo Env Hardening (owner: SRE)
  - Read‑only creds; reset script; seed refresh.

---

## 5) Acceptance Criteria & DoD

- **Partner:** App/Webhook works E2E in demo; README + 3‑min video recorded.
- **Billing:** 3 consecutive exports present; PDF invoices deterministic; budgets UI writes thresholds; audits captured.
- **GA:** Tag `v1.5.0-rc1` exists; SBOM uploaded; migration path verified; changelog committed.
- **Security:** Critical CVEs = 0; backup/restore evidence; retention audit sample shows purge + holds working.
- **GTM:** Case study approved; deck/one‑pager/ROI template in `/docs/gtm`; ABM list committed with cadence.

---

## 6) Cadence & Dates

- **Standup:** 09:30 MT daily (skip Dec 25)
- **Freeze:** Dec 29, 18:00 MT
- **Review & demo:** Dec 31, 11:00 MT (shortened holiday review)
- **Retro:** Dec 31, 12:00 MT

---

## 7) Deliverables (Repos & Docs)

- `integrations/{splunk-app/* | servicenow-webhook/*}`
- `server/src/billing/{invoice.ts}` + `ops/usage/export_cron.yaml`
- `docs/releases/GA_CANDIDATE_2025-12.md` + `CHANGELOG_sprint-2025-12-17.md`
- `docs/runbooks/{backup_restore.md}` (updated)
- `docs/evidence/v1.5/*` (sbom, checks)
- `docs/case_studies/{customer_v1_approved.md}`
- `docs/gtm/{executive_deck_v2.2/,onepager_v1.1.md,roi_readout_template.md}`
- `docs/abm/Q1_2026_named_accounts.csv` + `docs/abm/cadence.md`

---

## 8) Demo Script (Dec 31)

1. Show partner hand‑off (Splunk/ServiceNow) into IntelGraph; audit trail visible.
2. Download invoice PDF/CSV for Dec; adjust budget → observe notify or throttle.
3. Switch to `release/ga-candidate-2025.12`; run migration; smoke passes; SBOM on tag.
4. Trigger retention purge on test dataset; confirm legal hold skip; show audit entries.
5. Present approved case study; walk through deck/one‑pager; show Q1 ABM list and outreach schedule.

---

**Owner:** Felix (The B.I.Z.) — VP Sales/BD/Growth  
**Last Updated:** Oct 9, 2025 (v1.5.0 plan)
```
