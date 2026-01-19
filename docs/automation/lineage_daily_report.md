# Lineage & Provenance Daily Report (Nightly)

This automation renders deterministic lineage/provenance artifacts for audit and release gating.

## Outputs
For each run (keyed by commit SHA):

- `artifacts/lineage/<sha>/report.md`
- `artifacts/lineage/<sha>/metrics.json`
- `artifacts/lineage/<sha>/gaps.json`

All outputs are deterministic: no wall-clock timestamps, stable ordering, stable JSON key ordering, and content-addressed hashes inside `metrics.json`.

## Inputs
The generator reads OpenLineage event JSON from:

- `LINEAGE_EVENTS_DIR` (default: `artifacts/lineage-events`)

Supported file formats:
- `.json` (single event, or array of events)
- `.ndjson` (one event per line)

## Configuration
Policy thresholds:
- `scripts/lineage/report/lineage_policy.json`

GitHub Actions variables (recommended):
- `LINEAGE_EVENTS_DIR` — path where your pipeline exports events to
- `LINEAGE_POLICY_PATH` — optional override (default above)
- `LINEAGE_OPEN_ISSUES` — set `true` to automatically file P0/P1 gaps

## Wiring Events into LINEAGE_EVENTS_DIR
Typical patterns:
1. Export from Marquez / metadata store nightly into the workspace.
2. Persist OpenLineage events as build artifacts from pipeline runs; the nightly job downloads and aggregates them.
3. Store events in object storage and fetch during the job (authenticated action).

## Next Enhancements
- Add PROV bundle emission and agent/activity/entity completeness scoring.
- Add column-level lineage when SQL parser or warehouse lineage is available.
- Gate releases on `lineage_coverage_pct_est`.
