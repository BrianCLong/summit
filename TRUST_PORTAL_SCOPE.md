# Trust Portal Scope

This document defines the authoritative scope for the Customer Trust Portal (Sprint N+42).
The portal provides a read-only, verifiable source of truth for system status, SLAs, and security posture.

## Included Sections

### 1. System & Regional Status
*   **Real-time Availability:** Up/Down status for each major region (US-East, EU-West, etc.) and core service (API, Ingestion, Dashboard).
*   **Maintenance Windows:** Upcoming scheduled maintenance with defined scope and time.
*   **Incident History:** Past incidents with start/end times, impact summary, and resolution status.

### 2. SLA & SLO Compliance
*   **Current Period Health:** Real-time tracking against defined SLOs (e.g., API Availability > 99.9%).
*   **Historical Compliance:** Monthly/Quarterly compliance reports.
*   **Service Credits:** (Optional/Future) Indication of credit eligibility based on breaches.

### 3. Data Residency & Compliance Posture
*   **Data Residency:** Confirmation of where tenant data is stored (based on tenant configuration).
*   **Compliance Certifications:** Status of SOC2, ISO, etc., linked to evidence artifacts.
*   **Security Controls:** specific verifiable controls (e.g., "Encryption at Rest enabled", "MFA enforced").

### 4. Evidence & Verification
*   **Artifact Links:** Every claim (uptime, control status) links to a specific, immutable evidence artifact (Hash/ID).
*   **Verification Metadata:** "Last verified at" timestamps and "Verification Method" descriptions.
*   **Exports:** PDF/CSV exports of the current trust state.

## Excluded (Out of Scope)

*   **Internal Logs:** Raw application logs or stack traces are never exposed.
*   **Detailed Metrics:** Raw Prometheus metrics or internal dashboards (Grafana) are excluded.
*   **Sensitive configurations:** exact database connection strings, internal IP addresses, or secrets.
*   **Marketing Content:** No sales pitches or unverified "aspirational" claims.
*   **User PII:** The portal does not show user lists or personal data.

## Data Sources

*   **Status/SLAs:** `TenantSLOService`, `SloExporter`.
*   **Evidence:** `ProvenanceLedger`.
*   **Incidents:** `TrustIncidentService` (New).
*   **Compliance:** `SOC2ComplianceService`, `DataResidency`.
