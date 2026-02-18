# FactGov Standards & Data Handling

## Core Principles
* **Audit Packs**: Preference for file-based evidence over UI-only displays.
* **Validators**: All attestations must be cryptographically signed by authorized validators.
* **Data Handling**: Strict field-level redaction for all highly sensitive metadata.

## Import/Export Matrix

| Direction | Component | Description |
| :--- | :--- | :--- |
| **Imports** | Summit ABAC | Uses `authDirective` and `context.user` for permission checks. |
| **Imports** | Postgres | Uses `server/src/config/database.ts` pool for transactional data. |
| **Imports** | GraphQL | Extends the root `Query` and `Mutation` types. |
| **Exports** | Marketplace Entities | Agencies, Vendors, Validators exposed via GraphQL. |
| **Exports** | Artifacts | deterministic award recommendation JSONs. |

## Module Structure (`server/src/modules/factgov/`)

*   `types.ts`: TypeScript interfaces mirroring the DB schema.
*   `repo.ts`: Data access layer. SQL queries reside here.
*   `service.ts`: Business logic (matching, rules).
*   `resolvers.ts`: GraphQL resolvers.
*   `schema.ts`: GraphQL type definitions (SDL).

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

## Auditability & Determinism

- All state changes (status transitions) must emit an immutable audit event.
- All artifacts (award recommendations, audit trails) must be generated deterministically.
- Audit packs must be deterministic (same input = same output bytes).
- Timestamps in audit packs must be isolated to `stamp.json` or a `runtime_meta` field, not embedded in the hashable content.

## Non-goals (MWS)
*   No full Stripe billing implementation.
*   No cooperative contract API sync.
*   No real-time "chat" features (use standard Summit messaging if needed).
