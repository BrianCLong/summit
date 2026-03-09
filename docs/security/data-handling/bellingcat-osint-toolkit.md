# Data Handling: Bellingcat OSINT Toolkit MWS

## Classification and Minimization

- Raw media bytes are never logged.
- Faces, phone numbers, and emails are redacted from emitted finding metadata.
- Only fixture references and hashes are retained for reproducibility.

## Logging Rules

- Do not persist PII-bearing fields in `report.json` or `provenance.json`.
- Keep policy decisions explicit and auditable in `provenance.json`.
- Keep `stamp.json` timestamp-free to preserve determinism.

## Governance

This flow is intentionally constrained to offline fixture execution for safe, reviewable behavior.
