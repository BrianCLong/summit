# Sprint Plan — Mar 30–Apr 10, 2026 (America/Denver)

> **Context:** Sprint 8 — **Growth & Expansion: Self-Serve, Distribution, and Enterprise Add-Ons.** Objective: **“Scale acquisition without scaling headcount”** by enabling self-serve tenant creation, rapid activation, partner-ready distribution bundles, and two enforceable enterprise add-ons with invoice-ready reporting.

---

## 1) Sprint Goal (SMART)

Enable a new customer to **sign up → create first tenant → ingest first receipt in <15 minutes** (hosted), drive **≥70% activation checklist completion within 24 hours**, ship the **partner distribution pack with validation**, and launch **two enterprise add-ons** with entitlements, quotas, and invoice-ready reporting by Apr 10, 2026.

**Target outcomes**

- Self-serve onboarding from signup to first receipt in **<15 minutes** with audit receipts.
- ≥ **70%** of new tenants complete the activation checklist within 24 hours.
- Partner distribution pack installs repeatably with versioned configs + validation evidence.
- Two enterprise add-ons shipped with enforcement, metering, and invoice-ready line items.
- Switchboard exposes cohort/usage health signals for retention nudges.

---

## 2) Success Metrics & Verification

- **Onboarding time:** Median time from signup to first receipt **<15 minutes**.  
  _Verify:_ timed flow + receipt artifact per tenant.
- **Activation:** ≥ **70%** of new tenants finish the activation checklist in 24 hours.  
  _Verify:_ activation event funnel; checklist completion export.
- **Distribution reliability:** 100% partner bundle installs complete after validation suite.  
  _Verify:_ validation run log + signed evidence bundle.
- **Enterprise add-ons:** Add-on enforcement blocks/permits correctly; usage metered; invoice lines generated.  
  _Verify:_ entitlement checks, quota tests, invoice report.
- **Health signals:** Cohort health score visible with at least three actionable nudges.  
  _Verify:_ Switchboard dashboard; nudge delivery logs.

---

## 3) Scope

**Must-have (commit):**

- **Self-Serve Signup & Tenant Creation (6 pts):** Hosted portal flow for org/tenant, region/retention selection, policy profile pick, email/domain verification, receipts, policy-gated steps.
- **Integration Quick Connect (4 pts):** OIDC wizard (common IdPs) with optional SCIM; automated health checks with prescriptive fixes.
- **Activation Checklist & Tracking (5 pts):** Checklist items for identity connect, first privileged approval, first evidence export, first usage/cost report; completion telemetry per tenant.
- **Growth Instrumentation (4 pts):** Tenant milestone events, activation/retention metrics, transparent health score.
- **Lifecycle Nudges (3 pts):** Admin-only prompts (“finish setup,” “set quotas,” “export evidence,” “invite auditor”) with per-tenant opt-out.
- **Partner Distribution Pack v1 (5 pts):** Versioned config bundles with install profiles, region defaults, policy presets, observability defaults, and one-command validation suite + signed evidence.
- **Upgrade Assistant (3 pts):** Preflight checks + migration notes surfaced in Switchboard; generate “Upgrade Evidence Bundle.”
- **Enterprise Add-Ons (choose two) (6 pts):**
  - **Dedicated compute pool per tenant** (no noisy neighbors).
  - **Audit archive (WORM-like) to customer bucket** with retention enforcement.
- **Entitlements + Invoice-Ready Reporting (4 pts):** Feature flags/quotas/policy obligations, usage metering, and invoice line items for the selected add-ons.

**Stretch (time-boxed):**

- **Advanced data residency enforcement** (region-locked services + cross-region deny) behind flag with partial metering (2 pts).

**Explicit non-goals:** Marketplace listings; complex marketing automation; new tenancy models beyond hosted flow.

---

## 4) Team & Capacity

- **Capacity:** ~40–42 pts (stretch optional); reserve buffer for partner validation and add-on enforcement fixes.
- **Planes:** dev → stage → partner-candidate bundles; canary + auto-rollback; demo tenants seeded for activation flow.

---

## 5) Backlog (Ready for Sprint)

| ID       | Title                                         | Owner  | Est | Dependencies | Acceptance Criteria (summary)                                         |
| -------- | --------------------------------------------- | ------ | --: | ------------ | --------------------------------------------------------------------- |
| GROW-201 | Self-Serve Signup + Tenant Creation           | FE+BE  |   6 | —            | Hosted flow; region/retention; policy profile; verification; receipts |
| GROW-211 | OIDC Quick Connect + SCIM (opt)               | FE+BE  |   4 | GROW-201     | IdP wizard; health checks; prescriptive fixes                         |
| GROW-221 | Activation Checklist & Tracking               | FE     |   5 | GROW-201     | Checklist items; telemetry; completion export                         |
| GROW-231 | Growth Instrumentation & Health Score         | BE     |   4 | GROW-221     | Milestone events; transparent formula; dashboard hook                 |
| GROW-241 | Lifecycle Nudges (Admin-only)                 | FE+BE  |   3 | GROW-221     | Prompts; targeting; opt-out per tenant                                |
| DIST-251 | Partner Distribution Pack v1 + Validation     | BE+Ops |   5 | —            | Versioned bundles; validation suite; signed evidence                  |
| DIST-261 | Upgrade Assistant + Evidence Bundle           | FE+BE  |   3 | DIST-251     | Preflight checks; migration notes; evidence bundle                    |
| ENT-271  | Dedicated Compute Pool Add-On                 | BE+Ops |   3 | —            | Entitlement + enforcement; metering; invoice line                     |
| ENT-272  | Audit Archive Add-On (WORM)                   | BE     |   3 | —            | Retention enforcement; export to customer bucket; invoice line        |
| ENT-281  | Entitlements + Invoice Reporting Framework    | BE     |   4 | ENT-271/272  | Flags/quotas; metering; invoice-ready export                          |
| RES-291  | Advanced Data Residency Enforcement (Stretch) | BE     |   2 | —            | Region-locked services; deny cross-region; partial metering           |

> Planned: ~40–42 pts; stretch only if core onboarding/add-ons are stable.

---

## 6) Dependencies & Assumptions

- Flags: `selfServeOnboarding`, `oidcQuickConnect`, `activationChecklist`, `growthInstrumentation`, `adminNudges`, `distributionPackV1`, `upgradeAssistant`, `addonDedicatedCompute`, `addonAuditArchive`, `entitlementsBilling`, `advancedResidency` (stretch).
- Seed data: demo tenants with identity connectors, sample receipts, evidence bundle templates, partner bundle profiles (S/M/L).
- Infra: Switchboard panels for health score + nudges; signed evidence pipeline available for bundles.

---

## 7) Timeline & Ceremonies (MT)

- **Mon Mar 30 — 09:30–11:00:** Sprint Planning.
- **Daily — 09:15–09:30:** Stand-up.
- **Thu Apr 2 — 14:00–14:45:** Mid-sprint Refinement.
- **Fri Apr 10 — 10:00–11:00:** Sprint Review (Growth & Add-Ons demo).
- **Fri Apr 10 — 11:15–12:00:** Retro.

---

## 8) Definition of Ready (DoR)

- Story has AC, dependencies, flags, rollback/kill-switch, seeded data/fixtures, policy/entitlement mapping, and UI/API wireframe where applicable.

## 9) Definition of Done (DoD)

- All AC met; features behind flags/entitlements; demo script recorded.
- Tests: unit + contract + one fresh-tenant E2E for onboarding; validation suite green for partner bundle.
- Security/Compliance: domain verification enforced; add-on entitlements enforced with audit; retention/WORM tests for archive.
- Observability: dashboards for onboarding time, activation completion, bundle validation, add-on usage/metering, and nudge delivery.

---

## 10) QA & Validation Plan

- **Functional:** Self-serve signup/tenant creation with receipts; OIDC wizard + health checks; activation checklist completion; milestone events + health score; admin nudges with opt-out; distribution pack validation + signed evidence; upgrade assistant evidence bundle; dedicated compute enforcement; audit archive WORM retention; invoice export with add-on lines.
- **End-to-end:** Signup → tenant creation → OIDC quick connect → activation checklist → first privileged approval → export evidence bundle → enable dedicated compute + audit archive → validate invoice lines → partner installs via distribution pack.
- **Non-functional:** Onboarding time SLA; validation suite duration; quota/enforcement latency; archive retention checks; health score freshness.

---

## 11) Risks & Mitigations

| Risk                                                 | Prob. | Impact | Mitigation                                                           |
| ---------------------------------------------------- | ----- | -----: | -------------------------------------------------------------------- |
| Onboarding exceeds 15 minutes due to IdP/SCIM delays | Med   |   High | Cache IdP presets; parallelize health checks; fallback manual link   |
| Activation checklist ignored by admins               | Med   |    Med | Inline prompts; email follow-up; highlight progress in header        |
| Partner bundle validation flakes across regions      | Med   |    Med | Deterministic fixtures; replayable validation suite; signed evidence |
| Add-on enforcement gaps (compute/archival)           | Low   |   High | Entitlement gate in control plane + audit logs + denial tests        |
| Invoice export mismatch with metering                | Low   |    Med | Reconcile metering snapshots; nightly sanity check                   |

---

## 12) Reporting Artifacts & Demo Script

- **Artifacts:** Onboarding time report, activation funnel, health score dashboard, nudge delivery log, distribution pack validation evidence, upgrade evidence bundle, add-on enforcement tests, invoice-ready report with add-on lines.
- **Demo script:**
  1. Self-serve signup → create tenant → select region/retention/policy → show receipt.
  2. Run OIDC quick connect; health checks surface fixes; confirm green.
  3. Complete activation checklist (approval, evidence export, usage/cost view).
  4. Show cohort health score + nudges; opt-out toggle per tenant.
  5. Enable **Dedicated Compute** and **Audit Archive**; show enforcement + metering.
  6. Export invoice-ready report with add-on line items.
  7. Partner runs distribution pack install with validation and signed evidence.
  8. Use Upgrade Assistant to surface migration notes and produce Upgrade Evidence Bundle.
