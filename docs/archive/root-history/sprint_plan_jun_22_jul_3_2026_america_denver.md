# Sprint Plan — Jun 22–Jul 3, 2026 (America/Denver)

> **Theme:** “Automate toil without losing control.” Sprint 14 focuses on agentic operations with human-in-command across Switchboard and CompanyOS.

---

## 1) Sprint Goal (SMART)

Ship policy-guided “operators” that propose and execute routine operational workflows **only through approvals and receipts**, cutting manual toil by ≥30% for top workflows, improving median time-to-mitigate by 20%, and keeping all actions auditable with kill-switch and quotas — all by **Fri Jul 3, 2026**.

---

## 2) Target Outcomes (Measurable)

- **Toil reduction:** ≥30% fewer manual steps for three operational workflows (receipt recovery, quota tuning, incident triage) measured via Switchboard telemetry and runbook deltas.
- **Safety:** 100% of agent actions require policy preflight; sensitive operations require approval/dual-control; all actions emit verifiable receipts.
- **Time-to-mitigate:** Median time-to-mitigate for common incidents reduced by 20% (game-days).
- **Explainability:** Every agent proposal includes plan, risk, policy obligations, and expected receipts.
- **Guardrails:** Kill-switch, rate limits, and scoped permissions prevent runaway automation.

---

## 3) Scope (What Ships)

### Epic A — Agent framework v1 (CompanyOS + Switchboard)

- **A1. Operator identity + permissions:** Tenant, capability, and environment scopes; all invocations recorded and searchable.
- **A2. Plan → preflight → approval → execute pipeline:** Structured plans with steps, dependencies, rollback, required permissions, policy obligations, blast radius; approvals and rationale captured; execution via `/actions/preflight` and `/actions/execute`.
- **A3. Kill-switch + quotas:** Per-tenant enablement flag, max actions/hour, max concurrent runs, auto-disable on repeated failures or SLO breach.

### Epic B — Automated workflows (MVP)

- **Workflow 1: Receipt pipeline recovery:** Detect lag/DLQ growth → propose replay → execute safely; receipts + “recovery evidence bundle.”
- **Workflow 2: Tenant quota tuning:** Detect sustained pressure → propose new quotas + notification → apply with approval; receipts + before/after usage graphs.
- **Workflow 3: Incident triage & mitigation:** On alert, gather context (deploys, denials, adapter failures) → propose rollback/pause ramp/isolate tenant/increase capacity (if allowed); receipts + incident timeline + mitigations + postmortem starter.

### Epic C — Switchboard UX: “Automation Center”

- **C1. Automation runs dashboard:** List runs with status, actor, tenant, workflow type, approvals, receipts, duration.
- **C2. Approval & rationale improvements:** Show why safe, what changes, rollback plan, and links to evidence bundles.
- **C3. Audit + replay:** Re-run past automation with updated parameters (requires fresh approvals).

### Epic D — Observability + controls

- **D1. Agent telemetry:** Success rate, time-saved estimate, failure modes, top workflows; alerts for runaway patterns.
- **D2. Safety tests:** Regression suite ensuring no bypass paths, obligations enforced, kill-switch works, and denials are safe/user-friendly.
- **D3. Runbooks:** “Agent misbehavior” response and “Automation disabled due to SLO breach” procedures.

### Explicit non-goals

- Fully autonomous remediation without approvals.
- Open-ended natural-language “do anything” agents.

---

## 4) Success Verification

- Policy preflight required on 100% of executions; approvals logged for all sensitive actions.
- Receipts (including evidence bundles) produced for every automation; searchable audit trail.
- Kill-switch and quotas enforceable at tenant scope; automatic disable triggers on failure/SLO criteria demonstrated.
- Time-to-mitigate and toil benchmarks captured before/after for the three workflows.
- Explainability fields (plan, risk, policy obligations, expected receipts) rendered in Switchboard and validated in review.

---

## 5) Backlog (Ready for Sprint)

| ID       | Title / Area                                   | Owner         | Est | Acceptance Highlights                                           |
| -------- | ---------------------------------------------- | ------------- | --: | --------------------------------------------------------------- |
| OP-A1    | Operator identity + scoped permissions         | Platform      |   3 | Tenant/capability/env scopes; invocation searchability          |
| OP-A2    | Plan → preflight → approval → execute pipeline | Platform      |   5 | Structured plan schema; approval capture; exec via APIs         |
| OP-A3    | Kill-switch + quotas                           | Platform      |   3 | Per-tenant enable; actions/hour + concurrent caps; auto-disable |
| WF-B1    | Receipt pipeline recovery workflow             | Reliability   |   5 | Lag/DLQ detection; replay plan; receipts + evidence bundle      |
| WF-B2    | Tenant quota tuning workflow                   | Reliability   |   4 | Pressure detection; proposal + notification; receipts + graphs  |
| WF-B3    | Incident triage & mitigation workflow          | SRE/OPS       |   5 | Context gather; mitigation proposals; timeline receipts         |
| UX-C1/C2 | Automation Center dashboard + approvals UI     | Web           |   4 | Runs list; rationale display; evidence links; rollback info     |
| UX-C3    | Audit + replay                                 | Web           |   3 | Re-run past automation with fresh approvals                     |
| OBS-D1   | Agent telemetry + alerts                       | Observability |   3 | Success/time-saved/failure telemetry; runaway alerts            |
| SAFE-D2  | Safety regression suite                        | QE            |   4 | Tests for obligations, kill-switch, denial handling             |
| DOC-D3   | Misbehavior/SLO-breach runbooks                | Docs          |   2 | Two runbooks with procedures and triggers                       |

> **Planned capacity:** ~37–41 pts with emphasis on the three workflows and safety rails.

---

## 6) Risks & Mitigations

- **Approval fatigue or delays:** Keep proposals crisp with expected receipts and rollback; add rationale templates and notifications for pending approvals.
- **Automation overreach:** Strict capability/environment scoping; dual-control for sensitive steps; kill-switch drill mid-sprint.
- **Telemetry blind spots:** Require evidence bundle links and receipt completeness checks; alert on missing receipts.
- **Runaway actions:** Quotas + rate limits enforced in preflight; auto-disable on repeated failures; manual kill-switch tested.
- **False-positive detection triggers:** Use thresholds with hysteresis; provide dry-run mode for detection tuning.

---

## 7) Demo Script (Sprint Review)

1. Simulate receipt lag → agent proposes replay plan → approval → execution → receipts + recovery evidence bundle.
2. Simulate quota pressure → agent proposes quota change + notification → approval → apply → before/after usage graphs.
3. Trigger incident alert → agent gathers context → proposes rollback/pause/isolation → approval → mitigation + incident timeline receipts + postmortem starter.
4. Show Automation Center: runs dashboard, rationale details, evidence links, audit trail, and replay of a prior automation (with fresh approvals).
5. Display telemetry: success rates, time-saved estimates, alerts for runaway patterns; demonstrate kill-switch and quota enforcement.

---

## 8) Definition of Done (Hard Gates)

- Operator identity + policy enforcement wired end-to-end with approvals and receipts.
- Automation Center live with approvals UX, rationale, rollback visibility, and auditability.
- Three workflows shipped and demoable in staging with evidence bundles.
- Game-day shows ≥20% time-to-mitigate improvement with supporting telemetry.
- Kill-switch, rate limits, and auto-disable behavior verified through safety tests.

---

## 9) Alignment Checklist

- Keeps humans in command: approvals required; explainability included.
- Safety-first: scoped permissions, quotas, kill-switch, dual-control for sensitive actions.
- Toil reduction measured: telemetry + runbook deltas captured for top workflows.
- Audit-ready: receipts + evidence bundles searchable and linked in Switchboard.
