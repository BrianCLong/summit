# Security Verification Gates

This document defines the security gates that verify the security posture of the Summit platform. These gates are enforced during Pull Requests, Merges to Main, and Release Promotion.

## Guiding Principles

1.  **Continuous Verification**: Security is not a one-time check but a continuous process.
2.  **Evidence-Based**: All security claims must be backed by cryptographically verifiable evidence.
3.  **Policy-as-Code**: Security policies are defined in code and version controlled.
4.  **Deterministic**: Verification results must be reproducible for the same commit SHA.

## Security Gates

The following gates are currently enforced:

| Gate | Description | Required For |
| :--- | :--- | :--- |
| **SAST & Linting** | Static Analysis Security Testing and code quality checks. | PR, Main |
| **Dependency Scanning** | Scans dependencies for known vulnerabilities. | PR, Main |
| **Secrets Detection** | Scans for hardcoded secrets and credentials. | PR, Main |
| **SBOM Generation** | Generates Software Bill of Materials. | Main, Release |
| **Provenance Attestation** | Generates SLSA provenance attestations. | Main, Release |
| **Configuration Hardening** | Verifies secure configuration defaults. | Release |
| **License Compliance** | Checks for prohibited licenses in dependencies. | Release |

## Exceptions Process

If a security check fails, it must be fixed. In rare cases where a fix is not immediately possible (e.g., false positive, low risk with planned mitigation), an exception can be requested.

See [EXCEPTION_PROCESS.md](./EXCEPTION_PROCESS.md) for details on how to request and manage exceptions.

## Evidence Artifacts

Security gates produce deterministic artifacts stored in:

-   `artifacts/security-gate/<sha>/`
-   `artifacts/sbom/<sha>/`
-   `artifacts/provenance/<sha>/`

These artifacts are bundled into the Release Evidence Bundle.
