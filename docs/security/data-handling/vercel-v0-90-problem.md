# Data Handling — Vercel v0 “90% Problem” Subsumption

## Summit Readiness Assertion
This data-handling standard is governed by the Summit Readiness Assertion and inherits its enforcement posture. See `docs/SUMMIT_READINESS_ASSERTION.md` for the authoritative mandate.

## Never Log (Deny by Default)
- Environment variable values.
- Access tokens or API keys.
- Connection strings.
- Customer data paths or raw dumps.

## Retention
- Evidence artifacts: keep for 30 days, configurable by policy.
- Raw sandbox stdout: retained only on failure, with redaction enforced.

## Redaction Policy
- Redact matches of secret patterns in logs and evidence.
- Policy hashes recorded in `stamp.json` to detect tampering.

## Deferred Pending Validation
- Redaction middleware integration with observability pipeline.
