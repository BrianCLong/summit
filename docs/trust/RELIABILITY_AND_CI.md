# Reliability and Continuous Integration

The Summit platform's reliability is enforced through a comprehensive Continuous Integration (CI) pipeline that validates every change before it is merged into the `main` branch. This process ensures that the platform remains stable and that all changes meet our quality and governance standards.

## Continuous Integration Pipeline

Our CI pipeline, defined in ` .github/workflows/ci.yml`, is composed of several automated stages:

*   **Code Quality Checks:**
    *   **Formatting:** Ensures all code adheres to a consistent style (`pnpm format:check`).
    *   **Linting:** Analyzes code for stylistic errors and potential bugs (`pnpm lint`).

*   **Verification and Testing:**
    *   **Verification Suite:** Runs a fast, critical-path verification suite to catch common errors early (`pnpm verify`).
    *   **Unit and Integration Tests:** Executes a comprehensive test suite to validate the functionality of individual components and their interactions (`pnpm test:unit`, `pnpm test:integration`).
    *   **Golden Path Smoke Test:** Runs an end-to-end test of the system's core functionality in a containerized environment (`make smoke`).

*   **Build and Governance:**
    *   **Reproducible Build:** Verifies that the build process is deterministic, producing identical artifacts from the same source code.
    *   **Governance Checks:** Ensures that all changes comply with our internal governance policies, such as linking pull requests to approved issues.
    *   **Schema and API Checks:** Validates that there are no breaking changes to our GraphQL API schema.

## How to Run Fast Proof Locally

The most critical end-to-end verification suite is the "Golden Path" smoke test. This can be run locally to validate the core functionality of the platform.

To run the smoke test, execute the following command from the repository root:

```bash
make smoke
```
*Note: This requires Docker and `make` to be installed and configured on your local machine.*

## Known Limitations

For full transparency, we disclose the following known limitations in our current CI process:

*   **Non-Blocking Tests:** The `test`, `governance`, and `provenance` jobs in the CI pipeline are currently configured with `continue-on-error: true`. This means that failures in these jobs will not block a change from being merged. This is a temporary measure to allow for the resolution of underlying issues with our test infrastructure. The status of these tests is actively monitored, and this limitation is tracked in our internal risk ledger.
