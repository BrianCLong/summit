# Stabilization Retrospective

The stabilization retrospective consolidates weekly closeout artifacts into a deterministic,
rule-based monthly summary. It exists to turn stabilization evidence into actionable, governed
signals aligned with the Summit Readiness Assertion.

## Purpose

- Provide a single monthly view of stabilization health and drift.
- Surface improvements, regressions, and recurring blockers using metrics only (no narratives).
- Feed the roadmap handoff pipeline with evidence-backed triggers.

## Inputs and Window Selection

- Default window: 4 weeks.
- Week ending date is computed per policy (`week_ending_day`) in
  `docs/ci/STABILIZATION_RETROSPECTIVE_POLICY.yml`.
- Closeout artifacts are fetched from CI using the configured artifact name patterns or from the
  local fallback directory.

### Closeout Artifact Expectations

Artifacts must provide JSON payloads containing the metrics below (flat or under `metrics` or
`summary`):

- `risk_index`
- `done_p0`
- `done_p1`
- `on_time_rate`
- `overdue_load`
- `evidence_compliance`
- `issuance_completeness`
- `blocked_unissued`

## Outputs

- Markdown: `artifacts/stabilization/retrospective/RETRO_<timestamp>.md`
- JSON: `artifacts/stabilization/retrospective/retro_<timestamp>.json`
- Latest JSON pointer: `artifacts/stabilization/retrospective/retro_latest.json`

## Fixtures

Sample outputs are stored in `fixtures/stabilization/retrospective/` for review and validation.

## Recommendations (Rule-Based)

- "What improved" and "What regressed" are derived from metric deltas.
- "Recurring blockers" are based on repeated overdue items across weeks.
- "Focus next month" themes are generated from the policy thresholds with no manual narrative.

## Data Quality

The retrospective includes a data quality section that tracks missing sources and missing artifacts.
Missing inputs are labeled as **Governed Exceptions** and must be resolved in subsequent closeouts.

## Running Locally

```bash
node scripts/releases/generate_stabilization_retrospective.mjs --weeks=4 --out-dir=artifacts/stabilization/retrospective
```

Update the policy file to adjust windows or source locations:

```text
docs/ci/STABILIZATION_RETROSPECTIVE_POLICY.yml
```
