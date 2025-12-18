# Summit Encryption & Key Management Plan

This plan aligns Summit services with platform guardrails: field-level encryption for sensitive attributes, immutable audit
logging, and short-lived retention for PII. It describes how encryption is applied in transit and at rest, and how keys are
managed via Summit's multi-cloud KMS architecture.

## Cryptographic Objectives

1. **Confidentiality**: All PII/regulated data encrypted in transit (TLS 1.3) and at rest (AES-256-GCM or stronger).
2. **Integrity**: Immutable audit ledger anchored with SHA-256 Merkle roots + periodic notarisation.
3. **Availability**: Keys replicated across at least two HSM-backed KMS regions per jurisdiction.
4. **Granularity**: Field-level encryption for PII columns with tenant-specific data encryption keys (DEKs).

## Key Hierarchy

```
Root Key (Summit Master Key - stored in HSM, per region)
 ├── Tenant Key Encryption Keys (KEKs) - AWS KMS multi-tenant CMKs with policy-bound tenants
 │    ├── Data Encryption Keys (DEKs) for Postgres columns (rotated every 24 hours)
 │    ├── DEKs for S3 object prefixes (rotated every 7 days)
 │    └── DEKs for Vault secure KV entries (rotated on access)
 └── Token Signing Keys (ECDSA P-256) - rotated every 24 hours, 48 hour overlap
```

* DEKs generated via AWS KMS `GenerateDataKeyWithoutPlaintext` and stored encrypted alongside ciphertext.
* Legal hold data uses dedicated KEK alias (`alias/summit/legalhold`) preventing deletion until compliance clearance.

## Field-Level Encryption Strategy

| Data Store | Mechanism | Rotation | Notes |
| --- | --- | --- | --- |
| Postgres (`users`, `user_external_ids`) | `pgcrypto` AES-256-GCM via KMS-wrapped DEKs; columns tagged with `field_encryption=true` | Daily | Transparent to ORMs using `decrypt_at_runtime` helper. |
| Prov-ledger (append-only) | AES-256-GCM chunk encryption + Merkle root per block | Immutable | Ledger hash published to transparency log hourly. |
| Vault KV (recovery phone numbers) | Transit engine, Format Preserving Encryption for masked display | On read | Access requires purpose-tag `mfa-recovery`. |
| Object storage (support attachments) | Client-side chunked AES-256-GCM + S3 SSE-KMS with CMK | Weekly | Object Lock in compliance mode for legal hold. |
| Caches (Redis) | TLS 1.3 + key-wrapped values using libsodium sealed boxes | Daily | Prevents plaintext exposure if cache compromised. |

## In-Transit Encryption

* **Service-to-service**: mTLS enforced via SPIFFE identities; TLS 1.3 only, cipher suites `TLS_AES_256_GCM_SHA384`.
* **Client connections**: HSTS, ALPN HTTP/2, OCSP stapling, certificate pinning in native clients.
* **OPA Bundles**: Delivered over signed HTTPS with checksum verification prior to activation.

## Key Management Lifecycle

1. **Generation**: All keys created via KMS/HSM; software-generated keys prohibited except ephemeral session keys.
2. **Rotation**: Automated by Terraform + Summit Key Orchestrator. Failing rotation raises PagerDuty alert.
3. **Backup**: Encrypted backups stored in separate account with dual-control restore procedure.
4. **Revocation**: Compromise triggers KEK disable + DEK re-encryption pipeline (`scripts/crypto/rekey.mjs`).
5. **Monitoring**: CloudWatch metrics for key usage anomalies; SIEM ingest of KMS CloudTrail logs.

## BYOK/HSM Orchestration Layer

- **Customer Managed Keys**: `ByokHsmOrchestrator` binds tenant-owned keys (AWS KMS, Azure, GCP, dedicated HSM) without storing private material.
- **Envelope Encryption**: Data keys are generated per payload, wrapped with the customer public key, and tagged with AAD for audit context.
- **Zero-Trust Rotation**: Rotations require dual approvals, non-expired attestation tokens, and ticketed change context before a new active version is minted.
- **Rotation Health**: `getRotationReadiness` surfaces `healthy`/`due`/`overdue` to feed compliance dashboards and SRE alerts.

## Secret Management

* Operational secrets stored in Vault; short-lived tokens (1 hour) retrieved via OIDC auth method.
* No secrets committed to source control (monitored by gitleaks in CI).
* Build pipeline injects secrets via sealed secrets for Kubernetes deployments.

## Compliance & Testing

* **Policy Simulation**: `npm run policy:test` executes OPA regression suite before merge.
* **Cryptographic Self-Test**: `scripts/crypto/selftest.ts` verifies cipher suites & key expiry nightly.
* **Penetration Testing**: Annual CREST-certified assessment with focus on key compromise scenarios.
* **Disaster Recovery**: Quarterly drills rotating KEKs and verifying data decryptability in isolated environment.

## Legal Hold Handling

* When `legalHold=true`, DEKs moved under `alias/summit/legalhold` KEK and object lifecycle rules paused.
* Audit ledger retains entries indefinitely; deletion requires dual sign-off and new Merkle root attestation.
* Support attachments under hold mirrored to isolated bucket with separate CMK; read access limited to `legal` + `security`.

## Change Management

* All crypto config changes require RFC ticket + peer review.
* Terraform state stored encrypted with SOPS + KMS; plan diffs signed using Sigstore (`cosign`) prior to apply.
* CI blocks merges if encryption metadata missing in Prisma/ORM migrations.
