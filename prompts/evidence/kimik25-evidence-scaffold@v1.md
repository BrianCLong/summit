# Prompt: KIMIK25 Evidence Scaffold (v1)

## Goal
Create the KIMIK25 evidence scaffold and verification checks for PR1. Add evidence
index entries, schemas/fixtures, and a deterministic validation script that enforces
timestamp-only-in-stamp.json. Ensure outputs are additive-only and emit deterministic
artifacts.

## Scope
- evidence/
- ci/
- tools/
- tests/
- docs/roadmap/STATUS.json
- .gitignore

## Constraints
- Do not remove existing evidence entries.
- Ensure schemas validate fixtures and report/metrics do not contain timestamps.
- Add fixtures for both positive and negative validation.
- Keep configuration deterministic; no timestamps outside stamp.json.
