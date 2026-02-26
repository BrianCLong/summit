# repo_assumptions.md

## Verified
- Python package tree exists under `summit/` and includes runtime modules suitable for a Python verifier.
- CI workflows exist under `.github/workflows/`.
- `artifacts/` directory exists at repo root and is used for generated outputs.
- Pytest is configured in `pytest.ini` with `tests` as the default test root.

## Assumed
- Existing CI can add a `python -m summit.modulith` gate without renaming existing workflows.
- Existing evidence consumers can ingest deterministic JSON from `artifacts/modulith/`.

## Must-not-touch
- Existing CI workflow names.
- Core evidence schema contracts outside the new `artifacts/modulith/*` scope.
