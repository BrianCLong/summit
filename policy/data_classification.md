# Data Classification Policy

## Levels

### PUBLIC
*   **Description**: Content suitable for public release. No sensitive data.
*   **Handling**: Can be stored in public repos.
*   **Markers**: `DATA_CLASSIFICATION: PUBLIC`

### CUI (Controlled Unclassified Information)
*   **Description**: Official information that requires safeguarding or dissemination controls pursuant to and consistent with law, regulations, and Government-wide policies.
*   **Handling**: **DENY-BY-DEFAULT** in this repo. Must be redacted or stored in approved isolated enclaves.
*   **Markers**: `DATA_CLASSIFICATION: CUI`

### EXPORT_CONTROLLED
*   **Description**: Technical data subject to ITAR/EAR.
*   **Handling**: **DENY-BY-DEFAULT** in this repo.
*   **Markers**: `DATA_CLASSIFICATION: EXPORT_CONTROLLED`

### CLASSIFIED
*   **Description**: National Security Information (Confidential, Secret, Top Secret).
*   **Handling**: **STRICTLY PROHIBITED**.
*   **Markers**: `DATA_CLASSIFICATION: CLASSIFIED`

## Enforcement
All `programops/concepts/**/concept.md` files must declare `DATA_CLASSIFICATION: PUBLIC`.
Any file containing restricted markers outside of `policy/` or `_fixtures/` will fail CI.
