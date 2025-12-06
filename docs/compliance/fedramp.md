# FedRAMP Compliance Pathway

## Strategy: FedRAMP High
Summit is pursuing **FedRAMP High** authorization to serve agencies requiring the protection of highly sensitive unclassified data.

## Architecture Alignment

### 1. Boundary Definition
*   **Authorization Boundary:** Includes all production Kubernetes clusters, managed databases (RDS/Aurora), and load balancers.
*   **External Interconnections:** Strictly controlled via Trusted Internet Connections (TIC) 3.0 compliant gateways.

### 2. Data Segmentation
*   **Multi-Tenancy:** Implemented via strict logical separation (PostgreSQL Row-Level Security, OPA Policies) and dedicated encryption keys per tenant (AWS KMS).
*   **Federal Enclave:** Federal customers are hosted in a dedicated `us-gov-west-1` AWS GovCloud environment, physically separated from commercial tenants.

## Control Implementation Status

| Control Family | Status | Key Implementation Details |
| :--- | :--- | :--- |
| **AC (Access Control)** | ✅ Ready | MFA enforced (YubiKey/CAC), Just-In-Time (JIT) access for admins. |
| **AU (Audit and Accountability)** | ✅ Ready | Centralized logging to WORM storage (S3 Object Lock); Splunk integration. |
| **CM (Configuration Management)** | ✅ Ready | Immutable infrastructure; drift detection via ArgoCD. |
| **IA (Identification and Auth)** | ✅ Ready | ICAM integration; support for PIV/CAC derived credentials. |
| **SC (System and Comm Protection)** | ✅ Ready | FIPS 140-3 validated encryption (TLS 1.3) for all data in transit. |

## Roadmap to ATO
1.  **Readiness Assessment (3PAO):** Scheduled Q4 2024.
2.  **In-Process Designation:** Q1 2025 (Sponsorship identified).
3.  **Full Authorization:** Target Q3 2025.
