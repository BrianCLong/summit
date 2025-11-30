# Sprint Plan — Mar 30–Apr 10, 2026 (America/Denver)

> **Context:** Sprint after **EA Cohort Expansion**. Objective: deliver **Public Beta Prep** by hardening stability at 50+ tenants, elevating docs/help, enforcing cost/residency/security controls, and polishing upgrade/support flows for a broader invite.

---

## 1) Sprint Goal (SMART)

Achieve **public-beta readiness** by Apr 10, 2026: run green **50-tenant soak** (ingest → query → compile → export) within SLOs and <10% error-budget burn; ship **contextual help + docs beta** with telemetry; enable **per-tenant cost budgets** with alerts/soft caps; surface **residency/legal nameplates** in UI/API/export; enforce **token scopes v1.1 + anomaly alerts**; deliver **upgrade/plan UX v1** and **one-click redacted diagnostics** — all behind flags with demo script recorded.

**Key outcomes**

- 50-tenant soak scenario runnable with report artifact; p95 latency within targets; error-budget burn <10%.
- Contextual help accessible inline and via command palette; usage telemetry live; links to versioned docs.
- Docs beta live with search, permalinks, stable URLs, and release notes mapped to feature flags.
- Cost budgets enforce thresholds with email/webhook alerts, soft-stop + override and audit trail.
- Residency v1.1 labels visible in UI/API/export; exports include residency + policy ID and fail closed on mismatch.
- Plan/upgrade UX v1 delivers compare table, upgrade modal, audit event, and return-to-task flow.
- One-click redacted diagnostics bundle (JSON + recent logs) with secrets removed and time-limited link.
- Token scopes v1.1 exposes finer scopes, last-used/IP, and anomaly alert rules with runbook.

---

## 2) Success Metrics & Verification

- **Soak reliability:** p95 latency within SLO; **error-budget burn <10%** during 50-tenant drill.  _Verify:_ automated soak report artifact; SLO dashboard.
- **Help/docs adoption:** contextual help open rate and article CTR captured; docs search/permalink usage tracked.  _Verify:_ telemetry dashboards; command palette analytics.
- **Cost governance:** budget alerts fire for threshold breaches; **soft-stop enforced** with override + audit.  _Verify:_ alert logs; audit records; override telemetry.
- **Residency compliance:** **100% exports** include residency + policy ID; mismatches block export.  _Verify:_ export validator results; API/UI label checks.
- **Security:** token scopes v1.1 scoped correctly; anomaly alerts triggered on unusual token use with runbook followed.  _Verify:_ scope matrix tests; alert drill notes.
- **Supportability:** diagnostics bundle generated with redaction; link expiry honored.  _Verify:_ download audit; link expiry test.
- **Upgrade UX:** upgrade modal produces audit event and returns user to prior task.  _Verify:_ audit log; UX walkthrough.

---

## 3) Scope

**Must-have (commit):**

- **Scale & Resilience Drill @ 50 Tenants (6 pts):** scripted ingest → query → compile → export scenario, fixtures, p95 in target, error-budget burn <10%, automated report.
- **Contextual Help v1 (5 pts):** inline “?” and ⌘/Ctrl-K command palette; searchable; article usage telemetry.
- **Docs Site Beta + Versioned Release Notes (5 pts):** structured docs (setup, governance, golden path) with search, permalinks, stable URLs; release notes mapped to feature flags.
- **Cost Controls & Budgets (5 pts):** per-tenant budgets on rows/tokens/exports; threshold alerts via email/webhook; soft-stop with override + audit.
- **Residency v1.1 (3 pts):** region/legal entity nameplates in UI/API/export; exports carry residency + policy ID; fail closed on mismatch.
- **Authority Compiler v1.3 (5 pts):** cross-references/link picker; evidence links; validator runs on export; broken links block publish with fix guidance.
- **Plan/Upgrade UX v1 (3 pts):** compare table; upgrade modal; audit event; return-to-task flow.
- **One-Click Redacted Diagnostics (3 pts):** UI trigger for redacted JSON + recent logs; secrets removed; time-limited link.
- **Security: API Token Scopes v1.1 + Anomaly Alerts (5 pts):** finer-grained scopes; last-used/IP surfaced; alert rules + runbook.

**Stretch (time-boxed):**

- **Localization Hooks (US/EU date/number) (2 pts):** locale-aware formatting in UI shell and exports.

**Out-of-scope:** additional GA feature expansions beyond listed flags; new tenancy models.

---

## 4) Team & Capacity

- **Capacity:** ~40–42 pts (stretch optional). Hold buffer for support/soak findings.
- **Roster/planes:** dev → stage (50-tenant cohort) with canary + auto-rollback across US/EU planes.

---

## 5) Backlog (Ready for Sprint)

| ID      | Title                                 | Owner  | Est | Dependencies | Acceptance Criteria (summary)                |
| ------- | ------------------------------------- | ------ | --: | ------------ | -------------------------------------------- |
| PBP-101 | Soak & Resilience @ 50 Tenants        | Ops    |   6 | —            | Scripted scenario; p95/SLOs; report artifact |
| PBP-111 | Contextual Help v1 (Inline + Palette) | FE     |   5 | —            | “?” + palette; searchable; telemetry         |
| PBP-112 | Docs Site (Beta) + Versioned Notes    | PM+FE  |   5 | —            | Search; permalinks; notes map to flags       |
| PBP-121 | Cost Budgets & Alerts (Admin)         | BE+FE  |   5 | —            | Thresholds; alerts; soft-stop + override     |
| PBP-131 | Residency v1.1 (Labels & Exports)     | BE     |   3 | —            | UI/API/export labels; fail-closed            |
| PBP-141 | Authority Compiler v1.3 (Cross-Refs)  | FE+BE  |   5 | —            | Link picker; validator; block on break       |
| PBP-151 | Plan/Upgrade UX v1                    | FE     |   3 | —            | Compare table; upgrade modal; audit          |
| PBP-161 | One-Click Redacted Diagnostics        | BE+FE  |   3 | —            | Redacted JSON/logs; expiring link            |
| PBP-171 | Token Scopes v1.1 + Anomaly Alerts    | BE+Ops |   5 | —            | Finer scopes; last-used/IP; alerts + runbook |
| PBP-181 | Localization Hooks (Stretch)          | FE     |   2 | —            | Locale formatting in shell & exports         |

> Planned: 40–42 pts including stretch hook.

---

## 6) Dependencies & Assumptions

- Flags: `soak50`, `contextHelpV1`, `docsBeta`, `costBudgets`, `residencyV11`, `authorityRefsV13`, `planUxV1`, `supportDiagOneClick`, `tokenScopesV11`, `i18nHooks` (stretch).
- Test data: load profiles for 50 tenants; budget thresholds; docs stubs; localized formatting fixtures.
- Canary + auto-rollback active; budget alerts wired to email/webhook endpoints; telemetry sinks available for help/docs usage.

---

## 7) Timeline & Ceremonies (MT)

- **Mon Mar 30 — 09:30–11:00:** Sprint Planning.
- **Daily — 09:15–09:30:** Stand-up.
- **Thu Apr 2 — 14:00–14:45:** Mid-sprint Refinement.
- **Fri Apr 10 — 10:00–11:00:** Sprint Review (Public Beta go/no-go).
- **Fri Apr 10 — 11:15–12:00:** Retro.

---

## 8) Definition of Ready (DoR)

- Each story has AC, dependencies, flags, rollback, seeded data/fixtures, and wire/API sketch where UI exists.

## 9) Definition of Done (DoD)

- All AC met; features behind flags where noted; demo script recorded.
- Tests: unit + contract + one recorded E2E (fresh tenant) and one **soak report** artifact.
- Security: token-scope tests, anomaly alert drill; no criticals.
- Observability: dashboards for tenant count, p95s, export success, help-article usage, budget alerts.

---

## 10) QA & Validation Plan

- **Functional:** 50-tenant soak report; contextual help opens and tracks usage; docs search/permalinks; budget alerts + soft-stop with override; residency labels in UI/API/export; cross-ref validation blocks broken links; plan compare & upgrade modal; diagnostics bundle redacted with expiring link; token scopes + anomaly alerts.
- **End-to-end:** New tenant → golden path → hit budget alert → upgrade plan → resume task → export PASS with residency policy → generate diagnostics bundle.
- **Non-functional:** 50-tenant soak p95s within SLO; error-budget burn; help article CTR; cost-alert latency.

---

## 11) Risks & Mitigations

| Risk                                       | Prob. | Impact | Mitigation                                                  |
| ------------------------------------------ | ----- | -----: | ----------------------------------------------------------- |
| Docs/help drift from product               | Med   |   High | Versioned docs; link to specific release; review checklist in CI |
| Budget soft-stops frustrate users          | Med   |   Med  | Clear copy; override with audit; preview impact in UI       |
| Anomaly alert noise                        | Med   |   Med  | Threshold tuning; suppression windows; weekly review        |
| Cross-ref validator false positives        | Low   |   Med  | Allow skip with justification + audit in early beta         |

---

## 12) Reporting Artifacts & Demo Script

- **Artifacts:** Soak-50 report, public-beta checklist, budget/alerts dashboard, token-anomaly alert drill notes, release notes & changelog, burndown/throughput, SLO snapshots.
- **Demo script:**
  1. Trigger Soak-50 job → open report with p95 & error-budget view.
  2. Show Contextual Help in Wizard and Compiler → search an article from command palette.
  3. Open Docs (Beta) → navigate to golden-path guide → follow permalinks from changelog.
  4. Set Budget → run workload → hit soft cap → alert fires → override with audit.
  5. Verify Residency labeling + export policy ID in the report.
  6. Use Authority Cross-Refs → intentionally break one → export blocks with fix guidance.
  7. Hit a Plan Block → open compare → upgrade → resume task seamlessly.
  8. Generate Redacted Diagnostics → download link expires.
  9. Create new Token Scope → simulate anomaly → alert & runbook steps.

