# FactGov Standards & Data Handling

## Core Principles
* **Audit Packs**: Preference for file-based evidence over UI-only displays.
* **Validators**: All attestations must be cryptographically signed by authorized validators.
* **Data Handling**: Strict field-level redaction for all highly sensitive metadata.

## Data Classification

| Data Type | Classification | Notes |
| :--- | :--- | :--- |
| Agency User Identity | **Sensitive** | PII, Role metadata |
| RFP Text & Attachments | **Highly Sensitive** | Procurement secrets |
| Vendor Compliance Docs | **Highly Sensitive** | Financial/Legal data |
| Attestation Summaries | **Sensitive** | Public verification status |
| Audit Logs | **Sensitive** | Immutable chain |

## Retention Policy

- **Raw RFP Attachments**: Default **0 days** (link-only) unless explicit consent given.
- **Audit Events**: **7 years** (configurable), hash-chained.
- **Vendor Profiles**: Retained while active + 7 years after suspension.

## Never-Log List

The following fields must **NEVER** appear in application logs (use redaction):

- EIN / Tax IDs
- Procurement Officer Email
- Uploaded Document Content
- Authorization Headers (Bearer tokens)
- API Keys
- Payment Instrument Details

## Auditability

- All state changes (status transitions) must emit an immutable audit event.
- Audit packs must be deterministic (same input = same output bytes).
- Timestamps in audit packs must be isolated to `stamp.json`.
