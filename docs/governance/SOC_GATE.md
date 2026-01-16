# SOC Control Verification Gate

**Type:** Required CI Check (Hard Gate)
**Owner:** Governance Team
**Related Issue:** #14700

## Purpose
This gate automatically verifies that key SOC2/Security controls are implemented and configured correctly in the codebase. It prevents regression of compliance controls.

## Scope
The tests verify:
- **Vulnerability Scanning:** Configuration of secret scanning and security gates.
- **SBOM & Signing:** Supply chain security configurations (Syft, Cosign).
- **Branch Protection:** Existence of CODEOWNERS and policy enforcement.
- **Boundary Protection:** Governance policy documents.

## How it works
The `SOC Compliance` workflow runs on every PR targeting `main`.
It executes Jest tests located in `server/tests/soc-controls/soc-controls.test.ts`.
These tests inspect the repository configuration (workflow files, policy docs) to assert compliance.

## Evidence
- **JUnit Report:** `soc-compliance-reports/soc-results.xml` attached to the workflow run.
- **Console Output:** Visible in the "Run SOC Control Tests" step.

## Troubleshooting
If this gate fails:
1. Check the failure message in the logs to identify which control is missing or misconfigured.
2. Ensure you haven't accidentally deleted or renamed a required workflow file or policy document.
3. If you are intentionally modifying a control, update the test expectation in `server/tests/soc-controls/soc-controls.test.ts` and document the change in the PR.

## Admin Actions
- This workflow must be added to the "Required Checks" list in GitHub Branch Protection settings for `main`.
