# Release Tooling Index

**Scope:** Tools used for GA Release & Verification
**Location:** `scripts/` (mostly)

This index maps the scripts used in the release process to their function, ensuring ownership and maintainability.

---

## Core Decision Tooling

| Script | Function | Run Context | Failure Semantics |
| :--- | :--- | :--- | :--- |
| **`scripts/ga-core-go-nogo.sh`** | **The Master Switch.** Orchestrates validation, load testing, and staging deploy verification. | Manual (Pre-Release) | **Blocking.** If this fails, no release. |
| **`scripts/ga-gate.sh`** | Checks strict policy compliance (coverage, linting, security) for GA. | CI / Manual | **Blocking.** Enforced in pipelines. |

## Security & Compliance

| Script | Function | Run Context | Failure Semantics |
| :--- | :--- | :--- | :--- |
| **`scripts/security-hardening-suite.sh`** | Enforces baseline security configs (headers, permissions, etc.). | Pre-Merge / Pre-Release | **Blocking.** Must pass for GA. |
| **`scripts/scan-vulnerabilities.sh`** | Scans dependencies and container images for CVEs. | CI / Pre-Release | **Blocking** for Critical/High. |
| **`scripts/sign-artifacts.sh`** | Signs build artifacts using Cosign. | CI (Release Train) | **Blocking.** Unsigned artifacts are invalid. |
| **`scripts/generate-evidence-bundle.sh`** | Collects compliance evidence (logs, configs, test results) into a bundle. | CI (Release Train) | **Informational** (but required for audit). |
| **`scripts/generate_sbom.sh`** | Generates CycloneDX SBOMs. | CI (Release Train) | **Blocking.** SBOM is a required artifact. |
| **`scripts/check_traceability.cjs`** | Verifies code-to-requirement traceability tags. | Pre-Release | **Blocking** for critical components. |

## Operations & Verification

| Script | Function | Run Context | Failure Semantics |
| :--- | :--- | :--- | :--- |
| **`scripts/verify-ga.sh`** | A lighter-weight verification script (sanity check). | Manual | Informational / Diagnostic. |
| **`scripts/monitor_stabilization.sh`** | Checks metrics/logs for anomalies during stabilization. | Post-Release | Alerting. |
| **`scripts/create-release.sh`** | Helper to tag and push the release (if not using CI). | Manual | Operational. |
| **`scripts/gen-release-notes.sh`** | Generates release notes from git commits. | Manual | Helper. |

## Automation Candidates

*   **`scripts/announce-velocity-plan.sh`**: Could be adapted to automate release announcements.
*   **`scripts/validate-build-hardening.sh`**: Should be merged/integrated fully into `security-hardening-suite.sh`.

---

**Note:** Always run scripts from the repo root unless otherwise specified.
