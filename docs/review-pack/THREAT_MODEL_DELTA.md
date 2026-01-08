# Threat Model Delta for External Review

This document provides a focused summary of threats and mitigations relevant to this external review pack. It covers the integrity of the GA (General Availability) gate and the enforcement of reliability and security controls through CI/CD.

---

### 1. GA Gate Integrity / CI Enforcement

*   **Threat:** An unauthorized or untested change is promoted to a release, bypassing the established quality and security gates. This could be due to a misconfigured CI/CD pipeline, a malicious actor with commit access, or a developer making a mistake.

*   **Mitigation:** The GA gate is enforced by a series of automated, non-negotiable checks in the CI/CD pipeline. The `pnpm ga:verify` command is the cornerstone of this gate, running a suite of tests including type checks, linting, unit tests, and smoke tests. Changes cannot be merged without these checks passing.

*   **Verification:** An assessor can verify this by running the GA verification command themselves and inspecting the CI configuration.

*   **Evidence Path:**
    1.  **Control:** `OPS-03` (Change Management) and `SEC-04` (Vulnerability Management) in `CONTROL_REGISTRY.md`.
    2.  **Verification Command:** Run `pnpm ga:verify` as described in `WALKTHROUGH.md`.
    3.  **Evidence Artifact:** The CI configuration file `.github/workflows/pr-quality-gate.yml`, which shows the `ga:verify` command being run as a required check for all pull requests.

---

### 2. Reliability Drift Prevention

*   **Threat:** The reliability and governance posture of the application drifts over time. For example, documentation becomes outdated, new dependencies are added without review, or critical governance policies are not followed.

*   **Mitigation:** The project uses the concept of "living documents" and automated governance checks to prevent drift. Scripts like `pnpm verify:governance` and `pnpm verify:living-documents` are run in CI to ensure that documentation and policies remain in sync with the codebase.

*   **Verification:** An assessor can run these verification scripts to confirm that the governance and documentation are up-to-date.

*   **Evidence Path:**
    1.  **Control:** `GOV-02` (Documentation Standards) in `CONTROL_REGISTRY.md`.
    2.  **Verification Command:** Run `pnpm verify:governance && pnpm verify:living-documents` as described in `WALKTHROUGH.md`.
    3.  **Evidence Artifact:** The `scripts/ci/compliance-lints.js` and other related scripts that are executed by the verification commands.

---

### 3. Supply Chain Compromise

*   **Threat:** A malicious dependency is introduced into the codebase, or a container image is tampered with, leading to a compromise of the application.

*   **Mitigation:** The CI/CD pipeline includes automated vulnerability scanning for both dependencies (`pnpm audit`) and container images (Trivy). Additionally, all release artifacts are signed using Cosign to ensure their integrity.

*   **Verification:** An assessor can run the vulnerability scan and inspect the CI pipeline for the signing steps.

*   **Evidence Path:**
    1.  **Control:** `SEC-04` (Vulnerability Management) and `OPS-05` (Supply Chain Security) in `CONTROL_REGISTRY.md`.
    2.  **Verification Command:** Run `pnpm audit` as described in `EVIDENCE_SAMPLING.md`.
    3.  **Evidence Artifact:** The `.github/workflows/ci-security.yml` file, which shows the Trivy scan, and the `.github/workflows/release-ga.yml` file, which shows the Cosign signing process.
