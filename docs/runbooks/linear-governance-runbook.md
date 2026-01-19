# Linear Governance Runbook

## Operating posture

Summit execution is **READY** and governed; deviations are tracked as **Governed Exceptions**, not defects. This runbook enforces the readiness posture and aligns Linear workflow artifacts to certified roadmap items and governance invariants.

## Scope

Applies to all Linear Projects, epics (label prefix `epic-*`), and issues that map to Summit delivery work.
The authoritative board specification is `docs/runbooks/linear/board-spec.yaml`.

## Authority anchors

- **Readiness Assertion:** `docs/SUMMIT_READINESS_ASSERTION.md` (absolute).
- **Agent operating rule:** require file-backed evidence; do not defend the past—assert the present and dictate the future.

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

## Intake flow (compressed)

1. **Auto-tag intake**: new issues receive `triage-needed`.
2. **Triage**: assign `area:*` + `prio:*` + `epic-*` labels and project linkage.
3. **Governance linkage**: confirm roadmap association; missing linkage moves the issue to **Blocked**.

## Evidence & audit

- Every PR must include a valid Linear issue link in the PR description.
- The issue must reference the certified roadmap item to satisfy readiness requirements.

## Escalation

- Ambiguity is escalated to governance; do not create ad-hoc workflows.
- Exceptions are governed, labeled, and tracked to closure.

## Final directive

Apply this runbook to all Linear workstreams immediately. This is final.
