# Encryption-at-Rest & In-Transit Key Management Plan

## Key hierarchy

1. **Root KMS key (AWS KMS multi-region)** – wraps service-specific customer managed keys (CMKs); rotation every 365 days; dual control enforced via AWS CMK grants.
2. **Service CMKs**
   - `cmk/case-data` – encrypts Postgres tables containing case and subject metadata (field-level using envelope keys via pgcrypto).
   - `cmk/audit-ledger` – encrypts immutable append-only audit store (S3 + Glacier tiering); write-only role; rotation every 180 days.
   - `cmk/telemetry-short` – encrypts telemetry buckets with automatic object expiration at 30 days; rotation every 90 days.
   - `cmk/webauthn` – protects WebAuthn credential material stored in DynamoDB; enforced with AWS DAX encryption at rest.
3. **Derived data keys** – generated per request via KMS `GenerateDataKeyWithoutPlaintext`; cached for <5 minutes in memory; never written to disk.

## Transit protections

- All internal service-to-service calls terminate on mTLS (SPIFFE/SPIRE workload identities); certificates rotate every 24 hours.
- OIDC and SCIM endpoints require TLS 1.3 with modern cipher suites (`TLS_AES_256_GCM_SHA384`).
- WebAuthn ceremonies use FIDO2 attestation over HTTPS with origin binding; attestation statements validated against metadata service.

## Key custodians & audit

- Key operations require quorum (2-of-3) using AWS KMS key policies mapped to `SecurityArchitect` and `PrivacyEngineer` IAM roles.
- Audit events for key usage are streamed to the immutable ledger; OPA policy denies any attempt to purge or modify the ledger bucket.
- Backups of CMK policies stored in versioned Git, signed using Sigstore Cosign. Disaster recovery validated quarterly.

## Secrets handling

- Application secrets stored in HashiCorp Vault with transit engine for on-the-fly encryption.
- Short-lived tokens (<15m) for CI/CD pipelines minted via OIDC federation; never persisted in logs.
- Developers interact via just-in-time access flows; approvals captured in audit ledger with hash chaining.
