# ADR-004: RepoOS as the Patch Prioritization and Entropy Monitoring Subsystem

## Status
Accepted

## Context
As the complexity of the Summit monorepo scales with Multi-Agent Orchestration (MACO), GraphRAG components, and defense playbooks, managing tech debt, architectural drift, and security patching becomes increasingly difficult. We need a systematic way to measure "entropy" (e.g., outdated dependencies, failing tests, or schema deviations) and prioritize corrective actions before they become unmanageable operational risks.

## Decision
We utilize the "RepoOS" subsystem to monitor Frontier Entropy and manage patch prioritization.

1.  **Frontier Entropy Monitor:** We have implemented a monitoring capability that observes the repository state. The formatting layer for this output is strictly isolated from the core detection logic.
2.  **Operator JSON Schema:** The `scripts/repoos/format-entropy-output.mjs` script transforms raw metrics into an operator-readable JSON schema.
3.  **CI Integration:** This subsystem generates a CI summary line, exposing entropy metrics to the deployment pipeline, ensuring that architectural degradation is surfaced immediately during the build process.

## Consequences

**Positive:**
-   **Quantitative Risk Assessment:** We can quantitatively measure repository drift and entropy over time.
-   **Separation of Concerns:** The core logic for detecting issues is decoupled from how the data is formatted and presented to operators or CI systems.
-   **Actionable Intelligence:** Operators receive structured JSON data outlining where the repository needs the most immediate attention (patching, refactoring).

**Negative:**
-   **Maintenance Overhead:** The RepoOS scripts and schemas require dedicated maintenance as new forms of entropy or repository components are introduced.
-   **Complexity:** Additional background monitoring increases the overall cognitive load required to understand the CI pipeline.
