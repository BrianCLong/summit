# repo_assumptions.md

Verified:
- Python package code exists under `summit/` and pytest-based tests are present in multiple package test folders.
- Existing deterministic evidence conventions use `report.json`, `metrics.json`, and `stamp.json` outputs in repository tooling.
- GitHub Actions workflows are present under `.github/workflows`.

Assumed:
- CI execution in this repository can run a Python module gate command.
- Existing evidence ingestion can consume new deterministic artifacts under `artifacts/modulith/`.

Must-not-touch:
- Existing CI workflow names.
- Existing evidence schema contracts outside the new modulith artifacts.
