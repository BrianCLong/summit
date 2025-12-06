# DoD Information Impact Levels (IL4/IL5/IL6)

Summit is architected to support deployment across the full spectrum of DoD Impact Levels.

## IL4: Controlled Unclassified Information (CUI)
*   **Deployment Target:** AWS GovCloud (US).
*   **Connectivity:** NIPRNet via CAP (Cloud Access Point).
*   **Identity:** CAC/PKE integration required.
*   **Data Types:** PII, PHI, Export Controlled, Critical Infrastructure.

## IL5: Higher Sensitivity CUI / Mission Critical
*   **Deployment Target:** AWS GovCloud (US) or dedicated IL5 regions.
*   **Connectivity:** NIPRNet (Isolated).
*   **Requirements:**
    *   National Security Systems (NSS) overlay applied.
    *   Personnel: US Citizens only for all operations/support roles.

## IL6: Classified (SECRET)
*   **Deployment Target:** AWS Secret Region (C2S).
*   **Connectivity:** SIPRNet.
*   **Architecture Adjustments:**
    *   **Air-Gap Support:** "Summit Offline" mode activated. External dependencies (e.g., public PyPI/NPM mirrors) replaced with internal Artifactory instances.
    *   **Cross-Domain Solutions (CDS):** Support for high-to-low data guards for unclassified OSINT ingestion.

## Comparison Matrix

| Feature | IL4 | IL5 | IL6 |
| :--- | :--- | :--- | :--- |
| **Network** | NIPRNet | NIPRNet | SIPRNet |
| **Host** | GovCloud | GovCloud+ | C2S |
| **Ops Team** | US Persons | US Citizens | Cleared (Secret) |
| **Encryption** | FIPS 140-2 | FIPS 140-3 | NSA Suite B |
