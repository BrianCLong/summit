# Summit — General Availability Specification (v1.0)

> **Status**: CANDIDATE — pending Release Captain sign-off
> **Platform version**: intelgraph-platform 4.1.15
> **Date**: 2026-03-10
> **Authority**: Release Captain, Governance Council
> **Branch**: `claude/draft-summit-ga-spec-dYJxa`

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Scope and Boundaries](#2-scope-and-boundaries)
3. [Architecture Overview](#3-architecture-overview)
4. [Component Inventory](#4-component-inventory)
5. [GA Definition (What Done Means)](#5-ga-definition-what-done-means)
6. [SLOs and SLIs](#6-slos-and-slis)
7. [CI Gate Catalog](#7-ci-gate-catalog)
8. [Security and Governance Controls](#8-security-and-governance-controls)
9. [Trust Boundaries](#9-trust-boundaries)
10. [Observability Baseline](#10-observability-baseline)
11. [Verification Protocol](#11-verification-protocol)
12. [Feature Flag Registry](#12-feature-flag-registry)
13. [Known Limitations and Constraints](#13-known-limitations-and-constraints)
14. [Release Evidence Bundle](#14-release-evidence-bundle)
15. [Runbook Index](#15-runbook-index)
16. [Signoff Record](#16-signoff-record)

---

## 1. Executive Summary

Summit is an **open-source agentic OSINT platform** that enables autonomous intelligence gathering, graph-based link analysis, and evidence-grade outputs. Version 4.1.15 is the GA candidate.

### What GA Certifies

| Dimension | Claim |
|-----------|-------|
| **Credible** | All platform claims are backed by automated, machine-readable evidence |
| **Defensible** | Security posture is provable via documented controls and scan artifacts |
| **Auditable** | Every governance decision has an immutable, cryptographically anchored trail |
| **Governed** | Agent autonomy has explicit, OPA-enforced policy boundaries |
| **Deterministic** | Builds and test results are reproducible across environments |
| **Operable** | On-call engineers can diagnose and recover from any listed failure mode |

### What GA Does NOT Certify

- Feature completeness — GA is reliability and trust, not a full roadmap
- Certification under FedRAMP High or CJIS without a customer-specific ATO process
- GDPR compliance without a Data Processing Agreement with specific tenant configuration
- Performance beyond documented SLO envelopes under unbounded load

---

## 2. Scope and Boundaries

### 2.1 In-Scope Components

| Component | Repo Path | Version | Role |
|-----------|-----------|---------|------|
| API Server | `server/` | 4.1.4 | GraphQL + REST API surface |
| Web Client | `client/` | 4.2.4 | Primary operator UI |
| API Gateway | `apps/gateway/`, `services/api-gateway/` | — | Routing, rate limiting, auth enforcement |
| IntelGraph (Neo4j) | `server/src/db/` | driver 5.28.2 / Neo4j 5.x | Graph data model |
| PostgreSQL | `server/src/db/migrations/` | 16-alpine | Relational operational data |
| Redis | — | 7-alpine | Distributed cache, BullMQ queues |
| Provenance Ledger | `packages/prov-ledger/`, `services/prov-ledger/` | — | Immutable audit trail |
| Maestro Conductor | `packages/maestro-core/`, `packages/maestro-sdk/` | — | Agent orchestration / Job DAGs |
| Switchboard (Ingest) | `server/src/` (ingest routes) | — | Multi-source data ingestion |
| GraphRAG | `packages/graphrag-core/`, `services/graphrag/` | — | Semantic graph retrieval |
| Policy Engine | `policies/` | OPA 0.x | Default-deny governance |
| Observability | `server/src/observability/` | OTel 1.x | Traces, metrics, logs |

### 2.2 Out-of-Scope at GA

- Rust services (listed in `Cargo.toml` but not production-shipped in 4.1.15)
- `apps/compliance-console/` — internal tooling, not customer-facing
- Air-gapped deployment variant (`AIR_GAP_DEPLOY_V1_README.md`) — separate release track
- Python ML workers beyond what is wired into the Docker Compose stack
- `packages/agent-gym/` — testing harness only, not a shipped runtime

### 2.3 Deployment Targets

| Mode | Config | Notes |
|------|--------|-------|
| Docker Compose (14 services) | `docker-compose.yml` | Dev / evaluation only |
| Kubernetes (Helm) | `apps/`, Helm values | Production target |
| Single-node (demo) | `docker-compose.yml` + seed data | Evaluation / sales |

---

## 3. Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│  CLIENT APPLICATIONS                                                 │
│  React 18 / Vite 7 / Apollo Client 3 / Cytoscape.js / MUI 7        │
└────────────────────────────┬─────────────────────────────────────────┘
                             │ HTTPS / WSS
                             ▼
┌──────────────────────────────────────────────────────────────────────┐
│  API GATEWAY                                                         │
│  OIDC/JWT validation · Rate limiting (Rego) · Request routing        │
│  CORS / Helmet hardening · TLS 1.2+ / HSTS                          │
└────────────┬───────────────────────────────────────────┬─────────────┘
             │ REST / GraphQL                             │ WebSocket
             ▼                                           ▼
┌────────────────────────────────────────┐  ┌───────────────────────────┐
│  SERVER (Node.js 22 / Express 4)       │  │  Socket.io Real-time Bus  │
│  Apollo Server 3 · BullMQ · Pino       │  └───────────────────────────┘
│  OPA ABAC middleware · Tenant guard    │
│  Admission control · PII guard         │
└───────────┬────────────────────────────┘
            │
   ┌────────┴────────────────────────────────┐
   │                                         │
   ▼                                         ▼
┌──────────────────────────┐   ┌─────────────────────────────────────┐
│  MAESTRO CONDUCTOR       │   │  POLICY ENGINE (OPA)                │
│  Job DAGs · Retry        │   │  mvp4_governance.rego               │
│  Skill packs · ABAC      │   │  abac_tenant_isolation.rego         │
│  State: QUEUED→SUCCEEDED │   │  approvals.rego · rate_limit.rego   │
└──────────────────────────┘   └─────────────────────────────────────┘
            │
   ┌────────┴────────────────────────────────┐
   │                 DATA LAYER              │
   ▼                                         ▼
┌──────────────────┐  ┌──────────────┐  ┌──────────────────────────────┐
│  Neo4j 5.x       │  │  PostgreSQL  │  │  Redis 7                     │
│  (IntelGraph)    │  │  16-alpine   │  │  (Cache + BullMQ queues)     │
│  Cypher queries  │  │  Migrations  │  │  Tenant-namespaced keys      │
│  Multi-tenant    │  │  RBAC tables │  └──────────────────────────────┘
│  graph isolation │  │  Audit logs  │
└──────────────────┘  └──────────────┘
            │
   ┌────────┴────────┐
   ▼                 ▼
┌──────────────┐  ┌──────────────────────────────────────────────────┐
│  Kafka       │  │  PROVENANCE LEDGER                               │
│  (Streaming) │  │  Append-only · Cryptographic signing            │
│  Switchboard │  │  packages/prov-ledger/ · services/prov-ledger/  │
│  Ingest bus  │  └──────────────────────────────────────────────────┘
└──────────────┘
```

### 3.1 Network Trust Levels

See §9 for full trust boundary specification. Summary:

| Level | Zone | Enforcement |
|-------|------|-------------|
| 0 | Public Internet | TLS + WAF |
| 1 | DMZ | JWT validation |
| 2 | API Gateway | Policy evaluation |
| 3 | Governance Layer | Service identity (SPIFFE) |
| 4 | Application Services | mTLS + RBAC |
| 5 | Data Layer | DB auth + encryption at rest |
| 6 | Admin Zone | MFA + VPN + break-glass |

---

## 4. Component Inventory

### 4.1 Runtime Dependencies (production-critical)

| Package | Version | Purpose |
|---------|---------|---------|
| `express` | 4.21.2 | HTTP server framework |
| `apollo-server-express` | 3.13.0 | GraphQL server |
| `graphql` | 16.12.0 | Query engine |
| `neo4j-driver` | 5.28.2 | Graph DB client |
| `pg` | — | PostgreSQL client |
| `ioredis` | — | Redis client |
| `bullmq` | — | Job queue (Redis-backed) |
| `kafkajs` | — | Kafka producer/consumer |
| `socket.io` | — | WebSocket server |
| `@opentelemetry/*` | 1.x | Distributed telemetry |
| `prom-client` | — | Prometheus metrics exporter |
| `pino` + `pino-http` | — | Structured JSON logging |
| `helmet` | — | HTTP security headers |
| `node-fetch` | — | HTTP client (internal calls) |

### 4.2 Frontend (client-critical)

| Package | Version | Purpose |
|---------|---------|---------|
| `react` | 18.3.1 | UI framework |
| `vite` | 7.2.6 | Build tool |
| `@apollo/client` | 3.13.9 | GraphQL client + cache |
| `@mui/material` | 7.3.6 | Component library |
| `cytoscape` | — | Graph visualization |
| `@reduxjs/toolkit` | — | Global state |
| `zustand` | — | Local component state |
| `react-hook-form` | — | Form management |
| `leaflet` | — | Geo map rendering |
| `d3` | — | Data visualization |
| `recharts` | — | Chart components |

### 4.3 Infrastructure Services

| Service | Image | Port(s) | Purpose |
|---------|-------|---------|---------|
| `neo4j` | neo4j:2025.01 | 7474, 7687 | Graph database |
| `postgres` | postgres:16-alpine | 5432 | Relational DB |
| `redis` | redis:7-alpine | 6379 | Cache + queues |
| `kafka` + `zookeeper` | confluent/* | 9092 | Event streaming |
| `prometheus` | prom/prometheus | 9090 | Metrics collection |
| `grafana` | grafana/grafana | 3000 | Dashboards |
| `server` | chainguard/node | 4000 | API server |
| `client` | nginx | 80 | Static frontend |
| `api-gateway` | — | 8080 | Edge routing |
| `prov-ledger` | — | — | Provenance service |
| `policy-lac` | openpolicyagent/opa | 8181 | OPA policy server |
| `nl2cypher` | — | — | NL-to-Cypher AI |
| `graphrag` | — | — | GraphRAG pipeline |

### 4.4 Build Toolchain

| Tool | Version | Role |
|------|---------|------|
| Node.js | 22+ | Runtime |
| pnpm | 10.0.0 | Package manager |
| Turbo | — | Monorepo build orchestration |
| TypeScript | 5.7.3 | Type system |
| Vite | 7.2.6 | Frontend bundler |
| Jest | — | Server-side unit testing |
| Playwright | — | E2E testing |
| Testcontainers | — | Integration tests with real DBs |
| k6 | — | Load testing |
| ESLint | — | JS/TS linting |
| Ruff + Black + MyPy | — | Python linting/formatting/types |

---

## 5. GA Definition (What Done Means)

This section is **immutable** after Release Captain ratification. Derived from `docs/ga/GA_DEFINITION.md`.

### 5.1 Required Platform Capabilities

| Capability | Specification | Primary Code Path | Verification |
|-----------|--------------|-------------------|-------------|
| **Authentication** | OIDC/JWT with refresh + revocation | `server/src/middleware/auth.ts:ensureAuthenticated()` | `pnpm verify` + `make smoke` |
| **Authorization (RBAC+ABAC)** | Tenant-isolated, role hierarchy, OPA-enforced | `server/src/middleware/opa-abac.ts` | `opa test policies/ -v` |
| **Rate Limiting** | Per-tenant, per-endpoint, circuit breaker | `policies/rate_limit.rego`, gateway config | Gate: `rate-001` |
| **Provenance Tracking** | Append-only, cryptographically signed audit ledger | `packages/prov-ledger/` | `./scripts/verify_provenance.ts` |
| **Approval Workflows** | Human-in-the-loop for high-risk ops | `policies/approvals.rego`, `server/routes/approvals/` | `opa test policies/ -v` |
| **Policy Engine** | Default-deny OPA, 100% mutation coverage | `policies/mvp4_governance.rego` | `opa check policies/` |
| **GraphQL API** | Apollo 3 with field-level auth directives | `server/src/graphql/` | Integration tests |
| **Graph Intelligence** | Multi-hop Cypher queries, tenant-isolated | `server/src/db/` (Neo4j driver) | Integration tests |
| **Ingestion** | Switchboard multi-source (CSV, REST, S3, Kafka, Webhook) | `server/src/` ingest routes | Connector-verify gate |
| **Observability** | 4 golden signals, OTel traces, structured logs | `server/src/observability/` | `obs-verify` gate |
| **Health Checks** | Liveness + readiness at `/healthz`, `/readyz` | `server/src/routes/health.ts` (implied) | `make smoke` |
| **Accessibility** | WCAG 2.1 AA keyboard navigation | `client/src/` | `pnpm test:a11y-gate` |

### 5.2 Security Baseline (Non-Negotiable)

Authoritative source: `docs/ga/SECURITY_BASELINE.md`

| Control | Implementation | Verification Command |
|---------|----------------|---------------------|
| No secrets in code | Gitleaks scan on every commit | `gitleaks detect --no-git` |
| Dependencies pinned | No `^`/`~` for prod deps | CI: `[SEC-002]` |
| No critical CVEs | Trivy + `pnpm audit` | `pnpm audit --audit-level critical` |
| Container signatures | Cosign verification of base images | `cosign verify --key cosign.pub <img>` |
| All non-public routes authenticated | `ensureAuthenticated` coverage | `verify-auth-coverage` |
| GraphQL mutations require auth | `authMiddleware` on resolvers | `verify-graphql-shield` |
| Tenant isolation enforced | `tenantId` in all multi-tenant queries | `[AUTH-003]` CI gate |
| No PII in demo/seed data | Data scan of `demo/`, `seed/` | `[DEMO-001]` CI gate |
| PII fields tagged | `@pii` directive on schema fields | `[DATA-001]` CI gate |
| Commits signed | GPG/SSH commit signatures | `[PROV-002]` CI gate |
| Rate limits defined | Entry in `rate-limits.yaml` per endpoint | `[RATE-001]` CI gate |
| HTTPS enforced | TLS 1.2+, HSTS headers | `make smoke` |

### 5.3 Evidence Requirements

All evidence must be **automatable**. Manual evidence is invalid.

| Category | Required Artifact | Generated By | Location |
|----------|------------------|-------------|---------|
| Build provenance | SBOM (CycloneDX) | `./scripts/generate-sbom.sh` | `artifacts/sbom.json` |
| SLSA provenance | Provenance attestation | CI release workflow | `artifacts/provenance.json` |
| Security | Gitleaks report | `gitleaks detect --no-git` | CI artifacts |
| Security | Trivy scan report | `trivy image` | CI artifacts |
| Security | `pnpm audit` report | CI gate | CI artifacts |
| Policy | OPA test results | `opa test policies/ -v` | CI artifacts |
| Accessibility | axe artifact | `pnpm test:a11y-gate` | `reports/a11y-keyboard/` |
| Performance | k6 load test results | `make perf` | `test/perf/results/` |
| Compliance | Transparency report | `./scripts/generate-transparency-report.ts` | `evidence/` |
| Integration | Test results (pass/fail) | `pnpm test:integration` | CI artifacts |
| Golden path | E2E trace | `pnpm test:e2e` | Playwright reports |

### 5.4 Definition of "Done" Per Change Type

| Change Type | Minimum Evidence |
|-------------|-----------------|
| Feature | Tier A (`@ga-critical` tests) + updated runbook |
| Security fix | Tier A tests + scan artifacts + threat-model note |
| Policy change | `opa test policies/ -v` + policy diff review |
| Schema migration | Migration test (Testcontainers) + rollback plan |
| Dependency upgrade | `pnpm audit` clean + integration tests pass |
| Infrastructure | `make smoke` clean + health check pass |

---

## 6. SLOs and SLIs

Authoritative source: `docs/ga/OBSERVABILITY.md`

### 6.1 Production SLOs

| Signal | SLO | Measurement Window | Error Budget |
|--------|-----|-------------------|-------------|
| **API Availability** | ≥ 99.9% successful requests | 30-day rolling | 43.8 min/month |
| **API P95 Latency** | < 200 ms for all API endpoints | 5-min rolling | — |
| **Job Success Rate** | ≥ 99.0% Maestro jobs SUCCEEDED | 24-hour rolling | — |
| **Error Rate** | < 0.1% HTTP 5xx | 5-min rolling | — |
| **GraphQL P95** | < 200 ms per operation | 5-min rolling | — |

### 6.2 SLI Queries (Prometheus)

```promql
# API Availability
sum(rate(http_requests_total{status!~"5.."}[5m]))
  / sum(rate(http_requests_total[5m]))

# P95 API Latency
histogram_quantile(0.95,
  sum(rate(http_request_duration_seconds_bucket[5m])) by (le, endpoint)
)

# Error Rate
sum(rate(http_requests_total{status=~"5.."}[5m]))
  / sum(rate(http_requests_total[5m]))

# Job Success Rate
sum(rate(maestro_job_status_total{status="SUCCEEDED"}[24h]))
  / sum(rate(maestro_job_status_total[24h]))
```

### 6.3 Auto-Rollback Trigger

Error budget burn rate > 2% in any 10-minute window triggers automatic Argo Rollouts rollback.

### 6.4 Latency Budget Allocation

| Layer | Budget |
|-------|--------|
| API Gateway (routing + auth) | ≤ 20 ms |
| Policy evaluation (OPA) | ≤ 10 ms |
| Application logic | ≤ 100 ms |
| Database queries (Neo4j / PG) | ≤ 50 ms |
| Cache (Redis) | ≤ 2 ms |
| **Total P95** | **≤ 200 ms** |

---

## 7. CI Gate Catalog

Authoritative source: `ops/gates/gates.yaml` (schema: `schemas/gates/GatePolicy.v0.1.json`)

### 7.1 PR Gates (block on failure)

| Gate ID | Name | Command | Severity | Timeout |
|---------|------|---------|----------|---------|
| `PR-001` | Lint | `npm run lint` | **block** | 5 min |
| `PR-002` | Unit tests | `npm run test:unit` | **block** | 10 min |
| `PR-003` | Security verify | `sec-verify` (Gitleaks + audit) | warn | 5 min |
| `PR-004` | Accessibility keyboard smoke | `pnpm run test:a11y-gate` | **block** | 10 min |

Artifact requirement for `PR-004`: `reports/a11y-keyboard/` must be present.

Additional branch-protection required checks:
- `Lint`
- `Verification Suite`
- `Test (unit)`
- `Test (integration)`
- `Golden Path`
- `Reproducible Build`
- `Security`
- `MVP-4-GA Promotion Gate`

### 7.2 Nightly Gates (warn on failure, triage next business day)

| Gate ID | Name | Command | Severity | Timeout |
|---------|------|---------|----------|---------|
| `N-001` | Security verify (full) | `sec-verify` | warn | 10 min |
| `N-002` | Observability verify | `obs-verify` | warn | 10 min |
| `N-003` | Performance budget | `perf-budget` (k6) | warn | 20 min |

### 7.3 Release Gates (block on failure — stop-the-line)

| Gate ID | Name | Command | Severity | Timeout |
|---------|------|---------|----------|---------|
| `R-001` | GA verify | `ga-verify` | **block** | 30 min |
| `R-002` | Governance verify | `gov-verify` | **block** | 10 min |
| `R-003` | Connector verify | `connector-verify` | **block** | 20 min |

### 7.4 Governance Invariant Gates

Enforced by `docs/ga/GOVERNANCE-INVARIANTS.md` and CI signals:

| Code | Invariant | Signal |
|------|-----------|--------|
| `SEC-001` | No secrets in code | Gitleaks |
| `SEC-002` | Dependencies pinned | `package.json` analysis |
| `SEC-003` | No vulnerable packages | Trivy / pnpm audit |
| `SEC-004` | Container signatures | cosign |
| `AUTH-001` | No implicit public routes | Static route analysis |
| `AUTH-002` | Mutations require auth | GraphQL AST analysis |
| `AUTH-003` | Tenant isolation | DB query Rego/AST |
| `DEMO-001` | No real PII in demo | Data scan |
| `DEMO-002` | No external calls in demo | Network sandbox |
| `DATA-001` | Schema PII tagging | Schema linting |
| `DATA-002` | No PII logging | Taint analysis |
| `OBS-001` | Metrics on new services | `metrics.ts` check |
| `OBS-002` | Alert rules present | `alert-rules.yaml` check |
| `PROV-001` | All PRs linked to issue | PR body check |
| `PROV-002` | Commits signed | Git signature check |
| `PROV-003` | PR description non-empty | PR body check |
| `RATE-001` | Rate limits defined | `rate-limits.yaml` check |
| `AGENT-001` | Zone containment | `agent-rules.yaml` |
| `AGENT-002` | Protected file check | File list guard |
| `LEG-001` | No legacy leaks into core | Import analysis |
| `LEG-002` | No new legacy code | File change analysis |

### 7.5 Verification Tier Model

Source: `docs/ga/TESTING-STRATEGY.md`

| Tier | Description | Location | Runner |
|------|-------------|----------|--------|
| **A** | Canonical CI tests tagged `@ga-critical` | `__tests__/`, `tests/` | Jest |
| **B** | Node-native verification (zero side-effects) | `testing/ga-verification/*.ga.test.mjs` | `node --test` |
| **C** | Policy & schema validation (no test runner) | `docs/ga/*.json`, `scripts/ga/*.mjs` | `node scripts/ga/verify-ga-surface.mjs` |

Full GA sweep: `make ga-verify`

---

## 8. Security and Governance Controls

### 8.1 Authentication

| Mechanism | Implementation |
|-----------|---------------|
| Primary | JWT (RS256 / HS256) with issuer validation and expiration |
| Identity federation | OIDC / OAuth 2.0 |
| Enterprise SSO | SAML 2.0 |
| Service identity | SPIFFE/SPIRE (mTLS) |
| Admin emergency | Break-glass with MFA + audit |
| Secret storage | HashiCorp Vault / KMS (env injection, never code) |

Token sources (priority order): `Authorization: Bearer` → `x-access-token`

### 8.2 Authorization

| Layer | Mechanism |
|-------|----------|
| Route-level | `ensureAuthenticated()` — `server/src/middleware/auth.ts` |
| Tenant isolation | `tenantContextMiddleware()` — `server/src/middleware/tenant.ts` |
| ABAC | OPA evaluation — `server/src/middleware/opa-abac.ts` |
| GraphQL field-level | Field-level auth directives on schema |
| Approval gates | `policies/approvals.rego` for high-risk mutations |

### 8.3 Policy Engine

- **Engine**: OPA (Open Policy Agent)
- **Server**: `policy-lac` container on port 8181
- **Core policies**: `policies/mvp4_governance.rego`, `policies/abac_tenant_isolation.rego`, `policies/approvals.rego`, `policies/rate_limit.rego`
- **Default posture**: deny-all; explicit allow required
- **Test coverage**: `opa test policies/ -v` must pass with 100% mutation coverage
- **GitOps**: Policy bundles version-controlled; OPA pulls from S3 bundle store

### 8.4 Supply Chain Security

| Control | Tool | Command |
|---------|------|---------|
| Secret scanning | Gitleaks | `gitleaks detect --no-git` |
| Dependency audit | Trivy + pnpm audit | `pnpm audit --audit-level critical` |
| SAST | Semgrep | CI workflow |
| Container signing | Cosign + Chainguard base | `cosign verify --key cosign.pub <img>` |
| SBOM | CycloneDX | `./scripts/generate-sbom.sh` |
| SLSA provenance | CI attestation | Release workflow |
| Dependabot | GitHub Dependabot | Automated PRs |

Base image: `cgr.dev/chainguard/node` (distroless, minimal CVE surface)

### 8.5 Data Protection

| Control | Mechanism |
|---------|----------|
| Encryption at rest | DB-level encryption (Neo4j, Postgres) |
| Encryption in transit | TLS 1.2+ everywhere; HSTS enforced |
| PII tagging | `@pii` GraphQL directive on schema fields |
| PII guard | Input sanitization middleware |
| Redaction | Copilot services redact before LLM calls |
| Data residency | Regional cell isolation; configurable per tenant |
| Deletion | Tenant off-boarding runbook in `docs/ga/RUNBOOKS.md` |

### 8.6 Multi-Tenant Isolation

| Layer | Mechanism |
|-------|----------|
| Neo4j | Logical graph namespace per tenant |
| PostgreSQL | `tenant_id` foreign key on all tenant tables |
| Redis | Key prefix namespacing per tenant |
| Policy | `AUTH-003` gate blocks cross-tenant queries |
| API | `x-tenant-id` header validated by `TenantIsolationGuard` |

Blast radius containment: regional cell architecture ensures a single-tenant incident cannot affect other cells.

### 8.7 Threat Model (STRIDE Summary)

| Threat | Controls |
|--------|---------|
| **Spoofing** | JWT/OIDC validation; SPIFFE mTLS |
| **Tampering** | Signed commits; SLSA provenance; immutable ledger |
| **Repudiation** | Provenance ledger; append-only audit log |
| **Information Disclosure** | PII guard; tenant isolation; field-level auth |
| **Denial of Service** | Rate limiting; admission control; circuit breaker |
| **Elevation of Privilege** | Default-deny OPA; RBAC + ABAC; approval gates |

Full STRIDE model: `docs/security/` (threat model documents)

---

## 9. Trust Boundaries

Source: `docs/ga/TRUST-BOUNDARIES.md`

| Level | Zone | Entry Control | What Lives Here |
|-------|------|--------------|----------------|
| 0 → 1 | Public Internet → DMZ | TLS 1.2+ / WAF | CDN, edge |
| 1 → 2 | DMZ → API Gateway | JWT signature + expiry check | API Gateway, auth service |
| 2 → 3 | API Gateway → Governance | OPA policy evaluation | Policy engine, approval workflows |
| 3 → 4 | Governance → Services | SPIFFE service identity | Server, agents, Maestro |
| 4 → 5 | Services → Data Layer | DB auth + tenant context | Neo4j, Postgres, Redis, Ledger |
| 5 → 6 | Data → Admin Zone | MFA + VPN + break-glass | Infrastructure, key management |

**Boundary Crossing Rules**:
1. Every boundary crossing must produce an audit event (captured by provenance ledger)
2. Failures default to deny (no implicit fallback to a lower trust level)
3. Service-to-service traffic ≥ Level 3 requires SPIFFE certificate
4. No direct Level 0 → Level 4+ path; all traffic must traverse the gateway

---

## 10. Observability Baseline

### 10.1 Stack

| Component | Technology | Retention |
|-----------|-----------|----------|
| Metrics | Prometheus + VictoriaMetrics | 30 days |
| Logs | Loki + Grafana (Fluent Bit shipper) | 90 days |
| Traces | Tempo + OpenTelemetry Collector | 7 days |
| Dashboards | Grafana | — |
| Alerting | Alertmanager → PagerDuty / Slack | 30 days |
| APM | OpenTelemetry Collector (OTLP) | 7 days |

### 10.2 Instrumentation Requirements

All services MUST instrument:

1. **Latency histogram** (`http_request_duration_seconds`)
2. **Request counter** (`http_requests_total` with `status`, `method`, `endpoint` labels)
3. **Error counter** (`http_errors_total`)
4. **Saturation** (queue depth, CPU, active connections)

GraphQL-specific:
- `graphql_operation_duration_seconds` histogram by operation name
- Query complexity logged for operations > threshold

### 10.3 Alerting Tiers

| Tier | Response SLA | Example |
|------|-------------|---------|
| P0 | 5 min (PagerDuty) | API down, auth failure |
| P1 | 15 min (PagerDuty) | P95 > 200 ms, job queue depth > 1000 |
| P2 | Next business day (Slack) | Nightly gate failure, CVE warn |

All alerts must include a link to the relevant runbook section.

### 10.4 Health Check Endpoints

| Endpoint | Purpose |
|----------|---------|
| `GET /healthz` | Liveness probe (returns 200 if process alive) |
| `GET /readyz` | Readiness probe (returns 200 only if all deps healthy) |
| `GET /health/detailed` | Component-level status (`neo4j`, `postgres`, `redis`, `kafka`) |

`/readyz` must return `neo4j: healthy`, `postgres: healthy`, `redis: healthy` before any traffic routing.

---

## 11. Verification Protocol

Full GA sweep sequence:

```bash
# 1. Clean install (frozen lockfile — no auto-upgrades)
pnpm install --frozen-lockfile

# 2. Type check
pnpm typecheck

# 3. Lint
pnpm lint

# 4. Build (all workspaces via Turbo)
pnpm build

# 5. Unit tests with coverage gate
pnpm test
pnpm coverage:verify  # thresholds: 80% branches/functions/lines/statements

# 6. Policy validation
opa check policies/
opa test policies/ -v

# 7. Security scans
gitleaks detect --no-git
pnpm audit --audit-level critical

# 8. Integration tests (Testcontainers — real Neo4j/Postgres/Redis)
pnpm test:integration

# 9. GA verification harness
make ga-verify
# Fallback: node --test testing/ga-verification/*.ga.test.mjs
# Schema only: node scripts/ga/verify-ga-surface.mjs

# 10. E2E (Playwright golden path)
pnpm test:e2e

# 11. Accessibility gate
pnpm run test:a11y-gate  # artifact: reports/a11y-keyboard/

# 12. Smoke (post-deploy)
make smoke

# 13. Evidence generation
./scripts/generate-sbom.sh
./scripts/verify_provenance.ts
./scripts/generate-transparency-report.ts --tenant <uuid> --start <ISO8601>

# 14. Load test (pre-release)
k6 run test/perf/load.js
```

### 11.1 Coverage Thresholds

| Metric | Threshold |
|--------|-----------|
| Branches | 80% |
| Functions | 80% |
| Lines | 80% |
| Statements | 80% |

### 11.2 Reproducible Build Check

Two clean builds from the same commit MUST produce identical artifact hashes.

```bash
# Build 1
git checkout <sha> && pnpm install --frozen-lockfile && pnpm build
sha256sum dist/**/* > build1.sha256

# Build 2 (separate environment)
git checkout <sha> && pnpm install --frozen-lockfile && pnpm build
sha256sum dist/**/* > build2.sha256

diff build1.sha256 build2.sha256  # must be empty
```

### 11.3 Database Migration Verification

Before every release:
```bash
# Run migration tests with Testcontainers
pnpm test:integration -- --grep "migration"

# Verify rollback path exists for every forward migration
node scripts/verify-migrations-have-down.mjs
```

---

## 12. Feature Flag Registry

Platform: **Flagsmith** (runtime, per-tenant toggles)

| Flag | Default | Purpose | GA Required? |
|------|---------|---------|-------------|
| `ai_enabled` | `false` | Enables AI Copilot / NL-to-Cypher / GraphRAG | No (optional module) |
| `safety_mode` | `true` | Guardrails + content moderation on AI outputs | Yes (when `ai_enabled`) |
| `dev_auth` | `false` | Bypass OIDC for local dev | **Must be `false` in production** |
| `ga_cloud` | per-env | Enables cloud-specific paths (`GA_CLOUD` env var) | Yes in cloud deployments |
| `feature_streaming` | `false` | Kafka Switchboard streaming ingest | No (opt-in) |
| `feature_graphrag` | `false` | GraphRAG semantic pipeline | No (opt-in) |
| `feature_nl2cypher` | `false` | Natural language to Cypher AI translation | No (opt-in) |
| `health_endpoints_enabled` | `true` | Expose `/healthz` / `/readyz` | **Must be `true` in production** |
| `config_validate_on_start` | `true` in prod | Fail-fast on bad config at boot | **Must be `true` in production** |

### 12.1 Production Flag Invariants

The following flag states are **enforced by CI** and cannot be overridden by operators without a change to the policy:

- `dev_auth = false` — enforced by `AUTH-001` gate
- `health_endpoints_enabled = true` — required for Kubernetes probes
- `config_validate_on_start = true` — required for deterministic boot
- `safety_mode = true` when `ai_enabled = true` — enforced by `AGENT-001` gate

---

## 13. Known Limitations and Constraints

Source: `docs/ga/NON-CAPABILITIES.md`

### 13.1 Platform Limitations

| Limitation | Scope | Mitigation |
|-----------|-------|-----------|
| Neo4j single write leader | Scaling writes requires careful shard planning | Read replicas available; future: cluster mode |
| Kafka not HA in Docker Compose | Dev/eval mode only | Production: managed Kafka (MSK / Confluent) |
| Qdrant (vector search) not in GA Docker Compose | GraphRAG opt-in module | Bring-your-own Qdrant in Kubernetes |
| NL-to-Cypher requires external LLM API key | `OPENAI_API_KEY` or compatible | Feature-flagged off by default |
| No built-in disaster recovery automation | Manual restore procedures | Runbooks §3-5; backup-service in Compose |
| Air-gapped deployment | Separate release track | `AIR_GAP_DEPLOY_V1_README.md` |
| Rust services | Not production-shipped in 4.1.15 | Roadmap item |

### 13.2 Compliance Limitations

| Framework | Status | Path to Certification |
|-----------|--------|----------------------|
| FedRAMP High | Controls mapped; ATO not issued | Customer-specific ATO process required |
| CJIS | Architecture compliant; not CJIS-certified | Requires additional audit and CSA |
| GDPR | Technical controls present; legal agreement needed | DPA required per tenant |
| SOC 2 Type II | Audit trail and controls in place; report not issued | Annual audit cycle |

### 13.3 Performance Constraints

| Constraint | Value | Notes |
|-----------|-------|-------|
| Max GraphQL query complexity | Configurable (default 1000) | Enforced by complexity plugin |
| Max concurrent agent jobs | Configurable via BullMQ concurrency | Default per-worker setting |
| Max graph hops per query | Configurable in Cypher | Unbounded traversal will timeout |
| P95 SLO | 200 ms | Only guaranteed within documented hardware envelope |

### 13.4 Schema Freeze

With GA, the following are frozen for v1 compatibility:
- Agent interface contracts (`packages/maestro-sdk/` API surface)
- GraphQL schema public types (breaking changes require deprecation → versioning cycle)
- Knowledge graph node/relationship labels (additive changes only; no renames without migration)
- Provenance ledger event schema (`packages/prov-ledger/` event format)

---

## 14. Release Evidence Bundle

Required artifacts for a GA release. All artifacts must be present in the release workflow run before tag is promoted.

### 14.1 Artifact Checklist

| # | Artifact | Generated By | Stored At |
|---|----------|-------------|----------|
| 1 | `sbom.json` (CycloneDX) | `./scripts/generate-sbom.sh` | Release assets |
| 2 | `provenance.json` (SLSA) | CI attestation workflow | Release assets |
| 3 | `gitleaks-report.json` | `gitleaks detect --no-git` | CI artifacts |
| 4 | `trivy-report.json` | `trivy image <img>` | CI artifacts |
| 5 | `pnpm-audit.json` | `pnpm audit --json` | CI artifacts |
| 6 | `opa-test-results.txt` | `opa test policies/ -v` | CI artifacts |
| 7 | `a11y-keyboard/` | `pnpm run test:a11y-gate` | CI artifacts |
| 8 | `coverage/` (lcov + JSON) | `pnpm coverage:verify` | CI artifacts |
| 9 | `playwright-report/` | `pnpm test:e2e` | CI artifacts |
| 10 | `k6-load-results.json` | k6 load test | CI artifacts |
| 11 | `transparency-report.json` | `./scripts/generate-transparency-report.ts` | `evidence/` |
| 12 | `build-hash-manifest.txt` | Reproducible build check | CI artifacts |
| 13 | `smoke-results.json` | `make smoke` | CI artifacts |

### 14.2 Release Workflow Trigger

```
Push to release branch → CI pipeline → All PR gates pass →
All release gates pass (R-001, R-002, R-003) →
Evidence artifacts collected → Release Captain review →
Sign-off (§16) → Tag created → GitHub Release published →
Docker images pushed with cosign signatures → SBOM attached to release
```

### 14.3 Rollback Plan

Every release must have a documented rollback path:
- **Kubernetes**: `helm rollback summit <previous-release>` or Argo Rollouts undo
- **Database**: Pre-migration snapshot; rollback via `scripts/db/restore.sh`
- **Neo4j**: `scripts/restore/neo4j_restore.sh <path.dump>`
- **Redis**: `scripts/restore/redis_restore.sh` from `redis.rdb`
- **Config drift**: Reapply previous Helm values / ConfigMap

Auto-rollback: error budget burn > 2% in 10-minute window (Argo Rollouts trigger).

---

## 15. Runbook Index

All on-call runbooks are in `docs/ga/RUNBOOKS.md`. Summary of P0/P1 scenarios:

| # | Incident | Runbook Section | On-Call Action |
|---|----------|----------------|---------------|
| 1 | API down / 502-503 from gateway | §1 | `kubectl rollout undo deploy/gateway` or Helm rollback |
| 2 | GraphQL P95 > 200 ms | §2 | Scale gateway; tighten complexity limits; read replicas |
| 3 | Neo4j unavailable | §3 | Restart pod; restore from `neo4j_restore.sh` if corrupted |
| 4 | Postgres locked / migrations stuck | §4 | Cancel blocking sessions; rerun migrations |
| 5 | Redis eviction / cache thrash | §5 | Increase memory; safer eviction policy |
| 6 | Queue backlog / delayed jobs | §6 | Scale BullMQ workers; clear poisoned messages |
| 7 | Auth failures / login loops | §7 | Validate OIDC secrets; check clock skew; restart gateway |
| 8 | Kafka lag / streaming stall | §8 | Scale consumers; check partition assignment |
| 9 | OPA policy denial storm | §9 | Check policy bundle version; validate Rego |
| 10 | Break-glass access needed | §10 | MFA + VPN; audit event auto-generated |

Additional runbooks:
- `docs/ga/MVP4_GA_DEMO_RUNBOOK.md` — Demo mode operation
- `docs/ga/ROLLBACK.md` — Detailed rollback procedures
- `docs/ga/exec-go-no-go-and-day0-runbook.md` — Day-0 launch runbook
- `docs/ga/AGENT-FAILURE-MODES.md` — Agent-specific failure recovery

---

## 16. Signoff Record

**Instructions**: Each approver must verify the evidence bundle (§14) is complete and all gates (§7) are green before signing. Signatures are GPG-signed commits to this file on the release branch.

| Role | Name | Date | Verdict | Evidence Reviewed |
|------|------|------|---------|------------------|
| Release Captain | — | — | ☐ GO / ☐ NO-GO | ☐ |
| Security Reviewer | — | — | ☐ GO / ☐ NO-GO | ☐ |
| Governance Council | — | — | ☐ GO / ☐ NO-GO | ☐ |
| QA Lead | — | — | ☐ GO / ☐ NO-GO | ☐ |
| SRE Lead | — | — | ☐ GO / ☐ NO-GO | ☐ |

**Unanimous GO required. Any NO-GO blocks the release.**

---

*This document was generated from the live Summit repository at version 4.1.15. It synthesizes `docs/ga/GA_DEFINITION.md`, `docs/ga/GA_EXIT_CRITERIA_v1.md`, `docs/ga/SECURITY_BASELINE.md`, `docs/ga/GOVERNANCE-INVARIANTS.md`, `docs/ga/GATE_POLICY.md`, `docs/ga/TESTING-STRATEGY.md`, `docs/ga/OBSERVABILITY.md`, `docs/ga/TRUST-BOUNDARIES.md`, `docs/ga/RUNBOOKS.md`, and `ops/gates/gates.yaml`.*
