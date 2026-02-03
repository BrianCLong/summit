# Prompt: CTA Leaders Evidence Ingest Scaffold (v1)

## Objective
Create the initial evidence ingest bundle for the CTA leader roster using short, hashed excerpts and
source metadata while updating the global evidence index and verification stub.

## Required Outputs
- Evidence bundle under `evidence/EVD-CTA-LEADERS-2026-01-INGEST-001/` with `report.json`,
  `metrics.json`, `stamp.json`, and `sources.json`.
- Excerpt fixtures stored under `summit/fixtures/cta_leaders_2026_01/`.
- Evidence index updated in `evidence/index.json`.
- CI verifier stub at `ci/verify_evidence.py` to assert index integrity.
- Roadmap status update in `docs/roadmap/STATUS.json` and dependency delta entry.

## Constraints
- Excerpts must be short and hashed.
- Timestamps only in `stamp.json`.
- Keep changes in evidence/governance scope.
