# Income Engine Repo Assumptions Validation

## Scope
This document captures the repository reality check for the Income Engine MWS.

## Validation Results

- **Evidence ID format**: no existing canonical Income Engine pattern was found in current pipeline modules; the engine adopts `EVID-INCOME-<YYYYMMDD>-<hash>` with regex validation in monitoring script.
- **Deterministic file rules**: deterministic JSON writing with sorted keys and stable separators exists as a repeatable pattern in repository scripts; Income Engine enforces sorted output for `report.json`, `metrics.json`, and `stamp.json`.
- **CI gate names**: no existing `CI-evidence-check`, `claim-linter`, or `deterministic-check` gates were discovered as exact names in this repository; this lane defines checks at test level pending CI workflow wiring.
- **Test framework**: pytest is active for pipeline tests under `pipelines/tests`.
- **JSON schema tooling**: `jsonschema` Draft7 validator is already used in pipeline registry code.

## Commands Executed

- `rg --files pipelines`
- `rg -n "evidence|stamp.json|metrics.json|deterministic|CI-evidence-check|claim-linter|schema" docs pipelines scripts .github`
- `sed -n '1,260p' pipelines/registry/core.py`
