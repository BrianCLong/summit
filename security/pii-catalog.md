# Summit PII Catalog & Data Minimisation Map

This catalog enumerates personal and sensitive attributes processed by Summit, their storage locations, retention timers, and
required controls. It supports the `short-30d` policy for PII while accommodating legal hold directives.

## Attribute Inventory

| Attribute | Description | Source | Storage Location | Classification | Encryption | Retention | Purpose Tags |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `user.profile.fullName` | Legal first/last name | SCIM | Postgres `users` table | Confidential PII | Field-level AES-256-GCM using per-tenant DEK | 30 days after deactivation | `intel-analysis`, `ops-support` |
| `user.profile.preferredName` | Display name | SCIM | Postgres `users` table | Internal | Transparent Data Encryption (cluster) | 30 days after deactivation | `collaboration` |
| `user.contact.email` | Work email | SCIM | Postgres `users` (encrypted column) | Confidential PII | Field-level AES-256-GCM + envelope key in Summit KMS | 30 days after deactivation | `notifications`, `intel-analysis` |
| `user.contact.phone` | Mobile phone for WebAuthn recovery | SCIM | Vault secure KV (per-tenant namespace) | Restricted PII | AES-256-GCM w/ derived DEK + phone hashing for index | 30 days after last use | `mfa-recovery` |
| `user.identifiers.hrisId` | HR system identifier | SCIM | Postgres `user_external_ids` | Restricted | Field-level AES-256-GCM | 30 days after deactivation | `workforce-ops` |
| `credential.webauthn.publicKey` | WebAuthn credential public key | WebAuthn Service | HSM-backed credential store | Secret | HSM (FIPS 140-2 level 3) | Until credential revoked + 30 days | `authn` |
| `audit.trail` | Immutable audit entries containing PII references | Services | Prov-ledger append-only log | Restricted | AES-256-GCM, digest anchored in transparency log | 7 years (regulatory) or until legal hold cleared | `compliance` |
| `analytics.event.geo` | Approx geolocation (city/region) | Client telemetry | BigQuery regional dataset | Internal | Column-level encryption (KMS-managed) | 30 days rolling window | `product-analytics` |
| `support.ticket.attachments` | User-submitted files | Support portal | S3 w/ Object Lock | Confidential | Server-side encryption w/ customer-managed CMK + client-side chunk encryption | 30 days after resolution (extend via legal hold) | `support` |

## Data Minimisation Map

| Process | Input Data | Minimisation Strategy | Enforcement |
| --- | --- | --- | --- |
| Analyst workspace search | `fullName`, `email`, `purposeTags` | Hash identifiers; expose initials only unless analyst has `legal` role | Enforced via OPA policy + UI redaction service |
| Alert notifications | `email`, `tenantId`, `audit_session` | Strip phone numbers, send via secure email only | Notification microservice enforces allowlist |
| Usage analytics | `geo`, `tenantId`, `role` | Aggregate by cohort; drop PII after 24h before export | Data pipeline TTL + BigQuery row expiration |
| MFA recovery | `phone` | Store salted hash, reveal last 2 digits only | Vault transform engine + UI masking |
| Incident response | `audit.trail`, `webauthn` metadata | Provide read-only vault; access limited to `legal` + `security` roles | Access logged + OPA policy `legal_hold` clause |

## Legal Hold & Exceptions

* `legalHold=true` in SCIM profile pins associated records regardless of retention timers. Expiry resumes 7 days after flag cleared.
* Audit log entries are never deleted; expungement requires security + legal co-approval and produces Merkle proof in ledger.
* Support attachments under investigation are copied to isolated bucket with CMK rewrapped; deletion blocked until hold release.

## Control Verification

* Quarterly review of catalog with Data Protection Officer and Security Architect.
* Automated scanner (`scripts/data-tag-audit.mjs`) validates that every column listed retains `field_encryption=true` metadata.
* CI policy simulation ensures new data models declare `purposeTags` and `retention_days` metadata before migrations merge.
