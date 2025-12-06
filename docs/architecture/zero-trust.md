# Data Sovereignty & Zero-Trust Architecture

## Zero-Trust Implementation (ZTA)

Summit adopts a rigorous **Zero-Trust Architecture** aligned with *NIST SP 800-207* and *DoD Zero Trust Strategy*.

### Core Pillars
1.  **Identity:** "Never Trust, Always Verify." Every request, whether internal or external, is authenticated.
    *   **Implementation:** OIDC Integration (Keycloak/Okta) with mandatory MFA. Service-to-service calls use short-lived SPIFFE IDs.
2.  **Devices:** Access is granted based on device health attestation.
    *   **Implementation:** Integration with MDM solutions to check compliance (OS version, patch level) before granting session tokens.
3.  **Network:** Micro-segmentation prevents lateral movement.
    *   **Implementation:** Istio Service Mesh enforces strict mTLS denial-by-default policies between microservices.
4.  **Data:** Data is protected via Attribute-Based Access Control (ABAC).
    *   **Implementation:** OPA (Open Policy Agent) evaluates every data access request against the user's clearance level, nationality, and need-to-know attributes.

## Data Sovereignty & Residency

### IC Data Controls
*   **US-Only Hosting:** All data for IC tenants is pinned to AWS GovCloud (`us-gov-west-1`) or C2S regions.
*   **No Off-Shoring:** Support and operations are strictly staffed by US Persons (or Cleared Citizens for IL5/6) located within the CONUS.

### Cross-Domain Solutions (CDS)
*   **Air-Gap Compatibility:** Summit is fully containerized and capable of offline deployment in air-gapped SCIF environments.
*   **Data Diode Support:** Architecture supports unidirectional ingestion from Low-Side (Unclassified) to High-Side (Classified) via standard hardware data diodes.

## ODNI Chief Data Officer (CDO) Compliance

*   **Data Tagging:** All data objects are tagged with:
    *   `classification` (e.g., TS//SI//TK)
    *   `owner` (e.g., ORG-A)
    *   `handling_caveats` (e.g., NOFORN)
*   **Data Lifecycle:** Automated retention policies ensure data is purged or archived in accordance with federal record-keeping laws.

## Policy-as-Code Example
```rego
# OPA Policy: Deny access if user lacks clearance
default allow = false

allow {
    input.user.clearance_level >= input.data.classification_level
    input.user.nationality == "US"
}
```
