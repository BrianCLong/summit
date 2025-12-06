# Summit CI/CD Pipeline Blueprint

This document outlines the current state and the upgraded design of the Summit CI/CD pipeline.

## Current Gaps Identified

1.  **Broken Unit Tests**: The root `jest.config.cjs` was missing, causing the main `unit-tests` lane to fail.
2.  **Missing Frontend Tests**: `apps/web` (Modern Summit Client) and `client` (Legacy) use Vitest, but the main CI pipeline was only running Jest.
3.  **No True E2E**: The `golden-path` lane only runs a simple API smoke test (`make smoke`). Full browser automation (Playwright) was configured but never executed in CI.
4.  **No Deployment**: There was no automated deployment pipeline integrated into the main workflow or as a separate reliable delivery pipeline.
5.  **Security Gaps**: Secrets were hardcoded in the guardrails check.
6.  **Redundant Configs**: Multiple test scripts (`test:e2e`, `e2e`, `test:ci`) had confusing or overlapping purposes.

## Ideal Pipeline Architecture

The upgraded pipeline consolidates testing into clear lanes and adds a delivery stage.

### 1. Quality Lane (Fast)
- **Lint**: ESLint for all packages.
- **Typecheck**: TypeScript validation.
- **Security**: SBOM generation and Trivy scan.
- **Policy**: OPA policy checks.

### 2. Test Lane (Parallel)
- **Backend Unit**: Jest tests for `server` and `services` (Sharded).
- **Frontend Unit**: Vitest tests for `apps/web` and `client`.
- **Integration**: Jest integration tests.

### 3. Verification Lane (Heavy)
- **Golden Path Smoke**: Docker Compose up + API smoke script (validates wiring).
- **E2E**: Playwright tests running against the containerized stack.

### 4. Delivery Lane (Conditional)
- **Push to Registry**: Build and push Docker images (if on `main`).
- **Deploy**: Trigger deployment to Staging (mock/blueprint).

## Changes Made

1.  **Fixed Jest**: Created `jest.config.cjs` to enable the `unit-tests` lane.
2.  **Upgraded `ci.yml`**:
    - Renamed to reflect broader scope.
    - Added `frontend-tests` job to run Vitest.
    - Added `e2e-tests` job to run Playwright.
3.  **Created `deploy.yml`**: A blueprint for the CD process.
