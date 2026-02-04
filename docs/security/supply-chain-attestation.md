# Supply Chain Attestation Security Model

## Summit Readiness Assertion
This security model is governed by `docs/SUMMIT_READINESS_ASSERTION.md`.

## Scope
Attestations cover SBOMs, SLSA provenance, test evidence, and signatures for release artifacts.

## Signing Modes

### Connected (Sigstore/Cosign/Rekor)
- **Trust Root**: OIDC identity + Fulcio-issued certificates.
- **Transparency**: Rekor inclusion proof required for release gating.
- **Audit Logging**: Persist certificate chain, Rekor log index, and inclusion proof hash.

### Air-Gapped (KMS/HSM)
- **Trust Root**: Org-managed KMS/HSM keys with pinned public keys in policy bundles.
- **Transparency**: Optional private log adapter or logless mode with signed receipts.
- **Audit Logging**: Record key version, rotation event, and signing policy version.

## Rotation & Revocation
- Rotate keys quarterly or on compromise signals.
- Emit revocation record into the Evidence Store and update policy bundle to deny old keys.
- Release gate requires the latest approved signer set and revocation check.

## Verification Requirements
- Provenance must use predicate type `https://slsa.dev/provenance/v1`.
- Enforce `builder.id` allowlists and integrity checks for `externalParameters` and
  `resolvedDependencies`.
- Reject evidence when signatures fail or do not chain to the configured trust root.

## Audit & Integrity
- Evidence ID binds artifact digest + policy bundle digest.
- Evidence bundles are immutable and content-addressed.
- Cross-tenant replay is rejected through tenant-scoped namespaces and subject uniqueness rules.

## MAESTRO Alignment

- **MAESTRO Layers**: Foundation, Data, Tools, Infra, Observability, Security.
- **Threats Considered**: artifact substitution, provenance forgery, replay, key compromise,
  policy downgrade, secret leakage via provenance fields.
- **Mitigations**: digest pinning, signer allowlists, tenant scoping, rotation + revocation,
  policy digest pinning, redaction profiles.
