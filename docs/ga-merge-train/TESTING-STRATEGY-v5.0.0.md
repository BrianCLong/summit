# Testing Strategy — IntelGraph v5.0.0

## Overview

This document defines the testing strategy for the v5.0.0 GA release. It covers six testing layers, each with clear SLO targets, execution ownership, and evidence requirements.

## Test Pyramid

```
                 ╭──────────╮
                 │  E2E (5) │  ← Playwright golden path
                ╱────────────╲
               │ Contract (4) │ ← Pact provider/consumer
              ╱────────────────╲
             │ Integration (30+)│ ← TestContainers (Neo4j, PG, Redis)
            ╱────────────────────╲
           │    Unit (500+)       │ ← Jest (business logic, transforms)
          ╱────────────────────────╲
         │    Static Analysis       │ ← ESLint, ruff, mypy, TypeScript
        ╰────────────────────────────╯
```

## 1. Unit Tests

**Tool:** Jest with @swc/jest transformer
**Config:** `jest.config.cjs` (root), 100+ service-specific configs
**Execution:** `pnpm test` (serial) or `pnpm jest --runInBand`
**Time budget:** < 5 minutes

### Coverage Thresholds

| Scope | Lines | Branches | Functions | Statements |
|-------|-------|----------|-----------|------------|
| Global | 80% | 70% | 80% | 80% |
| `src/services/` | 90% | 90% | 90% | 90% |
| `middleware/` | 85% | 85% | 85% | 85% |

### Security-Critical Tests

New in v5.0.0 — tests for the 6 highest-risk areas identified in the injection audit:

| Test File | Coverage Area | Tests |
|-----------|--------------|-------|
| `tests/unit/security-critical.test.ts` | HMAC signature verification | 5 |
| | Cypher injection guards | 4 |
| | HTML sanitization (XSS) | 5 |
| | Command injection guard | 2 |
| | Prototype pollution guard | 3 |
| | SSRF URL validation | 4 |
| `libs/provenance/tests/provenance.test.ts` | Hash chain, tamper detection, round-trip | 11 |

**Run:** `npx tsx tests/unit/security-critical.test.ts`

### Existing Test Suites

- `server/tests/` — Server-side business logic (auth, services, resolvers)
- `client/tests/` — React component tests (Jest + @testing-library/react)
- `packages/*/tests/` — Package-level tests (prov-ledger, data-integrity, etc.)
- `services/*/tests/` — Service-specific tests (er-service, graph-core, etc.)

## 2. Integration Tests

**Tool:** Jest + TestContainers (when Docker available)
**Config:** Service-specific jest configs with `testMatch: ['**/integration/**']`
**Execution:** `pnpm test:integration`
**Time budget:** < 5 minutes

### TestContainers Setup

| Service | Image | Port | Purpose |
|---------|-------|------|---------|
| Neo4j | `neo4j:5-community` | 7687 | Graph queries, Cypher validation |
| PostgreSQL | `postgres:16-alpine` | 5432 | SQL queries, schema validation |
| Redis | `redis:7-alpine` | 6379 | Cache operations, rate limiting |

### Key Integration Scenarios

1. **Neo4j Cypher execution** — parameterized queries, relationship traversal
2. **PostgreSQL CRUD** — identifier escaping, parameterized INTERVALs
3. **Redis cache** — key isolation, TTL behavior, nonce dedup
4. **Kafka produce/consume** — message serialization, offset management

## 3. Contract Tests

**Tool:** Pact (consumer-driven contracts)
**Config:** `tests/contract/pact/`
**Execution:** `pnpm test:contract`

### Contract Matrix

| Consumer | Provider | Contract File |
|----------|----------|---------------|
| CompanyOS | MaestroConductor | `pact/pacts/companyos-maestroconductor.json` |
| LAC Gateway | API | `packages/contracts/lac.gateway.pact.json` |
| Prov Ledger | Gateway | `packages/contracts/prov-ledger.gateway.pact.json` |

### GraphQL Schema Contracts

- Schema snapshots for breaking change detection
- Field deprecation tracking
- Type compatibility validation

## 4. E2E Tests

**Tool:** Playwright (Chromium, Firefox, WebKit)
**Config:** `playwright.config.ts` (root) + 12 service-specific configs
**Execution:** `pnpm test:e2e`
**Time budget:** < 10 minutes

### Golden Path Test

File: `e2e/golden-path/` — validates the core user journey:

1. Login → Dashboard
2. Create Investigation
3. Add Entities (Person, Organization, Location)
4. Discover Relationships
5. View Graph Visualization
6. Query Copilot
7. Export Results

### Cross-Browser Matrix

| Browser | Viewport | Status |
|---------|----------|--------|
| Chromium | 1280x720 | Primary |
| Firefox | 1280x720 | Secondary |
| WebKit | 1280x720 | Secondary |

### Configuration

- **Retries:** 2 on failure
- **Traces:** Captured on failure
- **Screenshots:** On failure
- **Videos:** On failure
- **Timeout:** 60s per test

## 5. Load Tests

**Tool:** k6
**Config:** `tests/load/package.json`
**Execution:** See profiles below

### Load Test Profiles

| Profile | VUs | Duration | Use Case |
|---------|-----|----------|----------|
| Smoke | 1 | 30s | Quick validation |
| CI | 10 | 60s | PR gate |
| Standard | 50 | 5min | Release gate |
| Production | 100 | 10min | Pre-deploy |
| Soak | 20 | 4hr | Stability |
| Capacity | Ramp to 500 | 30min | Capacity planning |

### SLO Thresholds

| Metric | Target | k6 Threshold |
|--------|--------|-------------|
| Read p95 | ≤ 350ms | `http_req_duration{type:read}:p(95)<350` |
| Read p99 | ≤ 900ms | `http_req_duration{type:read}:p(99)<900` |
| Write p95 | ≤ 700ms | `http_req_duration{type:write}:p(95)<700` |
| Write p99 | ≤ 1500ms | `http_req_duration{type:write}:p(99)<1500` |
| Error rate | < 1% | `errors:rate<0.01` |

### Load Test Scripts

| Script | Target |
|--------|--------|
| `maestro-load-test.js` | Maestro orchestration API |
| `graphql_read_p95.js` | GraphQL read query latency |
| `safe-mutations.k6.js` | Write mutation throughput |
| `tenant-graph-slo.js` | Per-tenant SLO validation |
| `soak-test.js` | Long-duration stability |
| `capacity-planning.js` | Max capacity discovery |

## 6. Chaos Engineering

**Tool:** Chaos Mesh (Kubernetes)
**Config:** `tests/chaos/chaos-experiments.yaml`
**Execution:** Scheduled monthly + on-demand

### Chaos Experiments (14 defined)

| Category | Experiment | Duration | Expected Behavior |
|----------|-----------|----------|-------------------|
| Pod Kill | API pod kill | 5min | Circuit breaker, auto-restart |
| Pod Kill | PostgreSQL pod kill | 5min | Connection pool retry, no data loss |
| Pod Kill | Neo4j pod kill | 5min | Read-replica fallback |
| Network | API↔PostgreSQL partition | 3min | Graceful degradation |
| Network | API↔Neo4j partition | 3min | Cache-only mode |
| Network | 500ms latency to Neo4j | 5min | Timeout handling |
| Network | 10% packet loss on API | 5min | Retry logic works |
| Resource | CPU stress (80%) | 5min | Queue backpressure |
| Resource | Memory stress (1GB) | 5min | OOM handling |
| Storage | PG I/O latency (100ms) | 5min | Query timeout handling |
| DNS | DNS failure | 3min | Cached resolution |
| Time | Clock skew (±2h) | 5min | Token validation tolerance |

### Recovery Metrics

| Metric | Target |
|--------|--------|
| RTO (Recovery Time Objective) | < 60 seconds |
| RPO (Recovery Point Objective) | 0 (no data loss) |
| Circuit breaker engagement | < 5 seconds |

## Golden Path Test Dataset

**Location:** `data/test-fixtures/golden-path-dataset.json`

Contains representative data for the complete investigation workflow:
- 1 Investigation (Operation Nightfall)
- 5 Entities (2 Persons, 1 Organization, 1 Location, 1 Event)
- 6 Relationships (DIRECTS, EMPLOYED_BY, LOCATED_AT, INITIATED, RECEIVED_BY, ASSOCIATES_WITH)
- 3 Provenance records
- 2 Copilot queries with expected results
- Graph metrics for validation

## CI/CD Integration

### PR Gate (runs on every PR)

```
pnpm lint                    → ESLint (0 errors)
pnpm test:quick             → Sanity check
pnpm build:server           → TypeScript compile
pnpm test                   → Jest unit tests
pnpm test:contract          → Pact contracts
tests/load (CI profile)     → 10 VUs × 60s
```

### Release Gate (runs on release branches)

```
All PR Gate checks           +
pnpm test:e2e               → Playwright golden path
tests/load (Standard)       → 50 VUs × 5min
npx tsx tests/unit/security-critical.test.ts → Security tests
npx tsx libs/provenance/tests/provenance.test.ts → Provenance tests
ruff check . && mypy src/   → Python checks
```

### Nightly (scheduled)

```
tests/load (Soak)           → 4-hour soak
tests/chaos (monthly drill) → Chaos experiments
Coverage report generation
```

## Test Execution Guide

### Running All Tests

```bash
# Quick validation (< 1 min)
pnpm test:quick && pnpm lint

# Full unit suite (< 5 min)
pnpm test

# Security-critical tests
npx tsx tests/unit/security-critical.test.ts
npx tsx libs/provenance/tests/provenance.test.ts

# E2E (requires running services)
pnpm test:e2e

# Load test (CI profile)
cd tests/load && npm run test:load:ci

# Full GA gate (lint + test)
make ga
```

### Writing New Tests

1. **Unit tests:** Place in `tests/unit/` or adjacent to source as `*.test.ts`
2. **Integration tests:** Place in `tests/integration/` with TestContainers
3. **E2E tests:** Place in `e2e/` with Playwright
4. **Load tests:** Place in `tests/load/` as k6 scripts
5. Use test builders from `tests/helpers/test-utils.ts`

### Test Data

- Use builders (`buildEntity()`, `buildRelationship()`, etc.) for dynamic data
- Use `data/test-fixtures/golden-path-dataset.json` for golden path validation
- Never use production data in tests
- All test data must be PII-free

## Evidence Requirements (S-AOS)

Every test run must produce verifiable evidence:

| Artifact | Format | Location |
|----------|--------|----------|
| Unit test results | JUnit XML | `reports/junit/` |
| Coverage report | JSON + LCOV | `reports/coverage/` |
| E2E results | HTML report | `reports/playwright/` |
| Load test results | k6 JSON | `reports/load/` |
| Security test results | Console output | `evidence/security/` |
| Provenance test results | Console output | `evidence/provenance/` |

## Current Status (v5.0.0-rc.1)

| Gate | Status | Notes |
|------|--------|-------|
| ESLint | PASS | 0 errors, 182 warnings |
| ruff | PASS | 0 errors |
| mypy | PASS | 0 errors |
| pnpm test:quick | PASS | Sanity check |
| pnpm build:server | PASS | Warnings only |
| Security unit tests | PASS | 23/23 |
| Provenance tests | PASS | 11/11 |
| E2E (Playwright) | BLOCKED | Requires running Docker stack |
| Load tests (k6) | BLOCKED | Requires running services |
| Chaos experiments | BLOCKED | Requires Kubernetes cluster |
