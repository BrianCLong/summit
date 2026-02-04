# Prompt: Deterministic Intel Ingestion Core

## Goal

Integrate the deterministic intel-ingestion core scaffold (SourceDocument model, hashing,
canonical JSON, evidence artifacts, CI determinism gate, and regression tests).

## Scope

- Add the deterministic ingestion package under `packages/intel_ingest/`.
- Add the CLI entrypoint at `cli/intel_ingest.py`.
- Add the SourceDocument JSON schema at `schemas/source_document.schema.json`.
- Add the CI determinism gate at `ci/gates/intel_ingest_determinism.sh`.
- Add regression tests in `tests/test_source_document_roundtrip.py`.
- Update `docs/roadmap/STATUS.json` with the change log entry.
- Update `packages/__init__.py` to expose Python namespace.
- Register this prompt in `prompts/registry.yaml`.

## Requirements

- Ensure ingestion is deterministic and does not persist raw content.
- Evidence artifacts must be written to `artifacts/evidence/<EvidenceID>/` with
  `report.json`, `metrics.json`, and `stamp.json`.
- Evidence IDs must match `evid.threattrace.v<schema_semver>.<inputsha12>.<configsha12>`.
- Determinism gate must run ingestion twice and require byte-identical `report.json`.
- Tests must validate deterministic output and hashing behavior.

## Verification

- Run `python -m pytest tests/test_source_document_roundtrip.py`.
- Run `node scripts/check-boundaries.cjs`.

## Constraints

- Keep changes within scope and align with governance requirements.
- Use canonical JSON serialization for determinism.
