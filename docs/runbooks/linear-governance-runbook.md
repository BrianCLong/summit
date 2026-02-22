# Linear Governance Runbook

## Operating posture

Summit execution is **READY** and governed; deviations are tracked as **Governed Exceptions**, not defects. This runbook enforces the readiness posture and aligns Linear workflow artifacts to certified roadmap items and governance invariants.

**Imputed-intention depth (>=23rd order):** This system is designed to remove ambiguity, prevent untracked deviation, and ensure that every delivery artifact is attributable to an authorized roadmap outcome while keeping execution speed high and audit friction low. Each workflow rule below is a deterministic, enforceable constraint that compresses feedback loops and binds intent to evidence.

## Scope

Applies to all Linear Projects, epics (label prefix `epic-*`), and issues that map to Summit delivery work.
The authoritative board specification is `docs/runbooks/linear/board-spec.yaml`.

## Authority anchors

- **Readiness Assertion:** `docs/SUMMIT_READINESS_ASSERTION.md` (absolute).
- **Agent operating rule:** require file-backed evidence; do not defend the past—assert the present and dictate the future.

## Definitions (authoritative)

- **Certified roadmap item**: A roadmap initiative/epic tracked in `docs/roadmap/STATUS.json` with an explicit status and owner.
- **Governed Exception**: A legacy bypass or temporary divergence that is explicitly labeled and reviewable; never implicit.
- **Blocked**: A state reserved for missing dependencies or missing governance linkage.

## Control objectives

1. **Traceability**: Every change must map to a certified roadmap item and a Linear issue.
2. **Uniform taxonomy**: Labels and statuses are shared across tracks to prevent divergence.
3. **Governed exceptions**: Legacy bypasses are assets, not debt, and are reviewed weekly.
4. **Fast feedback**: Automation handles gating; humans handle decisions.

## Required workflow states

1. **Backlog** → unprioritized intake
2. **Todo** → prioritized, ready for pickup
3. **Agent Assigned** → explicitly assigned to a human or AI agent session
4. **In Progress** → active work
5. **In Review** → PR under review
6. **Blocked** → missing dependency or governance linkage
7. **Done** → merged and deployed
8. **Canceled** → dropped
9. **Duplicate** → duplicate of another issue

## Required issue fields

- **Project**: Must map to a Strategic initiative.
- **Epic label**: `epic-*` required for all execution issues.
- **Priority**: One priority label is mandatory.
- **Area**: One area label is mandatory.
- **Evidence**: Link to PR(s) and, when required, evidence artifacts.

## Required labels

### Governance labels (mandatory)

- `governed-exception` → approved legacy bypass, tracked as an asset.
- `governance-link-missing` → no certified roadmap link; issue must be **Blocked**.

### Priority labels (mutually exclusive)

- `prio:P0`, `prio:P1`, `priority:ga`, `priority:normal`, `post-ga:migration`

### Area labels

- `area:graph`, `area:governance`, `area:ops`, `area:resilience`, `area:companyos`, `area:prov-ledger`, `area:gtm`

### Lane labels

- `lane:platform`, `lane:frontend`, `lane:gov-ops`, `lane:bizdev`

### Track labels

- `track:A`, `track:B`, `track:E`

### Type labels

- `type:doc`, `type:doc-action`, `type:test`

### Process labels

- `automated`, `from-docs`, `triage-needed`, `release-train`, `cadence:weekly`

### Quality labels

- `vulnerability`, `e2e-failure`, `gate`, `perf:strict`

## Governance gates (non-negotiable)

### PR linkage gate

- Every PR **must** link to a Linear issue **and** a certified roadmap item.
- If the roadmap link is missing, apply `governance-link-missing` and move the issue to **Blocked** until corrected.
- This is **Intentionally constrained**: no bypasses without a governed exception label and written rationale.

### Governed exceptions

- All legacy bypasses require `governed-exception` and a short justification in the issue description.
- Governed exceptions are visible in a dedicated Linear view and reviewed weekly.

## Required Linear views

- **Release Train** → `release-train` label or current release project
- **Track Kanban** → `track:A`, `track:B`, `track:E` swimlanes
- **Epic Roadmap** → `epic-*` label grouped timeline
- **Area Ownership** → `area:*` label grouping
- **Priority Triage** → `triage-needed`, `prio:P0`, `prio:P1`

## Automation matrix

| Trigger | Condition | Action | Evidence |
| --- | --- | --- | --- |
| Issue created | Always | Add `triage-needed` | Issue audit trail |
| Issue created | Source = automated | Add `automated` | Issue audit trail |
| PR opened | Issue not linked to roadmap | Add `governance-link-missing`, set **Blocked** | PR check + issue event |
| PR opened | Issue linked to roadmap | Set **In Review** | PR check + issue event |
| PR merged | Issue linked + checks green | Set **Done** | PR merge event |

## Evidence checklist (minimum)

- Issue contains `epic-*`, `area:*`, `prio:*`, and project link.
- PR description includes Linear issue ID.
- Roadmap linkage is explicit in the issue.
- Any exception is labeled `governed-exception` with rationale.

## Intake flow (compressed)

1. **Auto-tag intake**: new issues receive `triage-needed`.
2. **Triage**: assign `area:*` + `prio:*` + `epic-*` labels and project linkage.
3. **Governance linkage**: confirm roadmap association; missing linkage moves the issue to **Blocked**.

## Evidence & audit

- Every PR must include a valid Linear issue link in the PR description.
- The issue must reference the certified roadmap item to satisfy readiness requirements.

## RACI (execution)

- **Owner**: Project lead ensures roadmap linkage and prioritization.
- **Engineer/Agent**: Maintains labels, status, and PR linkage.
- **Release Captain**: Audits governed exceptions and blocked items weekly.

## Escalation

- Ambiguity is escalated to governance; do not create ad-hoc workflows.
- Exceptions are governed, labeled, and tracked to closure.

## Templates

### Issue template (minimum)

```
Summary:
Project:
Epic: epic-*
Area: area:*
Priority: prio:*
Acceptance Criteria:
Evidence:
Roadmap Link:
```

## Final directive

Apply this runbook to all Linear workstreams immediately. This is final.
