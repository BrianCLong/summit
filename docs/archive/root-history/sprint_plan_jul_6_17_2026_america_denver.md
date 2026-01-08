# Sprint Plan — Jul 6–17, 2026 (America/Denver)

> **Context:** Sprint 15 — _“Autonomy at Scale: More Workflows, Safer Simulation, and Switchboard Copilot.”_ Push automation coverage, reduce approval fatigue through policy-aware simulation + bounded auto-approvals, and ship a constrained evidence-first Copilot in Switchboard.

---

## 1) Sprint Goal (SMART)

Expand automation to **8–10** operational workflows while reducing required approvals by **25%** via strict policy-backed simulation and low-risk auto-approvals; deliver a constrained Switchboard Copilot that answers with evidence and drafts plans (with rollback + obligations); achieve this by **Fri Jul 17, 2026**.

**Key outcomes**

- Simulation harness v1 generates a **Simulation Report** (digest + receipt) for every proposed plan step. Coverage: policy preflight, dependencies/quotas/locks, blast-radius estimates.
- Auto-approval rules in place for low-risk actions (DLQ replay under threshold, stateless worker restarts, failed meter rollup reruns) with receipts and Automation Center visibility.
- Workflow library expanded to **8–10 total** with plan → simulate → approvals → execute → receipts → evidence export.
- Switchboard Copilot answers questions + drafts plans with citations (IDs + digests), confidence, and missing-evidence callouts; no cross-tenant leakage; no direct execution.
- Reliability: routine automation success rate **≥ 95%**; receipts include time-saved accounting; two game-days scheduled and logged as evidence bundles.

---

## 2) Success Metrics & Verification

- **Automation coverage:** 8–10 operational workflows runnable via Automation Center. _Verify:_ Workflow catalog + receipts per run.
- **Approval efficiency:** ≥ 25% reduction in required human approvals for eligible low-risk actions. _Verify:_ Approval logs before/after; policy rule hits vs manual approvals.
- **Reliability:** ≥ 95% success rate on routine runs with isolated failures and remediation notes. _Verify:_ Run dashboard, failure postmortems.
- **Copilot adoption:** ≥ 50% of internal operators use Copilot weekly. _Verify:_ Usage telemetry + weekly adoption report.
- **Provenance:** 100% of Copilot responses carry citations (IDs + digests) and highlight missing evidence. _Verify:_ Sampled responses and receipts.
- **Simulation coverage:** Simulation Report attached to every workflow run; policy obligations shown. _Verify:_ Report artifacts + digest registry.
- **Game-days:** 2 game-days completed (incident mitigation; purge/retention) with evidence bundles. _Verify:_ Recorded runs and exported bundles.

---

## 3) Scope

**Must-have (commit):**

- **Simulation harness v1:** Policy preflight, dependency/quota/lock checks, blast-radius estimation; emits Simulation Report with digest + receipt.
- **Auto-approval rules (strict):** DLQ replay under threshold; stateless worker restarts; failed meter rollup reruns. Tenant/role scoped; receipts + Automation Center visibility.
- **Workflow library expansion:** Add 5–7 workflows to reach 8–10 total, including:
  - Metering lag recovery (rollup rerun + validation)
  - Anchor backlog recovery (anchoring retry + DLQ replay)
  - Adapter health remediation (disable/rollback misbehaving adapter)
  - Key rotation assistance (schedule + verify; approvals required)
  - Retention/purge scheduling (plan, approvals required)
  - Noisy neighbor mitigation (rate-limit/move tenant if entitled)
  - Upgrade assistant (preflight, smoke, pause on failure)
- **Switchboard Copilot (evidence-first):** Tri-pane “Ask Copilot” for why/what changed/receipts queries; plan drafting with rollback + obligations; citations, confidence, missing evidence callouts; privacy guardrails enforced.
- **Operational proof:** Time-saved accounting per workflow; dashboard for time saved/week, approvals/week, failure types; receipts and evidence exports wired into Automation Center.

**Stretch:**

- Extend simulation harness to surface SLO impact projections per workflow.
- Precompute policy obligations for common workflows to speed simulation turnaround.

---

## 4) Team & Capacity

- Capacity: **~40–42 pts** (stretch optional).
- Ceremonies (America/Denver):
  - **Sprint Planning:** Mon Jul 6, 09:30–11:00
  - **Stand-up:** Daily 09:15–09:30
  - **Mid-sprint Refinement:** Thu Jul 9, 14:00–14:45
  - **Sprint Review:** Fri Jul 17, 10:00–11:00
  - **Retro:** Fri Jul 17, 11:15–12:00

---

## 5) Backlog (Ready for Sprint)

| ID          | Title                                  | Owner      | Est | Dependencies        | Acceptance Criteria (summary)                                          |
| ----------- | -------------------------------------- | ---------- | --: | ------------------- | ---------------------------------------------------------------------- |
| SIM-201     | Simulation Harness v1                  | Policy+BE  |   5 | Policy engine, data | Preflight + deps + blast radius; Simulation Report with digest+receipt |
| APRV-211    | Auto-Approval Rules (Low-Risk)         | Policy+Ops |   5 | SIM-201             | Rules for DLQ replay, stateless restart, meter reruns; receipts        |
| WF-221      | Metering Lag Recovery Workflow         | BE+Ops     |   4 | SIM-201             | Plan→simulate→approve→execute; validation + receipt                    |
| WF-231      | Anchor Backlog Recovery Workflow       | Ops        |   4 | SIM-201             | Anchoring retry + DLQ replay; obligations surfaced                     |
| WF-241      | Adapter Health Remediation Workflow    | BE+Ops     |   4 | SIM-201             | Disable/rollback adapter; receipts + rollback plan                     |
| WF-251      | Key Rotation Assistance Workflow       | Security   |   4 | SIM-201             | Scheduled rotation + verification; approvals required                  |
| WF-261      | Retention/Purge Scheduling Workflow    | Policy+Ops |   4 | SIM-201             | Deletion plan; approvals; evidence export                              |
| WF-271      | Noisy Neighbor Mitigation Workflow     | Ops        |   4 | SIM-201             | Rate-limit or move tenant; entitlements checked                        |
| WF-281      | Upgrade Assistant Workflow             | Ops+QE     |   4 | SIM-201             | Preflight, smoke, pause on failure; receipts                           |
| COPILOT-291 | Switchboard Copilot (Ask + Plan Draft) | FE+BE      |   6 | Data graphs/logs    | Evidence-linked answers; plan drafting; privacy guardrails; no exec    |
| OPS-301     | Time-Saved Accounting + Ops Dashboard  | Ops+Data   |   3 | Workflow receipts   | Time-saved + approvals/week + failure types dashboard                  |
| GAME-311    | Game-Day Evidence Bundles (x2)         | Ops        |   2 | Workflows ready     | Two game-days run; evidence bundles exported                           |

> **Planned:** ~49 pts including stretch; trim stretch if capacity tight.

---

## 6) Dependencies & Assumptions

- Policy engine with tenant/role context available to simulation harness.
- Access to receipts, policy decision logs, runbooks, dashboards snapshots (digests) for Copilot responses.
- Feature flags: `simulationHarnessV1`, `autoApproveLowRisk`, `workflowMeterLag`, `workflowAnchorRecovery`, `workflowAdapterHealth`, `workflowKeyRotation`, `workflowRetentionPurge`, `workflowNoisyNeighbor`, `workflowUpgradeAssist`, `switchboardCopilot`.
- Tenant privacy guardrails from Sprint 13 remain enforced; Copilot queries must pass privacy checks.
- DLQ replay thresholds and stateless worker restart lists defined before enabling auto-approvals.
- Test data: DLQ samples, meter rollup failures, adapter rollback artifacts, noisy neighbor tenant profiles, upgrade preflight fixtures.

---

## 7) QA Plan

**Functional:**

- Simulation harness validates policy preflight, dependencies, and blast-radius estimation for each workflow step; Simulation Report generated with digest + receipt.
- Auto-approval rules execute only for eligible low-risk actions; receipts logged with policy ID, tenant/role scope, and evidence.
- Each new workflow runs plan → simulate → approvals → execute → receipts → evidence export; rollback plans verified where required.
- Copilot answers “why denied,” “what changed,” “receipts for tenant X,” and drafts mitigation plans with citations (IDs + digests), confidence, and missing-evidence callouts; no execution from chat.
- Time-saved accounting appears on Automation Center dashboard with approvals/week and failure types.

**E2E:** Copilot drafts a metering lag recovery plan → submit to Automation Center → simulation report shows obligations → low-risk steps auto-approved, higher-risk steps await approval → execution completes → receipts + evidence bundle exported → time-saved metrics updated.

**Non-functional:** Success rate ≥ 95% on routine runs; no cross-tenant data leakage; simulation turnaround within agreed SLA.

---

## 8) Risks & Mitigations

- **Over-broad auto-approvals** → strict scoping + thresholds; dry-run in staging; receipts audited daily.
- **Simulation false sense of safety** → require policy obligations in report; block execution if obligations missing; peer review on new checks.
- **Copilot citation gaps or leakage** → enforce evidence-only sources; privacy checks; missing evidence surfaced in replies.
- **Workflow sprawl without reliability** → target 8–10 with receipts; success rate tracked; isolate failures with rollback plans.
- **Adoption lag for Copilot** → dogfood with ops leads; weekly usage reviews; rapid prompt/UX tweaks.

---

## 9) Reporting Artifacts (produce this sprint)

- Simulation Reports (digest + receipt) for all workflow runs.
- Auto-approval rule audit log with before/after approval counts.
- Workflow receipts + evidence bundles; time-saved/approvals/failure-type dashboard.
- Copilot response samples with citations and privacy checks.
- Game-day evidence bundles (incident mitigation; purge/retention).

---

## 10) Demo Script (review)

1. Ask Copilot: “Why is receipt lag spiking?” → evidence-linked explanation with digests and confidence.
2. Copilot drafts metering lag recovery plan → submit to Automation Center.
3. Simulation Report generated with policy obligations and blast radius.
4. Low-risk steps auto-approved; higher-risk steps await approval.
5. Execute workflow → receipts and evidence bundle exported; time-saved metrics update.

---

## 11) Outcome of this sprint

A safer, evidence-first automation stack: broader workflow coverage with receipts, bounded auto-approvals that cut approval fatigue, simulation reports for every run, and a constrained Switchboard Copilot that answers and drafts plans with provenance—advancing toward default autonomous ops without sacrificing guardrails.
