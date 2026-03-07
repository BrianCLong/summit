# QA Automation Strategy (MVP3/GA+)

## Tier-0 Journeys

Tier-0 journeys are critical user flows that must work 100% of the time. Failure in these flows blocks release.

| ID       | Journey            | Description                                        | E2E Test                    | Contract Test    | Performance Test |
| :------- | :----------------- | :------------------------------------------------- | :-------------------------- | :--------------- | :--------------- |
| **J-01** | **Authentication** | Sign up, Log in, MFA, Reset Password.              | `e2e/auth.spec.ts`          | `auth-service`   | Login Latency    |
| **J-02** | **Graph Search**   | Search for entities, traverse graph, view details. | `e2e/search.spec.ts`        | `graph-service`  | Search Latency   |
| **J-03** | **Investigation**  | Create investigation, add entities, save.          | `e2e/investigation.spec.ts` | `case-service`   | -                |
| **J-04** | **Data Ingestion** | Upload CSV, map schema, ingest.                    | `e2e/ingest.spec.ts`        | `ingest-service` | Throughput       |
| **J-05** | **Export**         | Export report to PDF/CSV.                          | `e2e/export.spec.ts`        | `report-service` | -                |

## Testing Levels

### 1. Unit Tests (Pre-Merge)

- **Scope**: Individual functions/classes.
- **Metric**: >80% coverage on new code.
- **Tool**: Jest.

### 2. Integration/Contract Tests (Pre-Merge)

- **Scope**: Service-to-Service, Service-to-DB.
- **Requirement**: All internal APIs must have contract tests.
- **Tool**: Jest + Supertest (HTTP), Pact (Events).

### 3. E2E Smoke Tests (Post-Deploy/Release Gate)

- **Scope**: Tier-0 Journeys against a running environment.
- **Frequency**: On every deploy to Staging/Prod.
- **Tool**: Playwright.

### 4. Performance Tests (Nightly)

- **Scope**: Load testing hot paths (Login, Search).
- **Tool**: k6.
- **Budgets**:
  - p95 Latency < 500ms (APIs).
  - Error Rate < 0.1%.

## Flake Management

- **Quarantine**: Flaky tests are moved to a `@quarantine` grep tag and do not block PRs.
- **Fix-it Friday**: Weekly dedicated time to fix flaky tests.
- **Delete**: Tests in quarantine for > 2 weeks are deleted.

## Visual Regression

- **Scope**: Design System components and critical pages (Login, Dashboard).
- **Tool**: Playwright Visual Comparisons (`toHaveScreenshot`).
