# Data Classification Standard

This standard defines how data is categorized and handled across Summit/IntelGraph. Classifications apply to data at rest, in transit, and in derived artifacts such as logs, provenance chains, and analytics outputs.

## Categories

- **Public**: Information intended for unrestricted disclosure (e.g., marketing copy, published APIs, public documentation). Public data can be shared broadly with minimal controls.
- **Internal**: Operational data and non-sensitive telemetry meant for Summit personnel and systems only. Internal data stays within managed environments and should not be exposed externally without review.
- **Confidential**: Customer, partner, or product data that could create business or trust impact if disclosed. Confidential data requires access controls, purpose limitation, and redaction before export or logging.
- **Restricted**: PII/PHI, credentials, cryptographic material, regulatory evidence, and safety-critical signals. Restricted data must default to denial, be encrypted in transit and at rest, and be minimized or tokenized wherever possible.

## Handling Expectations

- Always apply the **least-privilege** access model aligned to the category above.
- Default log/provenance pipelines to redact Restricted and Confidential fields unless explicitly allowlisted for observability.
- When in doubt, classify upward (e.g., treat unknown user-supplied fields as Restricted).

## Retention Guidance

- **Operational receipts (e.g., API receipts, audit records)**: retain for **90 days** by default for debugging and customer support. An extension to **12 months** is permitted when mandated by contractual SLAs or investigations, with documented justification.
- **Provenance chains and integrity receipts**: retain for **12 months** minimum to preserve lineage, reconstruction, and accountability. Apply compaction after 12 months (hash chaining or summarized digests) while preserving verification evidence.
- **Deletion/Minimization**: Upon retention expiry, purge clear-text payloads while keeping signed hashes necessary for non-repudiation. Ensure backups follow the same schedules.

## Classification Quick Reference

| Category     | Examples                                      | Default Handling                                   |
| ------------ | --------------------------------------------- | -------------------------------------------------- |
| Public       | Docs, marketing sites, sample data            | No restriction; keep integrity checks in CI/CD     |
| Internal     | Feature flags, non-sensitive metrics          | Authenticated access; redact before external share |
| Confidential | Customer configs, model outputs with context  | Access-controlled; redact in logs/provenance       |
| Restricted   | PII/PHI, secrets, auth tokens, safety signals | Deny by default; tokenization/redaction mandatory  |
