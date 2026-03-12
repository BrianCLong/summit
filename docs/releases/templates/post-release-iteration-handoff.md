# Post-Release Iteration Handoff Template

Use this template at the end of first-week launch review to convert validated feedback and
telemetry into a merge-safe implementation queue.

## 1. Release Context

- Release/tag:
- Review window: Day 0 to Day 7
- Owners:
- Linked weekly ops issue:

## 2. Evidence Sources

- Launch signal issues (template: `.github/ISSUE_TEMPLATE/post-release-signal.yml`):
- Incident records (`docs/runbooks/incident-management.md` process):
- Telemetry dashboards/panels:
- Smoke and deploy evidence:

## 3. Signal Summary

| Signal ID/Issue | Category | Severity | Reproducibility | Blast Radius | Operator Impact | Evidence Links |
| --------------- | -------- | -------- | --------------- | ------------ | --------------- | -------------- |
|                 |          |          |                 |              |                 |                |

## 4. Prioritization Outcomes

### Fix Now

- Item:
- Why now (evidence-backed):
- Owner:
- Target PR scope (small, reviewable):

### Stabilize Next

- Item:
- Why next (evidence-backed):
- Owner:
- Target milestone/sprint:

### Observe

- Item:
- Observation window:
- Reclassification trigger:
- Owner:

### Defer

- Item:
- Deferral rationale:
- Re-entry trigger:
- Backlog link:

## 5. Next Iteration Queue (PR-Stack Ready)

| Queue Order | Change Slice | Type (`fix/docs/refactor`) | Risk | Evidence Dependency |
| ----------- | ------------ | -------------------------- | ---- | ------------------- |
| 1           |              |                            |      |                     |
| 2           |              |                            |      |                     |
| 3           |              |                            |      |                     |

## 6. Rollback & Guardrails

- Rollback trigger(s) to monitor during follow-on patches:
- Required gates before merge (`lint/typecheck/test/smoke`):
- Human review owner(s):

## 7. Explicit Deferrals

- Deferred work item:
- Why intentionally constrained now:
- Target revisit date/trigger:
