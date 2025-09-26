# Audit Log Export Controls

Summit now exposes a GraphQL `exportAuditLogs` query that enables compliance teams to extract audit evidence directly from PostgreSQL. The capability is intentionally constrained to privileged RBAC roles (ADMIN, SECURITY, COMPLIANCE, AUDITOR) and supports:

- **Format selection** – Clients can request either CSV or JSON payloads for downstream ingestion.
- **Filter controls** – Time range boundaries, user actions, user IDs, and resource types ensure least-privilege data minimisation.
- **Cursor pagination** – Deterministic, signed cursors enable large exports without overwhelming clients or the API tier.

Every response includes deterministic pagination metadata (limit, cursor, total count) so exports can be resumed safely, and the CSV formatter preserves JSON structure through escaped columns for downstream tooling. Refer to `server/src/graphql/schema.audit-logs.ts` for the schema contract and `server/src/audit/export.ts` for the database query guardrails.
