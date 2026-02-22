# Signing Modes Discovery

## Summit Readiness Assertion
This discovery aligns with `docs/SUMMIT_READINESS_ASSERTION.md`.

## Mode A: Connected
- Sigstore keyless signing.
- Rekor inclusion proof required for evidence verification.

## Mode B: Air-Gapped
- KMS/HSM-backed keys.
- No public Rekor dependency; optional private log adapter.

## Decision Inputs
- Approved trust roots.
- OIDC availability for connected mode.
- Requirement for private transparency log in regulated deployments.
