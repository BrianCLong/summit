# Repo Assumptions

| Item | Status | Verified Path/Value | Notes |
| :--- | :--- | :--- | :--- |
| Language | Verified | Python 3.12 | `summit-ci.yml`, `requirements.in` |
| Test Framework | Verified | `pytest` | `summit-ci.yml` |
| CI Workflow | Verified | `.github/workflows/summit-ci.yml` | Job: `test-python` |
| Evidence Root | Verified | `evidence/` | Also `summit_evidence/` exists |
| Artifacts Root | Assumed | `artifacts/` | Will create if missing |
| Schema Root | Verified | `schemas/` | |
| Main Package | Verified | `summit/` | |
| New Module | Assumed | `summit/osint/` | To be created |

## Must-not-touch List
* `summit/ingest/` (unless integrating)
* `intelgraph/`
* `client/`

## CI Check Name Discovery
* [x] `test-python` (pytest)
* [x] `test-e2e` (playwright)
