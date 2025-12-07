# Shared Test Infrastructure Design

To standardize testing across CompanyOS, we will build a shared `packages/testing-sdk` library. This reduces boilerplate and ensures consistent test isolation.

## 1. `packages/testing-sdk`

### Modules

#### `testing-sdk/factories`
*   **Purpose:** Typed data builders for domain entities. Avoids hardcoded JSON blobs in tests.
*   **Pattern:** Builder pattern or Factory.
*   **Example:**
    ```typescript
    const user = await UserFactory.create({
      role: 'ADMIN',
      tenantId: 'test-tenant-1'
    });
    ```

#### `testing-sdk/context`
*   **Purpose:** Standardized test isolation context.
*   **Features:**
    *   Generates unique `tenantId` per test run.
    *   Provides `requestContext` headers for Supertest.
    *   Handles database transaction rollback (if supported) or cleanup hooks.

#### `testing-sdk/mocks`
*   **Purpose:** Standard mocks for external services.
*   **Includes:**
    *   `MockRedis`: In-memory Redis simulation.
    *   `MockLogger`: Silent logger that captures logs for assertion.
    *   `MockEventBus`: In-memory capture of emitted events.

#### `testing-sdk/environment`
*   **Purpose:** Setup/Teardown logic for Integration tests.
*   **Features:**
    *   `TestContainers` wrappers for Postgres and Neo4j.
    *   Global Jest setup scripts to spin up containers once per suite.

## 2. CI/CD Pipeline Integration

### Local Execution
*   Developers run `pnpm test` (Unit) which uses local tooling.
*   Developers run `pnpm test:int` (Integration) which spins up Docker containers automatically via `testing-sdk/environment`.

### CI Execution (GitHub Actions)
*   **Sharding:** Jest tests are sharded across parallel runners to keep feedback < 5 mins.
*   **Caching:** `node_modules` and Docker layers are cached.
*   **Artifacts:** Test reports (JUnit XML) and Coverage reports (Lcov) are uploaded.

## 3. Contract Testing Infrastructure

### Provider (Server)
*   Generates `openapi.json` from code/models.
*   Runs "Contract Verification" tests that validate implementation against the schema.

### Consumer (Client)
*   Uses `msw` (Mock Service Worker) initialized with handlers generated from the Provider's OpenAPI spec.
*   This ensures the Client tests against the *actual* API shape.

## 4. Test Data Strategy

*   **Seeding:**
    *   **Static Data:** (Roles, Permissions, Geo Data) - Seeded via migration scripts.
    *   **Test Data:** (Users, Transactions) - Created dynamically via `Factories` within the test.
*   **Cleanup:**
    *   **Unit:** No cleanup needed.
    *   **Integration:** Transaction rollback preferred; otherwise `TRUNCATE` tables between tests.
