# Summit Testing Strategy & Quality Gates

This document defines the comprehensive testing strategy for the Summit platform. Our goal is to ensure high velocity and confidence through reliable, layered automation.

## 1. The Test Pyramid

We subscribe to a practical test pyramid:

| Layer  | Type            | Scope                    | Responsibility                                                              | Speed |
| ------ | --------------- | ------------------------ | --------------------------------------------------------------------------- | ----- |
| **L1** | **Static**      | Lint, Types, Format      | Catch syntax & type errors immediately.                                     | < 30s |
| **L2** | **Unit**        | `*.test.ts`, `*.spec.ts` | Test isolated logic (classes, utils, algorithms). Mock all I/O.             | < 2m  |
| **L3** | **Integration** | `tests/integration/`     | Test component interactions (API + DB, Graph + Algo). Use test fixtures.    | < 5m  |
| **L4** | **E2E Smoke**   | `tests/e2e/smoke`        | Critical user flows via UI/API (Login, Create Investigation, Run Pipeline). | < 10m |
| **L5** | **E2E Full**    | `tests/e2e/full`         | Deep regression suites, edge cases, cross-browser.                          | 15m+  |

## 2. Testing Responsibilities

### Server (`server/`)

- **Unit:** Jest + `ts-jest`.
  - Focus: Domain logic, utility functions, graph algorithms, query builders.
  - Requirement: 80% coverage on core logic.
- **Integration:** Jest with `testcontainers` (Neo4j, Postgres).
  - Focus: GraphQL resolvers, Service layers, DB constraints.
  - Harness: Use `server/test/harness.ts` to spin up isolated test contexts.

### Web (`apps/web/`)

- **Unit/Component:** Vitest + React Testing Library.
  - Focus: Component rendering, hooks, state management (Zustand).
  - Requirement: Critical UI components must have tests.
- **E2E:** Playwright.
  - Focus: "Summit Console" user journeys.
  - Location: `e2e/`.

### Shared Packages (`packages/`)

- Each package is responsible for its own Unit tests.
- Integration tests usually live in `server` where they are consumed.

## 3. Fixtures & Test Data

We use a unified fixture system to ensure consistency across tests.

- **Location:** `server/test/fixtures/` & `packages/test-fixtures/`
- **Capabilities:**
  - `createTestTenant(variant)`: Provisions a tenant with known ID.
  - `seedGraph(tenantId, scenario)`: Injects a known subgraph (Person, Organization, Event).
  - `seedDocuments(tenantId)`: Injects sample documents for RAG.
  - `mockLlmProvider`: Deterministic LLM responses for "golden path" prompts.

## 4. Quality Gates & CI

Our CI pipeline (`.github/workflows/ci.yml`) enforces the following gates:

### Gate 1: Developer Local (Pre-commit)

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test:fast` (Unit tests)

### Gate 2: PR Verification (Required for Merge)

- **Static Analysis:** Lint & Typecheck.
- **Unit Tests:** All server & web unit tests.
- **Integration Core:** Fast integration tests using mocks/containers.
- **E2E Smoke:** Happy path verification (Maestro run, Graph explore).

### Gate 3: Nightly / Release

- **Full E2E:** Complete regression suite.
- **Security:** SBOM generation, Trivy scan.
- **Performance:** k6 benchmarks.

## 5. How to Run Tests

### Fast Feedback Loop (Dev)

```bash
# Run all unit tests
pnpm test:unit

# Run specific server test
cd server && npm test -- src/services/MyService.test.ts
```

### Integration Loop

```bash
# Run server integration tests (requires Docker)
pnpm test:integration
```

### E2E Smoke Loop

```bash
# Run smoke tests against local dev stack
pnpm test:e2e
```

## 6. Mocks & External Services

- **LLMs:** NEVER call real LLM APIs in CI. Use `MockLlmProvider` with recorded responses.
- **Neo4j/Postgres:** Use Dockerized instances (via `testcontainers` or `docker-compose`) for integration; mock drivers for unit tests.
- **Auth:** Bypass Auth0/OIDC in tests using `MockAuthService` or synthesized JWTs signed by a test secret.
