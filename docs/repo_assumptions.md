# Decentralized AI MWS Repo Assumptions

## Verified

- `summit/` exists and is a Python package with test coverage under `summit/tests`.
- `pipelines/` exists and supports Python entrypoints.
- `scripts/` exists with CI and operational utilities.
- `docs/` exists and contains standards, security, and runbook conventions.

## Assumed

- New decentralized AI assurance logic can be safely isolated under `summit/subsumption/decentralized_ai/`.
- Deterministic artifact generation requires sorted keys, stable ordering, and timestamp-free outputs.
- CI gates can consume `report.json`, `metrics.json`, and `stamp.json` without modifying baseline release gates.
- Policy regression harnesses can validate threshold-based checks in later PRs.

## Must-Not-Touch

- `LICENSE`
- Existing core scoring engines outside the new `summit/subsumption/decentralized_ai/` namespace.
- Existing CI baseline checks unrelated to decentralized AI.
