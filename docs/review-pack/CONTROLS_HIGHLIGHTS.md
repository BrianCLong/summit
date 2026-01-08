# Controls Highlights

This document provides a quick-reference guide to the top compliance and security controls that are most relevant to this external review. For a full list of controls, please see `CONTROL_REGISTRY.md`.

---

### 1. `OPS-03`: Change Management

*   **Description**: Formal process for code changes, including peer review, testing, and automated deployment (GitOps).
*   **Why it's important**: This is the core control that ensures all changes are vetted and validated before they can be released. The GA gate is the primary enforcement point for this control.
*   **Evidence**:
    *   `.github/workflows/pr-quality-gate.yml` (shows the required checks)
    *   `pnpm ga:verify` (the command that runs the checks)

---

### 2. `SEC-04`: Vulnerability Management

*   **Description**: Automated scanning of dependencies and container images for known vulnerabilities.
*   **Why it's important**: This control provides a critical layer of defense against supply chain attacks by ensuring that known vulnerabilities are identified before they can be deployed.
*   **Evidence**:
    *   `.github/workflows/ci-security.yml` (shows the Trivy and `pnpm audit` scans)
    *   `pnpm audit` (the command to run the dependency scan)

---

### 3. `OPS-05`: Supply Chain Security

*   **Description**: Verification of software artifacts (SBOM, Signing) to prevent tampering.
*   **Why it's important**: This control ensures the integrity of the software artifacts that are produced by the build process. By signing artifacts, we can be confident that they have not been altered.
*   **Evidence**:
    *   `.github/workflows/release-ga.yml` (shows the Cosign signing process)
    *   `scripts/generate-sbom.sh` (the script that generates the SBOM)

---

### 4. `GOV-02`: Documentation Standards

*   **Description**: Ensures all systems, APIs, and processes are documented to a standard that enables maintainability and auditability.
*   **Why it's important**: This control, enforced by the "living documents" checks, prevents documentation from becoming stale and ensures that what is documented reflects the actual state of the codebase.
*   **Evidence**:
    *   `pnpm verify:living-documents` (the command to verify documentation)
    *   `scripts/ci/compliance-lints.js` (the underlying script for the verification)

---

### 5. `SEC-01`: Access Control (IAM/RBAC)

*   **Description**: Enforces least privilege access via Role-Based Access Control (RBAC) and Identity Access Management (IAM).
*   **Why it's important**: This control ensures that only authorized users and services can access sensitive resources. While a full review of the implementation is out of scope for this pack, the evidence shows that the mechanisms are in place.
*   **Evidence**:
    *   `server/src/middleware/auth.ts` (shows the authentication middleware)
    *   `infra/iam/` (contains the Terraform configurations for IAM roles)
