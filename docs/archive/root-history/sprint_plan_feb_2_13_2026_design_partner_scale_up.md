by the runes of Scrum—forward we march! here’s the sprint **after** “Design Partner Onboarding.”

# Sprint: Feb 2–13, 2026 (America/Denver) — “Design Partner **Scale-Up**”

**Sprint Goal:** Confidently support 10+ external partners with predictable performance and safe governance. Focus: multi-tenant reliability, support tooling, usage insights, and a smoother “first success” path.

---

## Sprint Backlog (stories, AC, estimate)

1. **Partner Workspace Templates** — *5 pts*
   As an admin, I can instantiate a tenant with pre-wired roles, sample data packs, and starter dashboards.
   **AC:** One-click apply/rollback; idempotent; checks pass on fresh tenant.

2. **Onboarding Health Checks (preflight)** — *5 pts*
   As an operator, I run a preflight that validates storage, policy, RBAC/RLS, egress, and sample graph readiness.
   **AC:** All checks report PASS/FAIL with remediation; exported as JSON for support.

3. **Guided “First Success” Flow** — *8 pts*
   As a new analyst, I complete ingest→NL→compile→export with breadcrumbs, progress, and failure-retry helpers.
   **AC:** Median time-to-first-success ≤ 25 min on fresh tenant; retries never lose context.

4. **NL→Cypher Guardrails v1.1** — *5 pts*
   As an analyst, I get actionable hints on low-confidence queries; sandbox remains default with safe limits.
   **AC:** Confidence gating + hint library; compile rate ≥ 95% on seed set.

5. **Audit Log v1.1 (Retention + Search UX)** — *5 pts*
   As compliance, I set retention per tenant and filter by actor/object/time with saved queries.
   **AC:** Retention policy enforced; saved queries restorable per tenant.

6. **Usage & Quota Telemetry (Partner Insights)** — *5 pts*
   As PM/Ops, I see tenant-level usage: queries, rows/tokens, exports, failures, and onboarding completion funnel.
   **AC:** Daily rollups; dashboard tiles; CSV export.

7. **Performance & Scale: Hot Path Hardening** — *6 pts*
   As an operator, p95 for golden queries and ingest stays within SLO at 10-tenant concurrency.
   **AC:** Soak test scenario defined; cache/invalidation verified; alarms wired.

8. **Support Runbooks & In-Product Diagnostics** — *3 pts*
   As support, I can pull a redacted diagnostics bundle (config + recent logs) with a single action.
   **AC:** Bundle downloadable; secrets redacted; link expires.

**Stretch (time-boxed):**
9) **Invite/SSO (SCIM-lite)** — *3 pts*
Minimal SCIM-like import for users/roles; manual override path.

*Total forecast: 42 pts (stretch optional).* 

---

## Definition of Done (DoD)

* All acceptance criteria satisfied; feature flags controllable per tenant.
* Unit + contract tests; one recorded E2E from *net-new* tenant to export.
* Security: RBAC/RLS contract tests; tenancy isolation tests pass; no critical vulnerabilities.
* Observability: dashboards & alerts for onboarding health, query/ingest p95, export success.

## Definition of Ready (DoR)

* Story includes AC, dependencies, flags, rollback plan, sample data, and either a wireframe or API sketch.

---

## Capacity & Calendar

* **Capacity:** ~40–42 pts.
* **Ceremonies:**

  * Sprint Planning: Mon Feb 2, 09:30–11:00
  * Daily Stand-up: 09:15–09:30
  * Mid-sprint Refinement: Thu Feb 5, 14:00–14:45
  * Sprint Review (partner demo): Fri Feb 13, 10:00–11:00
  * Retro: Fri Feb 13, 11:15–12:00

---

## Environments, Flags, Data

* **Envs:** dev → stage (partner sandboxes) with canary and auto-rollback.
* **Flags:** `workspaceTemplates`, `preflightChecks`, `firstSuccessFlow`, `nlGuardrailsV11`, `auditLogV11`, `partnerInsights`, `scaleHardening`, `supportDiagnostics` (+ `inviteScimLite` stretch).
* **Test Data:** Golden CSV/JSON packs, seeded graph fixtures, policy suites, partner-mix load profiles.

---

## QA Plan

**Functional:**

* Workspace template apply/rollback; preflight export JSON; guided flow progress & retry; NL guardrails hints; audit retention + saved queries; insights dashboards & CSV; diagnostics bundle redaction.
  **E2E:** Fresh tenant → preflight → guided flow → successful export → audit + insights verified.
  **Non-functional:**
* Soak test: 10 tenants, concurrent golden paths; p95 adherence; error budget tracking; alert drills.

---

## Risks & Mitigations

* **Preflight false positives/negatives** → golden fixtures + CI run; allow local override with audit note.
* **Telemetry cardinality blow-up** → aggregate rollups + sampling; documented retention.
* **Onboarding flow edge cases** → state machine with explicit retry transitions; capture repro bundle.
* **Cache staleness under concurrency** → rigorous invalidation tests; TTL + etag; canary guard.

---

## Reporting Artifacts (to produce this sprint)

* Updated partner onboarding runbook, support playbooks, preflight checklist, demo script, burndown & throughput charts, SLO snapshots (start/end), usage funnel dashboard.

---

## Demo Script (review)

1. Create tenant with **Workspace Template** → roles, sample data, dashboards pre-wired.
2. Run **Preflight** → JSON report with PASS/FAIL + remediation.
3. Walk **First Success Flow** → ingest → NL→Cypher preview → compile → export.
4. Show **Guardrails** on an ambiguous prompt (hint + sandbox run).
5. Search **Audit Log**; set a retention policy; save a query.
6. Open **Partner Insights** dashboard; export CSV.
7. Download **Diagnostics Bundle** from a tenant; verify redactions.
8. *(Stretch)* Import users/roles via **Invite/SSO (SCIM-lite)**.

---

## Jira-ready ticket matrix (copy/paste)

| ID       | Title                                  | Owner  | Est | Dependencies | Acceptance Criteria (summary)                     |
| -------- | -------------------------------------- | ------ | --: | ------------ | ------------------------------------------------- |
| SCAL-101 | Workspace Templates (Apply/Rollback)   | BE+FE  |   5 | —            | One-click apply; idempotent; rollback cleans      |
| SCAL-111 | Onboarding Preflight Checks + JSON     | BE+Ops |   5 | —            | PASS/FAIL + remediation; exportable               |
| SCAL-121 | Guided First Success Flow              | FE+BE  |   8 | SCAL-101     | Breadcrumbs, progress, retry-safe; <25 min median |
| SCAL-131 | NL→Cypher Guardrails v1.1              | BE     |   5 | —            | Confidence gating; hint library; ≥95% compile     |
| SCAL-141 | Audit Log v1.1 (Retention + Search UX) | BE+FE  |   5 | —            | Retention per tenant; saved queries               |
| SCAL-151 | Partner Usage & Quotas Telemetry       | BE+Ops |   5 | —            | Daily rollups; dashboard; CSV export              |
| SCAL-161 | Hot Path Hardening & Soak Test         | BE+Ops |   6 | —            | 10-tenant scenario; p95 within SLO; alerts wired  |
| SCAL-171 | Support Diagnostics Bundle             | BE     |   3 | —            | Redacted bundle; expiring link                    |
| SCAL-181 | Invite/SSO (SCIM-lite) *(Stretch)*     | BE     |   3 | —            | Import users/roles; manual override path          |

---

### Outcome of this sprint

We exit with a **repeatable, supportable** partner program: quick tenant setup, reliable preflight checks, clear guidance to first value, robust audit/insight tooling, and confidence that performance holds as we scale beyond a handful of design partners.
