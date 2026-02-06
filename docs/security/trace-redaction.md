# Trace Redaction Policy

## Scope
Agent ops traces are classified **Internal** by default. Evidence bundles must
never store unredacted secrets or credential material.

## Never-Log Fields (Redact Always)
- Authorization headers
- API keys
- Tokens (access, refresh, bearer)
- Cookies
- Secrets or passwords

## Redaction Rules
- Replace sensitive values with `[REDACTED]`.
- Redaction is applied before `report.json` and `metrics.json` are written.
- Timestamps are forbidden in `report.json` and `metrics.json` (stamp only).

## Enforcement
- `writeEvidenceBundle` performs redaction and timestamp checks.
- `.github/scripts/evidence-verify.mjs` rejects unredacted secret patterns.
- Negative fixtures live in `tests/fixtures/evidence/invalid-secret-in-report`.

## Test Coverage
- Unit tests validate normalization and trace bundle creation.
- Fixture validation asserts deny-by-default behavior for secrets and schema
  violations.
