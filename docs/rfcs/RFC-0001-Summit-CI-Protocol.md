# RFC-0001: Summit CI Protocol

## 1. Context and Objective

Summit is evolving from an AI orchestration layer into a DevSecOps control plane and governance substrate for agentic systems. To enable this, we need a canonical protocol for how AI systems are built, tested, governed, and deployed.

This RFC outlines the **Summit CI Protocol**, providing a structural foundation to formalize CI as an API. By abstracting the CI protocol, Summit enables governance linting, agent execution symmetry, and reliable trust telemetry across repositories.

## 2. Scope

The CI protocol defines standard phases and artifact expectations for any Summit-managed or governed repository.

## 3. Protocol Definition

### 3.1 Standard Phases

Every governed CI pipeline must map to the following canonical phases:

*   **`checkout`**: Source code retrieval and environment preparation.
*   **`build`**: Compilation, asset bundling, and image creation.
*   **`test`**: Unit, integration, and policy testing (including governance linting).
*   **`package`**: Artifact preparation and SBOM generation.
*   **`publish`**: Artifact signing, provenance generation, and deployment.

### 3.2 Required Artifacts

To support the trust graph and compliance attestations, pipelines must produce:

*   **`sbom`**: Software Bill of Materials (e.g., CycloneDX or SPDX) for all production artifacts.
*   **`provenance`**: SLSA provenance attestations.
*   **`signatures`**: Cryptographic signatures (e.g., via cosign) verifying artifact integrity.

## 4. Rationale and Implications

By standardizing these phases and artifacts:
*   **Automation**: Summit agents can programmatically reason about, debug, and generate CI configurations.
*   **Governance**: The Governance Linter can hook into well-defined phases to enforce policy before `publish`.
*   **Execution Symmetry**: Agents can run local equivalents of CI phases to pre-verify work.

## 5. Next Steps
*   Implement `docs/ci/linter/` policies.
*   Map current GitHub Actions to these abstract phases.
