# Securiteyes API Reference

Base URL: `/securiteyes`

Authentication: Required (JWT). Tenant context extracted from token.

## Endpoints

### Ingestion

*   **POST /events**
    *   Ingest a raw telemetry signal.
    *   Body: `{ source: string, type: string, payload: any }`
    *   Returns: Created `SuspiciousEvent` or null if filtered.

### Dashboard

*   **GET /dashboard/stats**
    *   Returns high-level metrics for the tenant (active incidents, recent events, high risk count).

### Entities

*   **GET /incidents**
    *   List active incidents.
*   **GET /campaigns**
    *   List active campaigns.
*   **GET /actors**
    *   List tracked threat actors.

### Evidence

*   **POST /incidents/:id/evidence**
    *   Generates a forensic evidence bundle for the given incident.
    *   Returns: `{ incident: object, evidence: array }`

### Risk

*   **GET /risk/profiles/:principalId**
    *   Get the risk profile for a specific user/service.
*   **GET /risk/high**
    *   Get a list of high-risk profiles for the tenant.

### Playbooks

*   **GET /playbooks**
    *   List available defensive playbooks.
*   **POST /playbooks/:id/execute**
    *   Execute a playbook.
    *   Body: `{ context: Record<string, any> }`
    *   Returns: `{ success: boolean, mitigationId: string }`

### Deception

*   **POST /deception-assets**
    *   Create a new deception asset (honeytoken, etc.).
    *   Body: `{ assetType: string, fakeConfig: object }`

### Jobs

*   **POST /jobs/run-graph-detection**
    *   Manually trigger the graph-based detection engine.
