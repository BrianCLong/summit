# repo_assumptions.md

Verified:
- Repository contains Python packages and scripts, including `summit/` package and `pytest.ini` configured test discovery.
- Deterministic evidence artifact triad (`report.json`, `metrics.json`, `stamp.json`) is used in multiple existing tooling paths.
- GitHub Actions workflows are present under `.github/workflows`.

Assumed:
- Existing CI can execute `python -m summit.modulith` without extra bootstrap steps.
- Existing evidence consumers can ingest `artifacts/modulith/report.json` and companion files.

Must-not-touch:
- Existing CI workflow names.
- Existing evidence schema contracts outside the new `artifacts/modulith/*` outputs.

Validation checklist before merge:
- Confirm artifact directory convention for modulith artifacts (`artifacts/modulith/*`).
- Confirm no workflow naming changes were introduced.
- Confirm JSON output is deterministic (`sort_keys=True`, no wall-clock timestamps).
- Confirm test command for this slice (`pytest tests/modulith/test_modulith.py`).
