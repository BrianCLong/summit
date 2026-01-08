# Assessor Walkthrough

This document provides a step-by-step guide for external assessors to perform a technical review of the Summit repository. Following these instructions will ensure a consistent and reproducible evaluation of the codebase.

## 1. Environment Setup

A clean and consistent environment is crucial for a reliable assessment.

### Prerequisites

- **Node.js:** Version `18.18` or higher.
- **pnpm:** Version `10.0.0`.
- **Git:** Standard command-line Git installation.

### Verification

Before proceeding, run the pre-flight environment validation script to ensure all prerequisites are met:

```bash
./scripts/validate-env.sh
```

If the script reports any failures, please resolve them before continuing.

## 2. Dependency Installation

This project uses `pnpm` for workspace and dependency management.

To install all required dependencies for the monorepo, run the following command from the repository root:

```bash
pnpm install
```

This command will install all dependencies listed in the `pnpm-lock.yaml` file, ensuring a deterministic set of packages.

## 3. Code Quality and Linting

We enforce code quality standards using ESLint and Prettier.

To run the linter and check for any code style violations, execute:

```bash
pnpm run lint
```

A successful run will exit with a code of `0`. Any other exit code indicates linting errors that should be addressed.

## 4. Running Tests

The repository contains a comprehensive test suite, including unit, integration, and end-to-end tests.

### Full Test Suite

To execute the entire test suite for all packages, run:

```bash
pnpm test
```

**Note:** The full test suite can be time-consuming. For a faster, targeted assessment, see the "Evidence Sampling" section.

### Test Reports

Test reports are generated in JUnit XML format and can be found in the `reports/` directory at the root of each package (e.g., `server/reports/`).

## 5. Building the Application

The final step is to perform a full production build of all applications and packages.

```bash
pnpm run build
```

This command will compile all TypeScript code, bundle frontend assets, and prepare the application for deployment. Build artifacts are typically located in the `dist/` or `build/` directory within each package.

---

This concludes the technical walkthrough. All commands should be run from the root of the repository. If you encounter any issues, please refer to the main `README.md` or contact the engineering team.
