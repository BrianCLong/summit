# Sprint Plan — Feb 16–27, 2026 (America/Denver)

**Sprint Name:** "Feedback & Monetization"

**Sprint Goal:** Close the loop with partners and turn usage into value: (1) capture structured feedback in-product, (2) enable basic paid plans with quota enforcement, (3) strengthen SSO/invite, and (4) smooth support + reliability for 20-tenant concurrency.

---

## Sprint Backlog (stories, AC, estimate)

1. **In-Product Feedback Loop (MVP)** — *5 pts*  
   As a partner user, I can submit contextual feedback (screen, step, severity) with auto-attached diagnostics.  
   **AC:** Form available in key flows; auto-attaches anonymized env+trace IDs; triage view for PM/Support; PII scrubbed.

2. **Usage Plans & Quotas (Enforcement v1)** — *8 pts*  
   As an admin, I select Free/Pro/Enterprise; quotas enforce on queries/exports with humane overage messaging.  
   **AC:** Plan registry; soft-fail grace period; clear “blocked by plan” UI with upgrade path; audit logged.

3. **Billing (Shadow→Active) with Stripe/Stub** — *5 pts*  
   As Ops/Finance, I can toggle a tenant to Active billing (test or real) and see invoices for overages.  
   **AC:** Test mode + stub provider; daily rollups reconcile; invoice preview downloadable.

4. **Invite & SSO (SCIM-lite v1)** — *5 pts*  
   As a tenant admin, I can invite users via email or CSV; optional SSO group→role mapping.  
   **AC:** CSV import validates; conflict resolution UX; basic SSO mapping works; audit events emitted.

5. **Guided “First Success” Flow v1.1 (Nudges & Recovery)** — *5 pts*  
   As an analyst, I get contextual nudges and “resume where you left off” if I bounce mid-flow.  
   **AC:** Persistent progress; recovery banner; drop-off analytics dashboard.

6. **Audit Log v1.2 (Tenant Export & Retention Proof)** — *3 pts*  
   As compliance, I export a signed audit bundle for a date range and verify retention policy application.  
   **AC:** Bundle includes manifest + retention proof; verifier PASS.

7. **Partner Insights v1.1 (Funnels & Cohorts)** — *5 pts*  
   As PM/Ops, I view funnel from sign-up→first export and cohort retention by week.  
   **AC:** Funnel tiles; cohort chart; CSV export.

8. **Reliability: Soak & Error-Budget Guards** — *3 pts*  
   As an operator, I have automated soak at 20-tenant concurrency and budget alerts wired.  
   **AC:** Nightly soak job; alerts for budget burn; runbook updated.

**Stretch (time-boxed):**

9) **Redaction Preset Builder** — *3 pts*  
As an admin, I define custom redaction presets and share within tenant.  
**AC:** Create/edit/delete; versioned; applied at export.

*Total forecast: 39 pts (stretch optional).*  
**Capacity:** ~40 pts.

---

## Definition of Done (DoD)

- AC met; features behind flags as needed; stage demo updated; docs & runbooks merged.
- Tests: unit + contract + a recorded E2E from sign-up → first export with plan enforcement.
- Security & privacy: PII scrubbing validated in feedback/diagnostics; RBAC/RLS regression suite green.
- Observability: dashboards for funnel, drop-offs, quota blocks, and error-budget burn live.

## Definition of Ready (DoR)

- Each story has AC, dependencies, flags, rollback plan, and either a wireframe or API sketch; sample data & test accounts defined.

---

## Capacity & Calendar

- **Capacity:** ~40 pts.
- **Ceremonies:**
  - Sprint Planning: Mon Feb 16, 09:30–11:00
  - Daily Stand-up: 09:15–09:30
  - Mid-sprint Refinement: Thu Feb 19, 14:00–14:45
  - Sprint Review: Fri Feb 27, 10:00–11:00
  - Retro: Fri Feb 27, 11:15–12:00

---

## Environments, Flags, Data

- **Envs:** dev → stage (20-tenant sandboxes) with canary + auto-rollback.
- **Flags:** `feedbackMVP`, `plansQuotasV1`, `billingActiveV1`, `inviteSsoV1`, `firstSuccessV11`, `auditV12`, `insightsV11`, `reliabilitySoak20` (+ `redactionPresetBuilder` stretch).
- **Test Data:** Seed tenants (Free/Pro/Ent), synthetic usage profiles, invoice fixtures, CSV invite samples.

---

## QA Plan

**Functional:**

- Feedback form + diagnostics bundle; scrub check.
- Plan selection; quota enforcement + grace; upgrade path; audit entries.
- Billing toggle (test/real); invoice preview; rollup reconciliation.
- Invite via email/CSV; SSO group→role mapping; conflict resolution; audit.
- First-Success recovery & drop-off tracking.
- Audit export with retention proof; verifier PASS.
- Insights funnel/cohorts; CSV export.

**E2E:** New tenant on Free plan → guided flow → hit quota boundary → upgrade to Pro → complete export with PASS badge → export signed audit bundle.

**Non-functional:**

- Nightly 20-tenant soak; p95 latency within SLO; error-budget alerts; alert drill logged.

---

## Risks & Mitigations

- **Quota enforcement UX frustration** → grace period + clear copy + one-click upgrade.
- **Billing provider flakiness** → test mode + stub fallback; retry with idempotency keys.
- **Feedback privacy** → strict scrubbing map + automated redaction tests; opt-out toggle.
- **SSO mapping drift** → mapping previews + dry-run; audit every change.

---

## Reporting Artifacts (produce this sprint)

- Burndown & throughput, live funnel/cohort dashboards, quota/upgrade report, nightly soak report, release notes, demo script.

---

## Demo Script (review)

1. Create tenant on **Free** → run guided flow → trigger quota limit → humane block + upgrade path.
2. Toggle **Billing Active** (test) → preview invoice; show daily rollup reconciliation.
3. Use **In-Product Feedback** during a task → triage board shows context & scrubbed diagnostics.
4. **Invite/SSO**: CSV import + group→role mapping; audit trail visible.
5. **Audit v1.2**: export signed bundle for date range; verify retention proof.
6. **Insights v1.1**: show funnel & cohort dashboard; export CSV.
7. **Reliability**: show soak job status and error-budget alert test.

---

## Jira-ready ticket matrix (copy/paste)

| ID      | Title                                     | Owner  | Est | Dependencies | Acceptance Criteria (summary)                        |
| ------- | ----------------------------------------- | ------ | --: | ------------ | ---------------------------------------------------- |
| FAM-101 | In-Product Feedback (Context + Scrub)     | FE+BE  |   5 | —            | Context captured; diagnostics attached; PII scrubbed |
| MON-111 | Plans & Quotas Enforcement v1             | BE+FE  |   8 | —            | Free/Pro/Ent; grace; upgrade path; audit             |
| MON-112 | Billing Active (Test/Real) + Invoices     | BE+Ops |   5 | MON-111      | Toggle; rollup reconcile; invoice preview            |
| ACC-121 | Invite & SSO (SCIM-lite v1)               | BE+FE  |   5 | —            | Email/CSV invites; group→role map; audit             |
| EXP-131 | First-Success Flow v1.1 (Recovery)        | FE+BE  |   5 | —            | Persistent progress; recovery banner; metrics        |
| GOV-141 | Audit Log v1.2 (Export + Retention Proof) | BE     |   3 | —            | Signed bundle; verifier PASS                         |
| INS-151 | Partner Insights v1.1 (Funnels & Cohorts) | BE+PM  |   5 | —            | Funnel tiles; cohort chart; CSV export               |
| REL-161 | Soak @ 20 Tenants + Error-Budget Guards   | Ops    |   3 | —            | Nightly soak; alerts; runbook updated                |
| RED-171 | Redaction Preset Builder *(Stretch)*      | FE     |   3 | —            | Create/edit/delete; versioned; applies at export     |

---

## Outcome of this sprint

A feedback-driven, monetizable product: partners can communicate needs in context, quotas and plans work with humane UX, billing can be activated, onboarding flow is resilient, and the system holds SLOs at higher concurrency—setting us up for broader early-access and revenue experiments next sprint.
