# FS-Researcher Runbook (MWS)

## Enablement

- Set `FS_RESEARCHER_ENABLED=1` to enable the CLI.
- Optional: `FS_RESEARCHER_MAX_SOURCES=5` to cap fixture ingestion.

## Workspace Lifecycle

1. Create a workspace directory.
2. Run `summit fs-research --query "<query>" --workspace <path> --fixtures <fixture-dir>`.
3. Validate `artifacts/metrics.json`, `artifacts/report.json`, and `artifacts/stamp.json`.

## Cleanup & Retention

- Remove `sources/` when retention limits require source deletion.
- Preserve `artifacts/` for audit and drift detection.

## Debug Checklist

- Inspect `log.md` for stage timing.
- Re-run with fixtures to reproduce deterministically.
- Run workspace validator to confirm citations and source references.

## SLO Assumption (MWS)

- Successful run produces complete report + metrics; partial runs keep `todo.md` accurate.
