# Data Inventory (GA Baseline)

## 1. Data Categories

### 1.1 Customer Data (Core)
*   **Graph Data**: Nodes (Entities) and Edges (Relationships) representing business domain objects.
    *   **Store**: Neo4j
    *   **Classification**: Confidential
*   **Relational Data**: User profiles, tenant configurations, structured records.
    *   **Store**: PostgreSQL
    *   **Classification**: Confidential

### 1.2 System Data
*   **Configuration**: Environment-specific settings, feature flags.
    *   **Store**: Redis (cached), PostgreSQL (persistent), Environment Variables
    *   **Classification**: Internal
*   **Secrets**: API keys, database credentials, encryption keys.
    *   **Store**: Environment Variables (injected), Vault (if configured)
    *   **Classification**: Restricted

### 1.3 Telemetry & Observability
*   **Logs**: Application logs, error traces, request logs.
    *   **Store**: Standard Output (container logs), File (local/ephemeral)
    *   **Classification**: Internal
*   **Metrics**: Prometheus metrics (latency, error rates, resource usage).
    *   **Store**: Prometheus (scraped from `/metrics`)
    *   **Classification**: Internal

### 1.4 Audit & Provenance
*   **Provenance Ledger**: Immutable record of data mutations and lineage.
    *   **Store**: PostgreSQL (`provenance_ledger_v2` table)
    *   **Classification**: Restricted / Integrity-Critical
*   **Audit Events**: Security and compliance events.
    *   **Store**: PostgreSQL (`audit_events` table)
    *   **Classification**: Restricted

## 2. Storage & Residency

| Service | Data Type | Persistence | Path / Config |
| :--- | :--- | :--- | :--- |
| **PostgreSQL** | Relational, Audit, Provenance | Persistent | `server/src/config/database.ts` |
| **Neo4j** | Graph Data | Persistent | `server/src/db/neo4j.ts` |
| **Redis** | Cache, Sessions, Queues | Ephemeral / LRU | `server/src/config/database.ts` |
| **FileSystem** | Temporary Uploads, Logs | Ephemeral | `/tmp`, `logs/` |

## 3. Data Flow

1.  **Ingest**: Data enters via API Gateway (REST/GraphQL) or Webhooks (`server/src/routes/`).
    *   Input validation and sanitization occur here (`server/src/middleware/sanitize.ts`).
2.  **Process**:
    *   Synchronous processing by API services.
    *   Asynchronous processing by Workers/Maestro (`server/src/maestro/`).
3.  **Store**: Validated data is persisted to PostgreSQL or Neo4j.
    *   Mutations are recorded in the Provenance Ledger (`server/src/provenance/ledger.ts`).
4.  **Output**: Data is retrieved via API, exported (`server/src/export/`), or emitted as metrics.

## 4. Non-Goals (GA)

*   **PCI/PHI**: The system is **not** authorized to process or store Payment Card Industry (PCI) data or Protected Health Information (PHI).
*   **Raw Binary Storage**: Large binary files (videos, images) are not stored directly in the database; only metadata and references are managed.
*   **Cross-Tenant Data Sharing**: No implicit sharing of data between tenants is supported.
