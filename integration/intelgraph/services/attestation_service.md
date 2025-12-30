# Attestation Service

## Role

Centralizes attestation verification for TEEs and controlled sandboxes across MRSGS, CEVH, POAR, JPC, and EAMS.

## Responsibilities

- Validate attestation quotes and bind to policy/scoping metadata.
- Cache validations with nonce freshness; emit downgrade notices when TEEs unavailable.
- Provide measurement allowlist management per policy version.
- Integrate with transparency log for attestable publication of validations.
