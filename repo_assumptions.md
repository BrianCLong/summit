# Unity Packaging Subsumption Assumptions

## Verified

- `summit/` Python package exists and already contains CLI + tests.
- `policies/` directory exists for policy YAML artifacts.
- `docs/roadmap/STATUS.json` exists and tracks active initiatives.

## Assumed

- CI can execute `python -m unittest` for targeted suites.
- Artifact naming convention accepts `artifacts/package-report.json`, `artifacts/metrics.json`, and `artifacts/stamp.json`.
- Required check name for policy enforcement can be introduced as `check-unity-policy` in a future workflow.

## Must-Not-Touch (Intentionally constrained)

- Core evaluator surfaces outside `summit/pkg` additions.
- Scoring engine paths unrelated to package scanning.
- Provenance chain and ledger primitives.
