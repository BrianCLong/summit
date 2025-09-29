# Audit Trail

IntelGraph provides a tamper-evident audit trail for all mutating GraphQL operations and admin actions.

## Features
- Append-only JSON log with SHA-256 hash chaining (`prevHash`) and per-entry HMAC.
- `@audited` GraphQL directive marks resolvers for automatic logging.
- Entries capture user, action, resource, before/after (redacted), decision, reason, and request id.
- OpenTelemetry span exported per entry for SIEM correlation.
- Verification CLI: `node scripts/audit_verify.mjs`.

## Environment
- `AUDIT_LOG_FILE` – path to log file (default `server/audit.log`).
- `AUDIT_HMAC_KEY` – secret for HMAC signing.
- `AUDIT_HMAC_KEY_ID` – identifier for key rotation.

## SIEM Mapping
| Audit Field | OTel Attribute | Description |
|-------------|----------------|-------------|
| `user` | `audit.user` | Authenticated user id |
| `action` | `audit.action` | Mutation name |
| `resource` | `audit.resource` | GraphQL parent type |
| `decision` | `audit.decision` | allow/deny |
| `requestId` | `audit.request_id` | Correlates to request span |

Run `make audit-verify` to validate log integrity.
