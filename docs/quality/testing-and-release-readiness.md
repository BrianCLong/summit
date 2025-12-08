# Testing & Release Readiness Strategy

## Quality Mission
To ensure Summit works reliably by proving every meaningful behavior with automated tests, and making CI a reliable gate for release.

## Test Pyramid Strategy

We define four layers of testing:

### 1. Unit Tests (Fast, Isolated)
- **Scope**: Pure functions, classes, single services with mocked dependencies.
- **Speed**: < 100ms per test.
- **Location**: `*.test.ts` alongside source code or in `__tests__`.
- **When**: Runs on every PR.
- **Tools**: Jest (Backend), Vitest (Frontend).

### 2. Integration Tests (Real Dependencies)
- **Scope**: API endpoints, Database interactions, Service-to-Service flows.
- **Dependencies**: Real PostgreSQL (test DB), Real Neo4j (test DB/Mock), Mocked External APIs (OpenAI, Slack).
- **Location**: `server/tests/integration/` or `*.int.test.ts`.
- **When**: Runs on every PR (critical path) and Nightly (full suite).
- **Tools**: Jest + Supertest + TestContainers/Docker.

### 3. E2E Tests (User Journey)
- **Scope**: Critical user flows from the browser.
- **Dependencies**: Full stack running locally or in staging.
- **Location**: `e2e/`.
- **When**: Nightly, Pre-release.
- **Tools**: Playwright.

### 4. Contract & Compliance Tests
- **Scope**: API Schema (OpenAPI), Security Policies (OPA).
- **Location**: `server/tests/contracts/`.
- **When**: Pre-release.

## Shared Toolkit

To avoid duplication, we utilize shared test utilities:

- **`server/test-utils`**: Factories, DB setup/teardown, Auth headers.
- **`apps/web/test-utils`**: Render helpers, Mock providers.

## Domain Specific Strategies

### Maestro
- **Unit**: State transitions, planner logic.
- **Integration**: Create Run API -> DB State -> Event Emission.

### Ingestion
- **Unit**: Transform functions.
- **Integration**: Input File -> Pipeline Execution -> DB Record.

### Auth
- **Unit**: RBAC logic.
- **Integration**: Protected Routes reject invalid tokens.

## Release Readiness

A Release Candidate is **Ready** when:
1.  All Unit & Integration tests pass.
2.  Critical E2E journeys pass.
3.  No P0/P1 bugs.
4.  Migration dry-run succeeds.
5.  Evidence bundle is generated.
