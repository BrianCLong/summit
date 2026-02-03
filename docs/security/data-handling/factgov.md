# FactGov Data Handling & Security

## Data Classification

| Data Type | Classification | Retention | Handling |
| :--- | :--- | :--- | :--- |
| RFP Content | **CONFIDENTIAL** | 2 years | Access restricted to assigned Vendors and Agency. |
| Vendor Tax/EIN | **RESTRICTED** | 7 years | **NEVER LOG**. Encrypt at rest. |
| Audit Artifacts | **PUBLIC/CONFIDENTIAL** | 7 years | Integrity protected by hash chains. |
| Award Decisions | **CONFIDENTIAL** | 7 years | Access restricted until public award. |

## "Never Log" List
*   Procurement officer emails (PII).
*   Agency internal notes (Sensitive).
*   Vendor Tax/EIN (Restricted).
*   Contract dollar values tied to named individuals (Privacy).

## Retention Policy
*   **Default**: 2 years for RFP content.
*   **Audits**: 7 years (Government standard).
*   **Logs**: 1 year (or per customer policy).

## Implementation
*   Use `pino` redactors for sensitive fields in logs.
*   Enforce ABAC checks at the GraphQL resolver level using `@scope` or manual checks in `service.ts`.
