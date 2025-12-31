# Lifecycle Playbooks: Installation, Upgrade, & EOL

This document provides the standard operating procedures (SOPs) for the platform's infrastructure lifecycle.

## 1. Installation Profiles

We support three primary deployment topologies:

### A. Cloud Native (Standard)
*   **Target:** AWS, Azure, GCP (Kubernetes).
*   **Components:** Managed PostgreSQL, Managed Redis, K8s Cluster.
*   **Connectivity:** Public Internet access for LLM APIs (via NAT).
*   **Use Case:** Standard enterprise deployment.

### B. Hybrid / On-Premise
*   **Target:** Private Data Center (OpenShift / VMWare).
*   **Components:** Self-hosted DBs and Message Queues.
*   **Connectivity:** Proxy-mediated external access.
*   **Use Case:** Regulated industries with data residency requirements.

### C. Sovereign / Air-Gapped (Isolated)
*   **Target:** Secure Enclave.
*   **Components:** Fully bundled dependencies. Local LLM inference only (no external API calls).
*   **Connectivity:** None. Sneakernet updates.
*   **Use Case:** Defense, Intelligence, Critical Infrastructure.

---

## 2. Upgrade Playbooks

### Routine Maintenance (Minor/Patch)
*   **Strategy:** Rolling Update.
*   **Downtime:** Zero (Goal) / < 1 min.
*   **Procedure:**
    1.  Snapshot Database.
    2.  Apply Terraform/Helm changes.
    3.  Wait for health checks.
    4.  Verify metrics.

### Major Version Upgrade
*   **Strategy:** Blue/Green Deployment.
*   **Downtime:** Maintenance window required for DB migration locks.
*   **Procedure:**
    1.  Stand up new "Green" environment (vNext).
    2.  Sync data (restore from backup + replay wal / dual-write).
    3.  Run validation suite on Green.
    4.  Cutover traffic.
    5.  Retain "Blue" for 24 hours as fallback.

### Emergency Patching (Hotfix)
*   **Trigger:** Critical CVE or P0 Bug.
*   **Strategy:** Fast-forward fix.
*   **Procedure:**
    1.  Branch from current production tag.
    2.  Apply minimal patch.
    3.  Bypass non-critical test suites (if necessary/authorized).
    4.  Deploy immediately.

---

## 3. End-of-Life (EOL) Policy

We recognize that institutions need certainty.

*   **Standard Support:** 6 months after the next minor release.
*   **Long-Term Support (LTS):** Designated releases (e.g., v1.0, v2.0) are supported for **24 months**.
*   **EOL Procedure:**
    *   3 months before EOL: Final warning notifications.
    *   EOL Date: No further security patches issued.
    *   **Data Guarantee:** We guarantee the ability to export all data from an EOL version to a standard format (JSON/SQL) indefinitely.

### Decommissioning
When retiring a platform instance:
1.  **Cryptographic Archive:** Generate a final, signed export of the Provenance Ledger.
2.  **Data Wipe:** Secure deletion of storage volumes.
3.  **Certificate Revocation:** Revoke all API keys and TLS certificates.
