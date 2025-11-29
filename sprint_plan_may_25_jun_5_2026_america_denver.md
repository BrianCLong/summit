# Sprint Plan — May 25–Jun 5, 2026 (America/Denver)

> **Sprint Name:** "GA Launch" — Ship General Availability with enterprise-grade reliability, clear packaging, and a tight first-week ops posture.

---

## 1) Sprint Goal (SMART)

Deliver a controlled **GA Launch** across **250+ tenants** with staged rollout controls, finalized packaging/pricing, production-ready runbooks, trust signals, and hardened onboarding/billing so that new and existing customers experience reliable service and clear value by **Jun 5, 2026**.

**Key outcomes**

- Launch orchestration with per-component kill-switches and one-click pause for signups/upgrades; rollback tested.
- Finalized plan matrices (Free/Pro/Ent) with entitlements/contracts, aligned copy, and audited plan changes.
- Production runbooks, escalation trees, and handoff ritual (daily AM/PM) live and drilled.
- Public Security & Trust page with attestations/links, request form, and timestamp.
- SLOs tuned and validated at 250+ tenants with soak test report and rollback simulation.
- Data Residency v1.2 with cross-region controls, export watermarks, and violation alerts.
- Onboarding v1.2 (schema auto-detect, faster fixtures, resume banners) improves median TTFV by ≥15%.
- DLP presets with approver roster/backup and audited fallback path.
- Billing guardrails (proration, overage notifications, invoice previews) validated with tests and finance sign-off.

---

## 2) Success Metrics & Verification

- **Launch safety:** Kill-switches halt new signups/upgrades within **≤1 minute**; rollback returns steady state in **≤10 minutes**.
  _Verify:_ Dry-run checklist; live pause simulation; rollback drill log.
- **Packaging accuracy:** Entitlement contract tests **100% green**; plan change audits present for 100% of modifications.
  _Verify:_ Automated tests; audit trail sampling; PM/Legal copy review.
- **Operational readiness:** On-call pages routed correctly; L1/L2 runbooks referenced in incidents; AM/PM handoffs logged daily.
  _Verify:_ Pager drill; handoff ritual checklist; escalation tree walkthrough.
- **Trust & security:** Security & Compliance page live with SOC-2-lite, backups, DLP, residency, data deletion/export notes; **Last updated** timestamp present; request form routes to owners.
  _Verify:_ Live page QA; form submission to inbox/queue; link checker.
- **Reliability at scale:** Soak test over **250 tenants** with ingest→query→compile→export flow meets p95 targets; alert thresholds tuned; rollback simulation captured.
  _Verify:_ Soak report artifact; alert noise analysis; rollback drill doc.
- **Residency compliance:** Cross-region violations trigger alerts with owner; exports show residency watermark and policy ID.
  _Verify:_ Contract tests for EU↔US cases; alert routing to owner.
- **Onboarding speed:** Median TTFV improves **≥15%** vs prior sprint; analytics tiles show deltas.
  _Verify:_ Analytics dashboard tiles; A/B or before/after report.
- **DLP governance:** Preset rule packs toggle per plan; approver roster availability visible; fallback audited.
  _Verify:_ UI/API toggles; audit entries; roster rotation log.
- **Billing correctness:** Proration on mid-cycle plan flips, overage notifications, invoice previews behave as specified; webhook retries succeed.
  _Verify:_ Automated test suite; finance sign-off report; webhook retry logs.

---

## 3) Scope

**Must-have (commit):**

1. **Launch Orchestration & Kill-Switches** — orchestrated flag rollout with per-component kill-switches, automatic rollback, and one-click pause for signups/upgrades (no tenant impact).
2. **Packaging & Pricing Finalization** — plan matrices (Free/Pro/Ent), entitlements/contracts, in-product copy and compare table alignment, audit on plan changes.
3. **Production Runbooks & On-Call Battle Rhythm** — publish L1/L2 runbooks, escalation trees, AM/PM handoff ritual; drill completed; correct paging.
4. **Security & Trust Page + Attestations** — public page with SOC-2-lite/backups/DLP/residency/data deletion/export, evidence links, timestamp, and request form routing.
5. **SLOs @ 250 Tenants (Launch Soak)** — scripted ingest→query→compile→export across 250 tenants; tuned alerts; soak report; rollback simulation.
6. **Data Residency v1.2 (Cross-Region Controls)** — hardened cross-region blocking/logging; export watermarks with residency + policy ID; EU↔US contract tests; alerts with owner.
7. **Onboarding Flow v1.2 (TTFV Polish)** — schema auto-detect, faster fixture load, resume banners; ≥15% median TTFV improvement; analytics tiles.
8. **DLP Presets & Approver Roster (Enterprise)** — pre-baked rule packs, tenant approver roster with rotation/backup, visibility into availability, audited fallback path.
9. **Billing Guardrails (Final)** — proration on mid-cycle plan flips, overage notifications, invoice previews; webhook retries; finance sign-off.

**Stretch (time-boxed):**

10. **Outage Game Day (Prod Shadow)** — inject failure in shadow; verify dashboards/alerts/comms; runbook timestamps captured; comms latency < SLA.

**Out-of-scope:**

- New feature areas unrelated to GA launch (e.g., net-new product lines).
- Major UI redesign outside onboarding/billing/trust pages.
- Non-launch experimental LLM features.

---

## 4) Team & Capacity

- **Capacity:** ~40–42 pts (stretch optional).
- **Ceremonies:**
  - Sprint Planning: Mon May 25, 09:30–11:00
  - Daily Stand-up: 09:15–09:30
  - Mid-sprint Readiness Review: Thu May 28, 14:00–14:45
  - **Launch Window:** Tue–Thu, Jun 2–4 (canary → ramp)
  - Sprint Review (GA debrief): Fri Jun 5, 10:00–11:00
  - Retro: Fri Jun 5, 11:15–12:00

---

## 5) Backlog (Ready for Sprint)

### GA-LCH-101 — Orchestrated GA Rollout + Kill-Switches — **5 pts**
- AC: Dry-run passes; one-click pause halts signups/upgrades without affecting current tenants; rollback path validated.

### GA-PKG-111 — Packaging/Pricing Finalization — **5 pts**
- AC: Contracts/tests for entitlements; plan changes audited; in-product copy and compare table aligned.

### GA-OPS-121 — Prod Runbooks & On-Call Rhythm — **5 pts**
- AC: Drill completed; pages routed correctly; postmortem template ready; handoff ritual live.

### GA-SEC-131 — Security & Trust Page + Attestations — **5 pts**
- AC: Public security page with evidence links; request form wired; last updated timestamp present.

### GA-SLO-141 — Soak @ 250 Tenants + Tuning — **6 pts**
- AC: Soak report artifact; p95s within targets; alert thresholds tuned; rollback simulation completed.

### GA-RES-151 — Residency v1.2 (Watermarks + Alerts) — **3 pts**
- AC: Export labels include residency watermark + policy ID; EU↔US edge-case tests; violations alert with owner.

### GA-ONB-161 — Onboarding v1.2 (TTFV) — **5 pts**
- AC: Schema auto-detect; faster fixtures; resume banners; ≥15% median TTFV improvement; analytics deltas visible.

### GA-DLP-171 — DLP Presets & Approver Roster — **5 pts**
- AC: Rule packs toggle per plan; approver availability shown; fallback path audited.

### GA-BILL-181 — Billing Guardrails (Final) — **3 pts**
- AC: Proration on mid-cycle plan flips; overage notifications; invoice previews; webhook retries; finance sign-off.

### GA-OPS-191 — Outage Game Day (Stretch) — **3 pts**
- AC: Shadow failure injected; dashboards/alerts/comms verified; runbook timestamps captured; comms latency < SLA.

> **Planned:** 42 pts total (stretch optional).

---

## 6) Dependencies & Assumptions

- Flags available: `gaRollout`, `planMatrixFinal`, `runbooksOps`, `securityTrustPage`, `soak250`, `residencyV12`, `onboardingV12`, `dlpPresetsRoster`, `billingFinal`, `gameDayShadow` (stretch).
- Environments: prod-like stage → prod (gated), canary lanes, EU/US planes.
- Test data ready: Golden tenants (Free/Pro/Ent), large fixtures, DLP preset packs, webhook/checkout fixtures, residency edge datasets.
- Observability dashboards and alerting hooks accessible for drills.

---

## 7) Risks & Mitigations

- **Launch day regressions** → staged ramp + kill-switches; practiced rollback.
- **Alert fatigue** → tuned thresholds; suppression windows; pager hygiene checklist.
- **Residency misroutes** → fail-closed policy; explicit contract tests; owner alerts.
- **DLP over-blocking** → preview/diff + justification; audited bypass with approver roster.
- **Proration confusion** → clear invoice preview & email templates; support macro responses.

---

## 8) QA Plan

**Functional:**
- Kill-switches stop signups/upgrades; rollback restores steady state.
- Entitlements/limits consistent across UI/API/export; audit on change.
- Trust page links & timestamp; request form routes; no broken links.
- Residency watermark in exports; violation alerting with owner.
- Onboarding schema auto-detect; resume banners; faster fixtures.
- DLP presets selectable; approver roster and fallback audited.
- Billing proration/overage flows; invoice preview accuracy; webhook retries.

**E2E:** Signup → tenant create → ingest → NL→Cypher preview → export PASS (with residency watermark) → plan upgrade → webhook success → DLP-flagged export requires approval → approval → PASS.

**Non-functional:**
- Soak @ 250 tenants meets SLO; alert noise below target; incident drill and comms latency measured.

---

## 9) Demo Script (Review)

1. Toggle **GA Rollout** to canary → show kill-switch/pause.
2. Walk **Onboarding v1.2** → faster ingest via auto-detect → NL→Cypher preview → export **PASS** with residency watermark.
3. Flip **Plan Upgrade** → verify entitlements & limits.
4. Trigger **DLP Preset** high-risk export → approver roster flow → approve → export.
5. Open **Security & Trust** page → evidence links + timestamp.
6. Show **Soak-250** report + alert drill clips.
7. Validate **Billing** proration/overage preview; finance sign-off note.

---

## 10) Reporting Artifacts (to produce this sprint)

- GA checklist, launch ramp log, soak-250 report, incident/postmortem template, trust page content & links, TTFV delta dashboard, billing validation report, burndown/throughput, SLO snapshots.

---

## 11) Definition of Ready (DoR)

- Each story has AC, dependencies, flags, rollback plan, owner, and copy/wires where applicable.

---

## 12) Definition of Done (DoD)

- All AC met; GA checklist signed by Eng/PM/Ops/Security.
- Recorded E2E: signup → tenant create → ingest → NL→Cypher preview → export (DLP pass) → plan upgrade → webhook receipt.
- Security & compliance: public trust page live; data export/deletion verified; audit trails intact.
- Observability: GA dashboards (signups, p95s, error budget, incidents, upgrades) live and linked in runbooks.

---

## 13) Jira-Ready Ticket Matrix (copy/paste)

| ID          | Title                                   | Owner  | Est | Dependencies | Acceptance Criteria (summary)               |
| ----------- | --------------------------------------- | ------ | --: | ------------ | ------------------------------------------- |
| GA-LCH-101  | Orchestrated GA Rollout + Kill-Switches | Ops+BE |   5 | —            | Dry-run; pause signups/upgrades; rollback   |
| GA-PKG-111  | Packaging/Pricing Finalization          | PM+FE  |   5 | —            | Entitlement contracts; copy aligned; audits |
| GA-OPS-121  | Prod Runbooks & On-Call Rhythm          | Ops    |   5 | —            | Drill passes; handoff ritual live           |
| GA-SEC-131  | Security & Trust Page + Attestations    | PM+FE  |   5 | —            | Links to evidence; timestamp; request form  |
| GA-SLO-141  | Soak @ 250 Tenants + Tuning             | Ops    |   6 | —            | Report; p95s in SLO; rollback sim           |
| GA-RES-151  | Residency v1.2 (Watermarks + Alerts)    | BE     |   3 | —            | Labels in export; cross-region alerts       |
| GA-ONB-161  | Onboarding v1.2 (TTFV)                  | FE+BE  |   5 | —            | Auto-detect schema; resume; +15% TTFV       |
| GA-DLP-171  | DLP Presets & Approver Roster           | FE+BE  |   5 | —            | Rule packs; approvals; fallback             |
| GA-BILL-181 | Billing Guardrails (Final)              | BE+Ops |   3 | —            | Proration; overage alerts; previews         |
| GA-OPS-191  | Outage Game Day *(Stretch)*             | Ops    |   3 | GA-OPS-121   | Shadow failure; comms < SLA                 |

---

## 14) Outcome of this Sprint

A confident **GA Launch**: controlled rollout, crisp packaging, public trust signals, resilient ops posture, faster onboarding, enforceable data controls, and hardened billing—ready for broad adoption with safety nets firmly in place.
