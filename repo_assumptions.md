# Unity Package Subsumption Assumptions

## Verified
- `summit/` Python package exists and is covered by `summit/tests/` pytest tests.
- Repository has CI workflows under `.github/workflows/` with Python execution support.
- Policy files are stored in YAML format in top-level policy-like directories.

## Assumed
- `package-report.json`, `metrics.json`, and `stamp.json` are acceptable artifact names for package evidence.
- `EVIDENCE:UNITYPKG:<name>:<version>` aligns with downstream evidence ingestion expectations.
- A dedicated workflow for Unity package policy checks can be added in a follow-up change.

## CI Check Names (Current + Proposed)
- Current examples: `summit-ci`, `graphci`, `ci-evidence-verify`.
- Proposed follow-up check: `check-unity-policy`.

## Existing Evidence Schema
- Existing workflows expect machine-readable JSON evidence artifacts in `artifacts/` directories.
- This slice emits deterministic JSON blobs with sorted keys and no timestamp fields.

## Must-Not-Touch Files (Guardrail)
- Core evaluator/scoring internals under `summit/benchmarks/deepsearchqa/`.
- Provenance chain services under `services/prov-ledger/`.
- Existing CI scoring/evaluation workflows under `.github/workflows/*eval*.yml`.
