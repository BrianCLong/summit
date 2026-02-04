# Control Spec: DT-001 Zero-Trust Data Governance

## Control Objective
Ensure that no data asset is accessed, processed, or deployed within the Summit platform without explicit, verified provenance and sensitivity classification. All data access must be purpose-bound and policy-authorized.

## Threat / Regulatory Driver
*   **Driver:** Zero-Trust Data Governance Principles (IT Pro)
*   **Regulatory:** EU AI Act Article 10 (Data Governance)
*   **Risk:** Model collapse due to unverified data; unauthorized access to sensitive data; "shadow data" usage.

## Enforcement Point
*   **Runtime:** `PolicyEngine` (Data Access Middleware)
*   **CI/CD:** `verify_data_registry.mjs` (Registry Integrity)

## Evidence Artifacts
1.  `data_access_logs` (JSON): Log of authorized/denied data access attempts with policy decision.
2.  `registry_validation_report` (JSON): CI report confirming all assets in use are registered and classified.

## Pass/Fail Criteria
*   **Pass:**
    *   100% of data access requests in production have a corresponding policy decision log.
    *   All data assets referenced in code/config exist in `governance/registry.json`.
*   **Fail:**
    *   Any detection of "shadow data" (unregistered assets) access.
    *   Missing provenance metadata for any active dataset.
