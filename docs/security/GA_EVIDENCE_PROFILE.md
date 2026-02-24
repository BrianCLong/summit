# GA Evidence Profile

This document defines the required evidence profile for a General Availability (GA) release of Summit.
All artifacts must meet these criteria to be considered GA-ready.

## 1. Provenance & Integrity

*   **Provenance:** All build artifacts must have a corresponding SLSA provenance attestation.
    *   File: `provenance.json`
    *   Requirement: Must exist and contain a valid SLSA predicate.
*   **Signatures:** All critical artifacts (binaries, images) must be signed using Sigstore.
    *   Verification: Use `cosign verify` or the bundle-first verification workflow.
*   **SBOM:** A Software Bill of Materials (SBOM) must be generated for all container images.
    *   Format: SPDX or CycloneDX.
    *   File: `sbom.json` (or similar in the evidence bundle).

## 2. Testing & Quality

*   **Test Results:** All test suites (unit, integration, e2e) must pass.
    *   Evidence: `report.json` containing test summary.
    *   Threshold: 100% pass rate for critical tests.
*   **Coverage:** Code coverage must meet the minimum threshold (e.g., 80%).
    *   Evidence: Coverage report in `report.json`.

## 3. Governance & Compliance

*   **OPA Policies:** All OPA policy checks must pass.
    *   Policy: `.github/policies/ga-evidence.rego`
    *   Enforcement: Hard failure in CI/CD pipeline.
*   **Vulnerability Scan:** No critical or high vulnerabilities in dependencies.
    *   Evidence: Vulnerability scan report.

## 4. Verification Instructions

To verify a release candidate against this profile:

1.  **Download the Evidence Bundle:** Retrieve the evidence bundle for the release tag.
2.  **Verify Signatures:**
    ```bash
    cosign verify-blob --bundle <bundle.pem> --signature <signature.sig> <artifact>
    ```
3.  **Check Provenance:**
    Ensure `provenance.json` matches the build digest.
4.  **Run Policy Check:**
    ```bash
    opa eval -i report.json -d .github/policies/ga-evidence.rego "data.ga_evidence.allow"
    ```

## 5. Auditor Checklist

- [ ] Provenance attestation present and valid.
- [ ] SBOM present and analyzed.
- [ ] Signatures verified for all artifacts.
- [ ] Test results confirm 100% pass rate.
- [ ] OPA policies pass.
