# EP06-T01 Data Classification Policy

## Classification Levels

| Level | Label | Description | Examples | Handling |
| :--- | :--- | :--- | :--- | :--- |
| **L1** | **PUBLIC** | Information intended for public release. | Marketing materials, public website content. | No encryption required at rest. |
| **L2** | **INTERNAL** | Information for internal use only. | Employee directories, internal memos, wikis. | Encrypted at rest. Access via SSO. |
| **L3** | **CONFIDENTIAL** | Sensitive business or personal information. | PII (Email, Phone), Financial reports, Customer lists. | Encrypted at rest/transit. RBAC enforcement. Audit logging. |
| **L4** | **RESTRICTED** | Highly sensitive data requiring strict controls. | PII (SSN, Govt ID), Private Keys, Intelligence Sources. | Field-level encryption. MFA required. Just-in-time access. |

## Tagging Implementation

All data entities must carry a `classification` property.
*   **Default**: `INTERNAL`
*   **Ingest**: Connectors must map source sensitivity to these levels.
*   **Output**: APIs must redact fields based on the user's clearance level vs. the data's classification.

## Retention Policy

*   **PUBLIC**: Indefinite.
*   **INTERNAL**: 7 years.
*   **CONFIDENTIAL**: 7 years (active), then archived for 3 years.
*   **RESTRICTED**: 30 days (unless legal hold), then hard delete.
