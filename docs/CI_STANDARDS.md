# CI Standards & Quality Gates

This document defines the official Continuous Integration (CI) process for the IntelGraph Summit platform.

## Philosophy

Our CI philosophy is **Fast, Strict, and Consolidated**.
- **Fast**: We use caching and parallel jobs to keep feedback loops short.
- **Strict**: We enforce high standards (type safety, linting, security, testing) on every PR.
- **Consolidated**: We rely on a single "Quality Gate" workflow rather than many fragmented checks.

## The Official Pipeline: `pr-quality-gate.yml`

All Pull Requests targeting `main` or `develop` must pass the **PR Quality Gate**. This workflow replaces previous ad-hoc checks.

### 1. Static Checks & Security (Parallel)
This is the "Fail Fast" stage. If your code is messy or insecure, we stop here.
- **Lint & Format**: Runs `pnpm run lint`. Ensures code style and best practices.
- **Typecheck**: Runs `pnpm run typecheck`. Ensures strict type safety across the monorepo.
- **Security Audit**: Runs `pnpm run security:audit`. Checks for known vulnerabilities in dependencies.
- **Security Lint**: Runs `pnpm run security:lint`. Static analysis for security patterns.

### 2. Unit Tests
- Runs `pnpm run test:jest`.
- Validates the logic of individual components in isolation.
- Includes both server-side and client-side unit tests.

### 3. Smoke Tests (The Golden Path)
This is the "End-to-End" verification.
- **Bootstrap**: Sets up the environment (`make bootstrap`).
- **Build**: Builds Docker images for API and Client.
- **Spin Up**: Starts the full stack (`make up`).
- **Smoke**: Executes `make smoke`, which runs critical path verifications (including Playwright E2E tests).

## How to Run Locally

You should simulate the CI checks locally before pushing.

```bash
# 1. Static Checks
pnpm lint
pnpm typecheck
pnpm security:scan

# 2. Unit Tests
pnpm test

# 3. Smoke Tests (Golden Path)
make bootstrap
make up
make smoke
```

## Troubleshooting CI Failures

- **Lint/Type Errors**: Fix the code. Do not suppress errors unless absolutely necessary (and documented).
- **Security Audit**: Update dependencies (`pnpm update`). If it's a false positive, add an exception to the audit configuration.
- **Smoke Tests**: Check the logs artifact or run `make smoke` locally to reproduce. Ensure your Docker environment is clean (`make down`).

## Workflow Maintenance

- **Adding Steps**: Only add steps to `pr-quality-gate.yml` if they are critical for *every* PR. Niche checks should be separate or run on a schedule.
- **Performance**: Monitor execution time. If a job exceeds 10 minutes, investigate optimization (caching, splitting).
