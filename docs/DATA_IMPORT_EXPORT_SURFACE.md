# Data Import/Export Surface v0

## Overview

The Self-Serve Data Import/Export & Interfaces mission aims to empower customers to move data safely into and out of CompanyOS. This document defines the capabilities, interfaces, flows, and governance controls for the "Data Import/Export Surface v0".

## 1. Import/Export Use Cases

### Imports

We support importing data to populate the graph, entities, and configurations.

*   **Entities:**
    *   **Users:** Profiles, contact info, role assignments.
    *   **Organizations:** Structure, metadata, teams.
    *   **Assets:** Devices, applications, resources.
*   **Events:** Historical logs, security events (SIEM integration).
*   **Configs:** Policy definitions, alert rules, visualization preferences.
*   **Reference Data:** Threat intelligence feeds (STIX/TAXII), geo-mapping data.

**Supported Formats:**
*   **CSV:** Standard comma-separated values (streaming support for large files).
*   **JSON / JSONL:** Structured data, suitable for nested entities or events.
*   **Parquet:** High-performance columnar storage for massive datasets.
*   **APIs:** Real-time push via REST endpoints.

**Volume Targets:**
*   **Small:** < 10k records (Immediate processing)
*   **Medium:** 10k - 1M records (Background job)
*   **Large:** > 1M records (Batch processing with checkpointing)

### Exports

We support extracting data for compliance, analysis, and backup.

*   **Reports:** PDF executive summaries, incident reports.
*   **Raw Events:** CSV/JSON dumps of audit logs or activity streams.
*   **Entity Snapshots:** Full graph state of specific entities or investigations.
*   **Audit Trails:** Immutable logs of system actions for compliance.
*   **Configuration Snapshots:** JSON bundles of system state for disaster recovery or migration.

**Supported Formats:**
*   **PDF:** Rendered reports.
*   **CSV:** Tabular data for spreadsheets/BI.
*   **JSON:** Raw data for programmatic consumption.
*   **ZIP Bundle:** Container format for multi-file exports (e.g., manifest + data + metadata).

## 2. Interfaces & Flows

### 2.1 Import Flow

1.  **Initiation (UI/API):**
    *   User selects "New Import".
    *   Uploads file or provides URL.
    *   Selects target investigation or dataset.
2.  **Analysis & Preview:**
    *   System scans the first N rows.
    *   Detects schema (columns, types).
    *   Displays a data preview to the user.
3.  **Mapping & Validation:**
    *   **Field Mapping:** User maps CSV columns to Graph Schema properties (e.g., `user_email` -> `Person.email`).
    *   **Transformations:** Optional basic transforms (e.g., lowercase, date format).
    *   **Validation:** System checks against schema constraints (Zod/Joi).
4.  **Execution (Scheduler):**
    *   Job is enqueued (`pg-boss` / `CSVImportService`).
    *   User receives a Job ID.
    *   Progress is tracked via WebSocket (`socket.io`).
5.  **Completion & Review:**
    *   Success/Failure notification.
    *   Error report (downloadable CSV of failed rows).
    *   Provenance record created ("Imported from file X by User Y").

### 2.2 Export Flow

1.  **Selection (UI/API):**
    *   User selects data scope (e.g., "Investigation #123", "Audit Logs 2023").
    *   Applies filters (Date range, Entity types, Tags).
2.  **Configuration:**
    *   Selects format (JSON, CSV, Bundle).
    *   **Redaction:** Selects sensitivity level (e.g., "Redact PII", "Anonymize").
3.  **Preview (Optional):**
    *   System generates a small sample of the export.
4.  **Execution:**
    *   Job is enqueued (`DeterministicExportService`).
    *   System generates a manifest (SHA256 hashes).
5.  **Delivery:**
    *   Secure download link generated (signed URL).
    *   Audit log entry created ("User Y exported Data Z").

## 3. Governance & Safety

### 3.1 Policy Gates (OPA)

Before any data moves, the Open Policy Agent (OPA) evaluates the request:

*   **Import Policy:**
    *   "Can User X import PII?"
    *   "Is the source allowed?"
    *   "Does the data violate residency rules?"
*   **Export Policy:**
    *   "Does User X have 'Export' permission on this data?"
    *   "Is the destination secure?"
    *   "Does the export contain unredacted sensitive data?"

### 3.2 Data Integrity & Lineage

*   **Provenance Ledger:** Every import/export action is a transaction in the `ProvenanceLedger`.
    *   `Action: IMPORT`, `Actor: User1`, `Artifact: file.csv`, `Hash: abc...`
    *   `Action: EXPORT`, `Actor: User1`, `Artifact: bundle.zip`, `Hash: xyz...`
*   **Manifests:** All exports include a `manifest.json` detailing:
    *   Creator ID
    *   Timestamp
    *   Applied Transforms (Redaction, Filtering)
    *   File Hashes (SHA256) for integrity verification.

### 3.3 Error Handling

*   **Partial Failures:** Imports should handle "bad rows" gracefully.
    *   Valid rows are committed.
    *   Invalid rows are logged to an "Error File" for user review.
*   **Atomic Transactions:** Where possible (small batches), use DB transactions to ensure all-or-nothing consistency.
*   **Resumability:** Large imports store checkpoints to resume after interruption.

## 4. Example Artifacts

### 4.1 Import Mapping Spec (JSON)

```json
{
  "sourceType": "CSV",
  "targetType": "Person",
  "dedupeStrategy": "upsert",
  "compositeKey": ["email"],
  "fieldMapping": {
    "Email Address": "email",
    "First Name": "firstName",
    "Last Name": "lastName",
    "Role": "jobTitle",
    "Joined Date": "joinedAt"
  },
  "transformations": {
    "email": "lowercase",
    "joinedAt": "isoDate"
  }
}
```

### 4.2 Safety Checklist

The feature is considered **safe and supported** if:

- [ ] **Authentication:** User is authenticated via OIDC/MFA.
- [ ] **Authorization:** OPA allows the specific `import` or `export` action for this tenant/user/resource.
- [ ] **Validation:** Input files are scanned for malware (optional/future) and schema validity.
- [ ] **Redaction:** PII is redacted or hashed based on export policy.
- [ ] **Audit:** An immutable audit log entry is written for the start and completion of the job.
- [ ] **Provenance:** Lineage is recorded in the Provenance Ledger linking the data to the source/destination.
- [ ] **Limits:** Rate limits and volume quotas are enforced to prevent DoS.
- [ ] **Encryption:** Data is encrypted in transit (TLS) and at rest (storage).

## 5. Implementation Roadmap

1.  **Phase 1: Foundation (Current)**
    *   Standardize `CSVImportService` and `DeterministicExportService`.
    *   Add OPA checks to start/end of these services.
    *   Expose unified API endpoints.
2.  **Phase 2: Self-Serve UI**
    *   Build "Data Import" wizard in the frontend.
    *   Build "Export Center" in the frontend.
3.  **Phase 3: Advanced Connectors**
    *   Add API-based connectors (Salesforce, Slack, etc.).
    *   Automated recurring syncs.
