# Testing Strategy & Tiers

This document defines the testing strategy for the IntelGraph platform (Server, Web, and Services). We adhere to a strict Test Pyramid to ensure meaningful coverage, fast feedback, and reliability.

## Test Tiers

### 1. Unit Tests (Tier 1)
*   **Scope**: Single function, class, or module in isolation.
*   **Dependencies**: All external dependencies (DB, Network, other services) MUST be mocked.
*   **Execution Time**: < 100ms per test file.
*   **Target Coverage**: 80% Line Coverage for new/changed code.
*   **Location**:
    *   **Server**: Colocated in `src/**/*.test.ts` or in `tests/` (root-level loose files).
    *   **Web**: Colocated in `src/**/*.test.tsx` or `src/__tests__/`.
*   **Command**:
    *   Server: `npm run test:unit`
    *   Web: `npm run test:unit`

### 2. Integration Tests (Tier 2)
*   **Scope**: Interaction between two or more modules (e.g., Service + DB, Route + Middleware).
*   **Dependencies**: Can use real DB (containerized), mocked external APIs.
*   **Execution Time**: < 5s per test file.
*   **Target Coverage**: 70% coverage of integration paths.
*   **Location**:
    *   **Server**: `tests/integration/` and `tests/api/`.
    *   **Web**: `src/test/integration/` (if applicable).
*   **Command**:
    *   Server: `npm run test:integration`

### 3. Contract Tests (Tier 3)
*   **Scope**: Validation of API schemas (GraphQL, REST) and Event contracts. Ensures producers don't break consumers.
*   **Dependencies**: Schema registries, Pact, or schema validation libraries.
*   **Target Coverage**: 100% of Public APIs and Shared Events.
*   **Location**:
    *   **Server**: `tests/contracts/`.
*   **Command**:
    *   Server: `npm run test:contract`

### 4. E2E Tests (Tier 4)
*   **Scope**: Full user journeys from frontend to backend to DB.
*   **Dependencies**: Full "prod-like" environment (Docker Compose).
*   **Execution Time**: Minutes.
*   **Target**: Critical user journeys (Revenue, Login, Core Workflows).
*   **Location**:
    *   **Server (Backend-only flows)**: `tests/e2e/`.
    *   **Full System**: `e2e/` (Root directory, using Playwright).
*   **Command**:
    *   Server: `npm run test:e2e`
    *   Root: `npm run e2e`

## Targets & Enforcement

| Tier | Coverage Target | Blocking? | Owner |
| :--- | :--- | :--- | :--- |
| Unit | 80% | Yes (CI) | Code Author |
| Integration | 70% | Yes (CI) | Code Author |
| Contract | 100% (APIs) | Yes (CI) | API Producer |
| E2E | Critical Paths | Yes (Release) | QA / Domain Lead |

## Golden Rules
1.  **Regression First**: Every bug fix must include a test case that reproduces the bug.
2.  **No Flakes**: Flaky tests are quarantined immediately.
3.  **Mock External**: Unit tests must never hit the network or disk (except for config).
