# Summit PII & Sensitive Attribute Catalog

| Attribute | Category | Source System | Purpose Tags | Storage Location | Encryption | Retention | Notes |
| --------- | -------- | ------------- | ------------ | ---------------- | --------- | -------- | ----- |
| subject_id | Direct Identifier | Case Intake API | investigation, fraud | Postgres `case_subjects` | AES-256-GCM (FLE) | Short-30d | Deterministic token for joins |
| device_fingerprint | Indirect Identifier | Telemetry Pipeline | analytics | S3 `telemetry-short` | AES-256-GCM | Short-30d | Rotated daily; stored as salted hash |
| analyst_email | Direct Identifier | Identity Provider | support, audit | SCIM Directory | At rest via HSM-backed KMS | Long-365d | Export controls: US-only |
| payment_account | Sensitive Financial | Billing Service | billing | Vault `pci-segment` | Tokenized PAN + envelope encryption | PCI retention | Segmented network, no analytics reuse |
| biometric_binding | Biometric | WebAuthn Registry | authentication | DynamoDB `webauthn_credentials` | WebAuthn credential public keys only | Device lifetime | No biometric templates stored |

**Retention tiers**

- **Short-30d** – default for PII in analytics/investigation contexts; enforced by lifecycle policies and OPA obligations.
- **Medium-90d** – allowed for legal investigations when flagged with `purpose_tag=fraud` and `legal_basis=legal_obligation`.
- **Long-365d** – audit, SCIM directory metadata, and signing certificates.

**Purpose enforcement**

Every attribute listed maps to `purpose_catalog` entries. Access requests missing the matching tag are denied and logged via the immutable audit ledger.
