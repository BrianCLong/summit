# Structured CI Failure Codes

This document outlines the standard taxonomy for CI failures in the Summit repository. These codes are used to automatically classify failures, track trends, and guide triage.

## Taxonomy Format

Each failure code follows the format: `CI-<AREA>-###`

*   **AREA**: A 3-4 letter code indicating the failure domain (e.g., PATH, NET, DEPS).
*   **###**: A 3-digit unique identifier.

## Failure Categories

| Category | Description | Examples |
| :--- | :--- | :--- |
| **path** | File system path issues | `ENAMETOOLONG`, Max path length exceeded |
| **network** | Network connectivity or port issues | `EADDRINUSE`, Connection refused, Timeout |
| **dependency** | Package management or lockfile issues | `lockfile mismatch`, `pnpm` errors |
| **timeout** | Test or job timeouts | Jest/Vitest timeout, 30s limit exceeded |
| **docker** | Container build or runtime issues | `COPY failed`, context too large |
| **artifact** | Artifact upload/download failures | `upload failed`, 404 on artifact |
| **test** | Logic or assertion failures in tests | `AssertionError`, `expected ... to be ...` |
| **infra** | Underlying infrastructure failures | Runner crashes, disk full |
| **unknown** | Unclassified failures | `CI-UNK-000` |

## Common Codes

| Code | Title | Severity | Diagnosis |
| :--- | :--- | :--- | :--- |
| `CI-PATH-001` | File path too long | Fail | File path exceeds system limits (often Windows/Docker) |
| `CI-NET-001` | Port address in use | Fail | Required port is already occupied |
| `CI-TIME-001` | Test timeout | Fail | Test execution took longer than allowed |
| `CI-DEPS-001` | Lockfile mismatch | Fail | Dependencies in package.json do not match lockfile |
| `CI-DOCK-001` | Docker build failure | Fail | Docker build context or copy operation failed |
| `CI-ART-001` | Artifact upload failure | Warn | Failed to upload or download build artifacts |
| `CI-TEST-001` | Test assertion failure | Fail | Test expectation was not met |
| `CI-UNK-000` | Unknown failure | Fail | Unclassified failure signature |

## Usage

### In Issues and PRs
Reference the failure code (e.g., `CI-TIME-001`) in your PR description or issue title to link it to known issues.

### Adding a New Code
1.  Edit `docs/ci/FAILURE_TAXONOMY.yml`.
2.  Add a new entry with a unique code.
3.  Define a stable regex pattern for detection.
4.  Run `node scripts/ci/validate_failure_taxonomy.mjs` to verify.

### Triage Process
When a CI job fails:
1.  Check the **Job Summary** on the Actions page for the `Failure Code` and `Next Steps`.
2.  Download the `triage-artifacts` for detailed logs and matched signatures.
3.  Follow the recommended remediation steps.
