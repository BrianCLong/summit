# Determinism Contract Discovery

## Summit Readiness Assertion
This discovery aligns with `docs/SUMMIT_READINESS_ASSERTION.md`.

## Deterministic Acceptance Criteria
- Canonical JSON with sorted keys and stable encoding.
- Toolchain version pinning recorded in `stamp.json`.
- Evidence ID is stable for identical inputs.
- Offline verification does not require timestamps for pass/fail.

## Next Actions
- Record canonicalization library selection.
- Define policy bundle tar canonicalization rules.
