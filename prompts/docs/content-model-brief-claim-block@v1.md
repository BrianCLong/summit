# Content Model Schemas (Brief/Claim/Block)

## Intent

Define or update Summit content-model documentation and JSON schemas for Brief, Claim, and Block
primitives, plus at least one encoded example.

## Scope

- `docs/specs/content-model/`
- `docs/roadmap/STATUS.json`

## Requirements

- Provide JSON Schemas for Brief, Claim, and Block with policy tags and work item linkage.
- Include a concrete example brief encoded to the schemas.
- Update `docs/roadmap/STATUS.json` with a revision note and timestamp.

## Guardrails

- Keep schemas JSON Schema 2020-12 compatible.
- Ensure governance and provenance fields are present.
- Avoid breaking unrelated documentation.
