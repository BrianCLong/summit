# GitHub Actions Workflows

This document provides a catalog of the rationalized GitHub Actions workflows for the Summit repository. The original 250+ workflows have been consolidated to a streamlined, reusable, and maintainable structure to improve CI/CD velocity and reduce operational overhead.

## Guiding Principles

- **Consolidation over Proliferation**: Workflows are consolidated into logical groups. New CI logic should be added to existing workflows where possible.
- **Reusability**: Common tasks like environment setup and testing are encapsulated in reusable workflows (`./reusable/`).
- **Clarity and Convention**: Workflows are named clearly to indicate their purpose.
- **Golden Path Integrity**: Core workflows that protect the main branch are preserved and explicitly defined.

---

## 1. Core CI/CD Pipeline

These are the primary workflows that run on every pull request and push to `main`.

### `ci.yml`

This is the main, consolidated Continuous Integration (CI) workflow. It orchestrates the entire validation pipeline for the application.

**Key Stages:**

1.  **Setup**: Initializes the environment, installs dependencies, and restores caches using the `_reusable-setup.yml` workflow.
2.  **Lint**: Runs static code analysis to enforce code style and catch common errors.
3.  **Typecheck**: Performs TypeScript type checking to ensure type safety across the codebase.
4.  **Test Matrix**: Runs a parallel matrix of test suites using the `_reusable-test.yml` workflow:
    - `unit`: Fast-running unit tests.
    - `integration`: Tests requiring database and other service connections.
    - `e2e`: End-to-end tests using Playwright.

---

## 2. Required Branch Protection Workflows

These workflows are configured as **required status checks** in the branch protection rules for `main`. They must pass before any pull request can be merged. **Do not modify these files without careful consideration and approval.**

- **`ci-lint-and-unit.yml`**: Provides a fast feedback loop by running linting and unit tests.
- **`ci-golden-path.yml`**: Ensures the application's "golden path" is always functional. It runs `make bootstrap`, `make up`, and `make smoke`.
- **`security.yml`**: Performs critical security scans, including dependency scanning with Trivy, secret scanning with Gitleaks, and static application security testing (SAST).

---

## 3. Reusable Workflows

The `reusable/` directory contains modular, parameterized workflows that are called by other workflows. This avoids code duplication and centralizes common logic.

- **`_reusable-setup.yml`**: Handles checkout, Node.js/pnpm setup, dependency installation, and caching.
- **`_reusable-test.yml`**: A comprehensive test runner that can execute different types of tests (unit, integration, e2e) and manage services like PostgreSQL, Redis, and Neo4j.
- **Other `_reusable-*.yml` files**: Provide building blocks for CI, security, performance, and release tasks.

---

## 4. Archived Workflows

The `.archive/` directory contains over 200 legacy workflows that have been decommissioned during the rationalization sprint. These are kept for historical reference and can be used as a source for logic if needed in the future. They are not active and will not be triggered.
