# Post-Release Learning Loop Runbook (Day 0–7)

## Objective

Converge launch feedback, operational telemetry, and iteration planning into one evidence-backed
loop that can run during the first week after release without changing governance lanes.

## 1) Current-State Surfaces

### Canonical existing surfaces

- Issue intake templates: `.github/ISSUE_TEMPLATE/bug_report.yml`, `.github/ISSUE_TEMPLATE/incident.yml`, `.github/ISSUE_TEMPLATE/triage.yml`.
- Weekly release cadence surface: `.github/ISSUE_TEMPLATE/ops-weekly-release.md`.
- Incident response procedure: `docs/runbooks/incident-management.md`.
- First-week stabilization context: `docs/releases/MVP-4_POST_GA_STABILIZATION_PLAN.md`.
- Operational response examples: `ops/runbooks/production-ops-runbook.md`, `ops/runbooks/observability-sre.md`.
- Triage automation policy signal: `docs/releases/_state/triage_state.json`.

### Partial surfaces

- Existing templates capture priority/area/type, but not first-week launch signal fields needed for
  reproducible post-release triage (environment, regression window, blast radius evidence,
  operator toil).
- Stabilization docs define activities but do not provide a single canonical signal capture format
  that directly feeds prioritization decisions.
- Existing weekly cadence issue does not classify incoming evidence into explicit action classes
  (`fix-now`, `stabilize-next`, `observe`, `defer`).

### Missing surfaces

- Single canonical launch-signal intake template for operator feedback + user reports + deployment
  observations.
- Explicit first-hour/first-day/first-week telemetry review checklist with required signal
  categories and rollback triggers in one place.
- Evidence-backed prioritization rubric converting observed signals into action classes.
- Structured handoff template to convert validated signals into next-iteration PR queue candidates.

### Overlaps not to expand

- Do not create parallel incident workflows outside `docs/runbooks/incident-management.md`.
- Do not create another independent weekly promotion checklist separate from
  `.github/ISSUE_TEMPLATE/ops-weekly-release.md`.
- Do not duplicate generated telemetry/report artifacts under `docs/releases/_state/`.

## 2) Canonical Feedback Ingestion (Use One Template)

Use `.github/ISSUE_TEMPLATE/post-release-signal.yml` for all first-week launch signals, including:

- operator feedback
- user-reported issues
- deployment observations
- feature friction and confusing UX
- false positives / false negatives / noisy alerts

Required fields in the template enforce reproducible triage:

- release/version
- environment and impacted surface
- signal class
- symptom and expected/actual behavior
- reproducibility level
- blast radius
- severity and operator toil
- evidence links (dashboard panels, logs, traces, issue links)
- rollback trigger hit/not hit

## 3) First-Week Telemetry Review Cadence

Review cadence is mandatory for the first week after each production release.

### Immediate post-deploy (0–15 min)

- Confirm deployment/rollback pipeline result and smoke checks.
- Confirm core service health and startup failures.
- Confirm alert storm/noise state is normal.

Evidence to capture:

- smoke result link
- deployment ID / workflow run URL
- any blocking errors with trace/log references

### First hour

Review these signal categories:

- health/smoke status
- errors/failures (5xx, failed jobs, queue backlogs)
- latency/performance regressions (p95/p99)
- alert volume/noise and false positives
- operator toil (manual remediation count/time)
- rollback trigger checks

### First day

- Re-check hour-1 categories with trend direction (improving, flat, degrading).
- Add adoption/usage indicators where available (request volume, active tenant activity,
  feature-use events).
- Confirm incident count and severity distribution (`SEV1..SEV4`) aligned with
  `docs/runbooks/incident-management.md`.

### First week

- Consolidate all post-release signals from issue template intake.
- Produce prioritized action classes via rubric in this runbook.
- Hand off validated follow-on work via
  `docs/releases/templates/post-release-iteration-handoff.md`.

## 4) Evidence-Backed Triage Rubric

Every incoming signal is scored on four mandatory dimensions:

- **Severity**: user/business impact if unresolved.
- **Reproducibility**: deterministic, intermittent, or unconfirmed.
- **Blast radius**: single user/tenant vs multi-tenant/systemic.
- **Operator impact**: on-call load, manual toil, and escalation overhead.

### Action classes

- **Fix Now**
  - High severity OR rollback trigger hit, with reproducible evidence and meaningful blast radius.
  - Expected output: hotfix issue + linked implementation PR.
- **Stabilize Next**
  - Medium severity with clear trend degradation or high operator toil but no immediate rollback.
  - Expected output: scheduled near-term patch in next release train.
- **Observe**
  - Low/uncertain severity, limited blast radius, insufficient reproducibility.
  - Expected output: explicit observation window and metric threshold to reclassify.
- **Defer**
  - Low impact and low urgency with clear workaround.
  - Expected output: backlog item with rationale and evidence retained.

### Decision record requirements

For each prioritized item include:

- source issue link
- evidence IDs/links (logs, traces, dashboards, incident doc)
- selected action class with rationale
- owner and target iteration

## 5) Iteration Planning Handoff

At end of Day 7, create one handoff artifact using:

- `docs/releases/templates/post-release-iteration-handoff.md`

The handoff must include:

- validated signal summary
- grouped action classes
- top implementation queue (small PR-sized slices)
- deferred backlog with explicit re-entry trigger

## 6) Validation Commands

Run before merge:

```bash
pnpm lint
pnpm format:check
pnpm typecheck
pnpm test
make smoke
```

For docs-only changes where full suite is not practical in branch scope, run at minimum:

```bash
pnpm -s prettier --check docs/runbooks/post-release-learning-loop.md docs/releases/templates/post-release-iteration-handoff.md .github/ISSUE_TEMPLATE/post-release-signal.yml
```

## 7) MAESTRO Alignment

- **MAESTRO Layers**: Observability, Security, Agents, Tools.
- **Threats Considered**: alert fatigue masking regressions, under-triaged incidents,
  prompt/process drift creating non-reproducible issue intake.
- **Mitigations**: single intake schema, mandatory evidence links, explicit cadence gates,
  deterministic action classes tied to owner + iteration.
