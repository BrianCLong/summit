# As-Is Quality Map

## Overview
This document captures the state of testing in the Summit monorepo as of Oct 2025.

## Test Suites & Coverage

### Backend (`server/`)
- **Framework**: Jest, ts-jest.
- **Location**: `server/tests/`.
- **Existing Tests**:
  - `maestro/`: Minimal coverage (`core.test.ts`, `cost_meter.test.ts`).
  - `integration/`: Some API/Service integration tests (`ai-integration`, `graphql`, `monitoring`).
  - `services/`: Scattered unit tests.
- **Gaps**:
  - **Maestro**: Lack of comprehensive state machine and failure path tests.
  - **Ingestion**: No dedicated test suite found for full pipeline.
  - **Auth**: Limited to specific resolvers/socket tests.
  - **External API**: No contract tests found.

### Frontend (`apps/web/`)
- **Framework**: Vitest.
- **Location**: `apps/web/src/` (implied, no top-level `test` dir).
- **Existing Tests**:
  - Very limited visible test files in `src` listing.
  - `mocks/` directory exists, indicating some intent.

### E2E (`e2e/`)
- **Framework**: Playwright.
- **Location**: `e2e/`.
- **Status**: Contains `playwright.config.ts`. Tests need inventorying.

## CI Workflows
- Massive list of workflows in `.github/workflows/`.
- Key workflows: `ci.yml`, `server-ci.yml`, `client-ci.yml`.
- **Risk**: Complexity and potential redundancy.

## Critical Risks
1.  **Maestro Orchestration**: Core logic for running tasks has low visible coverage.
2.  **Ingestion Pipelines**: Data integrity relies on untested pipelines.
3.  **Release Confidence**: No clear "release candidate" gate that ties all these together.
