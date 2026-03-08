# Route Optimization Data Handling Policy

## Never Log

- Raw customer coordinates
- Personal identifiers
- Full route history

## Retention

- Metrics retained for 30 days.
- Reports are reproducible via deterministic input hash.

## Enforcement

- Output artifacts must include `evidence_id`.
- CI gates reject schema-invalid or non-deterministic output.
