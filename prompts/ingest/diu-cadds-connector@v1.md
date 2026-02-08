# Prompt: DIU CADDS connector + parser (Lane 1)

## Objective
Implement the DIU CADDS connector and parser to produce a structured solicitation record
with citations, while ensuring PII redaction and deterministic parsing suitable for
Summit ingestion.

## Required Outputs
- `src/connectors/diu/cadds_fetch.ts` for sanitized HTML fetch with redaction.
- `src/connectors/diu/cadds_parse.ts` for structured extraction and citations.
- `src/connectors/diu/index.ts` ingest wrapper.
- Tests in `tests/connectors/diu/` with fixtures in `tests/fixtures/diu/`.
- Update `docs/roadmap/STATUS.json`.

## Constraints
- Node 18 `fetch` only; no new dependencies.
- Redact form fields, emails, and phone numbers.
- Ensure citations for extracted groups: due date, problem statement, desired attributes,
  constraints, interop, compliance.
- Use deterministic IDs and stable parsing behavior.
