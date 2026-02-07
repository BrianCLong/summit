# Prompt: Competitor Signal Pack (Reddit M&A + AI Search)

## Objective

Implement a deterministic competitor signal pack for `reddit-ma-adtech-2026-02-06` with:

- Item manifest and evidence registry.
- Deterministic `report.json`, `evidence.json`, and `metrics.json` artifacts.
- Drift detection workflow + CI schedule.
- Standards, security data handling, and ops runbook documentation.

## Constraints

- No timestamps in evidence artifacts.
- Stable ordering for signals and JSON keys.
- All ingestion output is gated behind `INTEL_ENABLE_INGEST=1`.

## Required Paths

- `intel/items/reddit-ma-adtech-2026-02-06/`
- `intel/schema/competitor_signal.schema.json`
- `cli/src/intel/` + `cli/src/commands/intel.ts`
- `scripts/monitoring/reddit-ma-adtech-2026-02-06-drift.py`
- `docs/standards/reddit-ma-adtech-2026-02-06.md`
- `docs/security/data-handling/reddit-ma-adtech-2026-02-06.md`
- `docs/ops/runbooks/reddit-ma-adtech-2026-02-06.md`
- `.github/workflows/intel-drift.yml`
- `docs/roadmap/STATUS.json`
- `repo_assumptions.md`

## Acceptance Checks

- `summit intel ingest --source techcrunch --item reddit-ma-adtech-2026-02-06` emits deterministic `report.json` + `evidence.json`.
- `summit intel drift --item reddit-ma-adtech-2026-02-06` produces `drift.json` and exits nonzero on material changes.
- Drift workflow runs on schedule and PRs touching intel sources.
