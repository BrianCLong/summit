# Stabilization Retrospective

**Authority:** This document aligns with the Summit Readiness Assertion and stabilization governance.

## Purpose

The stabilization retrospective converts weekly closeout artifacts into a deterministic monthly view
of stabilization outcomes. It is a rule-based artifact: no narratives are introduced beyond the
metrics captured in weekly closeout evidence.

## Window selection

- Default window: the last **4** weekly closeout artifacts.
- The generator selects the most recent weeks available from CI artifacts or local fixtures.
- The retrospective is deterministic for a given window and repository state.

## Recommendation derivation

The retrospective computes deltas week-over-week for the following metrics:

- risk_index
- done_p0 / done_p1
- on_time_rate
- overdue_load
- evidence_compliance
- issuance_completeness
- blocked_unissued

Improvements and regressions are derived by comparing the earliest and latest weeks in the window.
Recurring blockers are those appearing in two or more weeks, including repeated overdue load by
area or owner when available.

## Outputs

- Markdown summary: `artifacts/stabilization/retrospective/RETRO_<timestamp>.md`
- JSON summary: `artifacts/stabilization/retrospective/retro_<timestamp>.json`

The workflow uploads the latest artifacts to CI and appends a job summary with risk index trends and
focus themes.

## Where to find the latest outputs

- CI artifacts: workflow `Stabilization Retrospective & Roadmap Handoff`
- Repository path: `artifacts/stabilization/retrospective/`

## Data quality

If weekly closeout artifacts are missing, the retrospective marks them as **Governed Exceptions**
and records the missing paths. The system never invents narrative; it records what is available and
flags any gaps as deferred pending capture.
