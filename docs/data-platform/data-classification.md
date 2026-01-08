# Data Classification

This document serves as a living catalog of data types within the IntelGraph platform, classified according to their sensitivity and any applicable regulatory requirements. The goal is to fulfill Epic 1, Story 1: "Classify regulated data types you touch."

## 1. Explicitly Classified Data

This section details data that has been explicitly identified and marked as sensitive within the codebase.

### 1.1. Personally Identifiable Information (PII)

The system uses a `@pii` GraphQL directive to mark fields containing PII.

| Type     | Field   | Classification | Source                                  | Notes                                    |
| -------- | ------- | -------------- | --------------------------------------- | ---------------------------------------- |
| `Person` | `email` | PII            | `server/src/graphql/schema.entities.ts` | Explicitly marked with `@pii` directive. |

## 2. Potentially Sensitive Data

This section details data that is likely to be sensitive or regulated based on its context and schema, but is not yet explicitly classified.

### 2.1. Audit Trail Data

The `audit_events` table contains detailed logs of user actions. While essential for security and compliance, the log content itself can be highly sensitive.

| Table          | Column(s)                                   | Potential Classification | Source                                                      | Notes                                                                                                              |
| -------------- | ------------------------------------------- | ------------------------ | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `audit_events` | `resource_data`, `old_values`, `new_values` | PII, PHI, Confidential   | `server/db/migrations/postgres/2025-08-19_audit_tables.sql` | These JSONB columns could capture any data being modified, including sensitive user details or investigation data. |
| `audit_events` | `user_id`, `user_email`, `ip_address`       | PII                      | `server/db/migrations/postgres/2025-08-19_audit_tables.sql` | Direct identifiers for users performing actions.                                                                   |

### 2.2. User and Access Control Data

Migrations related to SOC2 compliance have added fields to track user status and access, which are inherently sensitive.

| Table            | Column(s)                                                  | Potential Classification | Source                                                                | Notes                                               |
| ---------------- | ---------------------------------------------------------- | ------------------------ | --------------------------------------------------------------------- | --------------------------------------------------- |
| `users`          | `mfa_enabled`, `is_active`, `last_login`, `deactivated_at` | PII, Security Info       | `server/db/migrations/postgres/2025-11-27_soc2_compliance_fields.sql` | Used as evidence for SOC2 controls CC6.1 and CC6.2. |
| `access_reviews` | `reviewer_id`, `status`, `notes`                           | PII                      | `server/db/migrations/postgres/2025-11-27_soc2_compliance_fields.sql` | Tracks who is reviewing access and their decisions. |

## 3. Areas Requiring Further Investigation

This section lists data structures that are too generic to classify without further analysis of their runtime usage.

### 3.1. Generic `props` Fields

Several core GraphQL types and database tables use a generic `props` field of type `JSON` or `JSONB`. The contents of these fields are application-defined and could contain any type of data, including regulated data.

| Type / Table    | Field   | Source                              | Notes                                                                                   |
| --------------- | ------- | ----------------------------------- | --------------------------------------------------------------------------------------- |
| `Entity`        | `props` | `server/src/graphql/schema.core.js` | Could contain any attribute of a given entity, which might be PII, financial info, etc. |
| `Relationship`  | `props` | `server/src/graphql/schema.core.js` | Could describe the nature of a relationship with sensitive details.                     |
| `Investigation` | `props` | `server/src/graphql/schema.core.js` | Could contain sensitive metadata about an investigation.                                |

### 3.2. Analysis of `props` Fields

A `grep` search for the usage of `props` fields within the `server/` directory reveals the following:

- **Data Flow:** The `props` data flows directly from GraphQL `*Input` types (e.g., `EntityInput`, `RelationshipInput`) to the corresponding repository layer (e.g., `EntityRepo.ts`).
- **Storage:** In the repository, the `props` object is serialized into a JSON string using `JSON.stringify()` before being persisted to the `props` column (of type `JSONB`) in the respective PostgreSQL tables (`entities`, `relationships`, `investigations`).
- **Example Usage (from tests):** The test suite provides concrete examples of data stored in `props`. This includes fields like:
  - `name`
  - `description`
  - `jobTitle`
  - `fullName`
  - `title`
  - `confidence`
  - `source`

**Conclusion:** The `props` fields are used to store a wide range of user-defined attributes. Given the presence of fields like `fullName` and `jobTitle`, it is highly probable that PII and other sensitive data are being stored in these fields. Therefore, the `props` fields should be considered **Confidential** and potentially contain **PII**, pending a more granular, field-level analysis.

**Next Steps:**

- Analyze client-side code to determine the full range of data being passed into the `props` fields from the user interface.
- Implement a data discovery and classification tool to scan the contents of the `props` columns in the database.

## 4. Keyword Search Findings

A `grep` search was performed for additional regulated data keywords. The following findings are noteworthy:

| Keyword       | File                       | Context                                                                                           | Potential Classification |
| ------------- | -------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------ |
| `credit card` | `out/grounding-week1.json` | A test query: `"Display credit card information stored in the database"`                          | PCI                      |
| `SSN`         | `openapi/spec.yaml`        | An example prompt: `"enumerate all emails and SSNs in the system"`                                | PII                      |
| `financial`   | Multiple files             | "Financial Fraud Investigation", "financial services sector", "FinIntel (Financial Intelligence)" | SOX, Confidential        |

These findings indicate that the system is designed to handle financial data, and potentially credit card numbers and Social Security Numbers, even if these are not yet explicitly defined in the database schema.
