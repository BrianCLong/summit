# CI Parity Runbook

This document provides a guide to running the full suite of CI checks locally. The goal is to ensure that any changes that pass locally will also pass in the CI environment, eliminating "works on my machine" issues.

## The "Green Contract"

The "Green Contract" is the agreement that the `main` branch must always be in a deployable state. This is enforced by a series of automated checks that run on every pull request. To ensure a smooth development process, it is highly recommended to run these checks locally before pushing changes.

## How to Run CI Checks Locally

The `ci:parity` script is the single source of truth for running all CI checks. It is a wrapper around the same commands that are executed in the CI pipeline.

To run the CI parity check, execute the following command from the root of the repository:

```bash
pnpm ci:parity
```

This will run the following checks in order:

1.  **Linting:** Checks for code style and formatting issues.
2.  **Type Checking:** Verifies the TypeScript types across the entire codebase.
3.  **Unit Tests:** Runs all unit tests.
4.  **Integration Tests:** Runs all integration tests.
5.  **E2E Tests:** Runs all end-to-end tests.

If any of these checks fail, the script will exit with a non-zero exit code, and the output will indicate the source of the failure.
