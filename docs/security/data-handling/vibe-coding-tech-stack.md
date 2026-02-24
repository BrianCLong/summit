# Vibe Coding Tech Stack: Data Handling Standard

## Scope

This standard applies to any Vibe Stack manifest validation, scaffolding, drift detection, and
related evidence generation.

## Data Classification

| Data Type | Classification | Handling Requirements |
| --- | --- | --- |
| Credentials / secrets | Restricted | Never log, never store in artifacts |
| Tokens (API/auth) | Restricted | Never log, hash if required for detection |
| Payment identifiers | Restricted | Store only hashed IDs; no raw payloads |
| Tenant identifiers | Sensitive | Log only when required; redact in shared logs |
| Evidence provenance | Sensitive | Store with access control; avoid PII |

## Never-Log List

- Authorization headers
- Raw webhook payloads
- Access tokens, refresh tokens, session IDs
- Payment card details or billing addresses
- User PII fields (name, email, phone) unless explicitly required

## Retention & Rotation

- **Processed event IDs**: retain for configurable window; purge after expiry.
- **Artifacts**: retain per existing Summit governance retention schedule; no timestamps in
  deterministic stamps.

## Redaction Requirements

- Default logging helpers MUST redact or hash Restricted data.
- Any new logging surface must document redaction behavior in the code review notes.

## Compliance Alignment

- Aligns to `docs/SECURITY.md`, `docs/SECRETS_AND_KEY_MANAGEMENT_STANDARD.md`, and data retention
  policies in `docs/DATA_RETENTION_POLICY.md`.
