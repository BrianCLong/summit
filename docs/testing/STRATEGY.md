# CompanyOS Testing Strategy v0

**Mission:** High confidence with minimal ceremony—tests are fast, meaningful, and impossible to ignore.

## The Testing Pyramid

We adhere to a standard testing pyramid to ensure rapid feedback and robust coverage.

### 1. Unit Tests (L1) - Base
*   **Scope:** Single function, class, or module in isolation.
*   **Dependencies:** All external I/O (Database, Redis, API) must be **mocked**.
*   **Speed:** < 10ms per test case.
*   **Tooling:** Jest (Server), Vitest (Client).
*   **Requirement:** ~70% of total test count.

### 2. Integration Tests (L2) - Middle
*   **Scope:** Interactions between a service and its immediate dependencies (DB, Cache) or between internal modules.
*   **Dependencies:** Real ephemeral instances (via Docker/Testcontainers) for DB/Redis. External 3rd party APIs are **mocked** (Nock/MSW).
*   **Speed:** < 500ms per test case.
*   **Tooling:** Jest + Testcontainers.
*   **Requirement:** ~20% of total test count. Focus on critical data paths.

### 3. Contract Tests (L3) - Service Boundaries
*   **Scope:** API boundaries between Services (Producer) and Clients (Consumer).
*   **Goal:** Ensure API changes don't break consumers without deploying full environments.
*   **Tooling:** Pact (planned) or Schema Validation (Zod/OpenAPI strict checks).
*   **Requirement:** Critical for all inter-service communication.

### 4. E2E Tests (L4) - Top
*   **Scope:** Full user journeys across the deployed stack.
*   **Dependencies:** Full environment (Dev/Staging).
*   **Speed:** Seconds to minutes.
*   **Tooling:** Playwright.
*   **Requirement:** ~10% of total test count. "Golden Path" only.

### 5. Synthetic Monitoring (L5) - Production
*   **Scope:** Periodic health checks in Production.
*   **Goal:** Verify uptime and basic correctness in the wild.
*   **Tooling:** K6 / Datadog Synthetics / Custom Probes.

---

## Standards by Service Type

### API Services (e.g., `intelgraph-server`)
*   **Unit:** Business logic (Services, Utils).
*   **Integration:** Repository layer (Real DB), API Controllers (Supertest + Real DB + Mocked Auth).
*   **Contract:** OpenAPI schema validation.
*   **Coverage Target:** 80% Line Coverage (enforced on new code).

### Data Pipelines / Workers (e.g., `ingestion-service`)
*   **Unit:** Transformation logic, Parsers.
*   **Integration:**
    *   Job Producer -> Queue (Mocked).
    *   Job Consumer -> Processing -> DB (Real DB).
*   **Critical:** Idempotency tests (run job twice, expect same result).

### UI Applications (e.g., `apps/web`)
*   **Unit:** Hooks, Utility functions.
*   **Component:** Visual components (Storybook tests), Interaction tests (Testing Library).
*   **E2E:** Critical user flows (Login -> View Dashboard -> Create Item).
*   **Snapshot:** Use sparingly (e.g., for regressions on complex visualizations).

---

## Minimum "Critical Path" Expectations

Every service must test its **Critical Path**: the core functionality that, if broken, renders the service useless.

*   **API:** `Health Check` + `Auth` + `Primary CRUD Resource`.
*   **Worker:** `Job Acceptance` + `Successful Processing` + `Error Handling` (Dead Letter Queue).
*   **UI:** `Render Landing Page` + `Login Flow`.

## Coverage Policy

*   **Global Target:** 70%
*   **Critical Modules (Security/Billing):** 90%
*   **Legacy Code:** No regression allowed. New code must meet target.
