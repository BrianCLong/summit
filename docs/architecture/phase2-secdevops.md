
## Phase 2: SecDevOps Hardening

### Supply Chain Security
-   **SBOM**: Generated for every build using CycloneDX format.
-   **Provenance**: SLSA-like build metadata attached to artifacts.
-   **Policy Gates**: OPA policies check for linting, tests, and trusted authors.

### Secrets
-   Strict validation of environment variables at startup.
-   No hardcoded secrets in codebase.
