# Summit MVP-4 GA Changelog

**Release Version:** 4.0.0-ga
**Release Date:** 2025-12-30
**Previous Version:** 3.0.0

---

## Overview

This document provides a structured changelog for the Summit MVP-4 GA release, organized by capability area with evidence references.

---

## [4.1.1] - 2026-01-06

### Fixed

- **Server Build Compilation**
  - Fixed ~25 TypeScript errors preventing server compilation
  - Fixed zod namespace issues in `maestro/api-types.ts`, `policy-engine/proposal-types.ts`, `brand-packs/brand-pack.schema.ts`
  - Added missing imports in `maestro-schema.ts` (Entity, BaseNode)
  - Fixed type casting in `hotReloadService.ts`, `admin/tenants.ts`, `support-center.ts`
  - Added missing MutationPayload fields in provenance files
  - Fixed PIGGovernanceService audit import path

- **CLI Build Compilation**
  - Fixed PropertyKey[] to string[] conversion in `graph-client.ts`
  - Fixed version string parsing in `summit-doctor.ts`
  - Fixed signature verification in `audit-exporter.ts`
  - Added ESM module mocks for Jest tests

### Changed

- Updated GA Evidence Index with verification results
- All governance and security checks pass

### Added

- Generated SBOM at `.evidence/sbom.json`
- CLI test suite: 262 tests passing

---

## [4.0.0] - 2025-12-30 (GA Release)

### Added

#### Core Platform

| Feature | Description | Evidence |
|---------|-------------|----------|
| **Multi-tenant Architecture** | Strict tenant isolation with ABAC controls | `policies/abac_tenant_isolation.rego` |
| **RBAC System** | 18 action types with hierarchical roles | `server/src/middleware/auth.ts` |
| **DataEnvelope Wrapper** | All API responses include governance metadata | GraphQL schema |
| **GovernanceVerdict** | Structured verdict on all AI/LLM outputs | `policies/mvp4_governance.rego` |

#### Governance Engine

| Feature | Description | Evidence |
|---------|-------------|----------|
| **Policy Management** | Versioned policies with approval workflows | `policies/` directory |
| **OPA Integration** | Real-time policy evaluation | `server/src/middleware/opa-abac.ts` |
| **Governance Enforcement** | 100% mutation coverage requirement | `mvp4_governance.rego:5` |
| **Policy Simulation** | Impact analysis for policy changes | Policy simulator service |

#### Security Infrastructure

| Feature | Description | Evidence |
|---------|-------------|----------|
| **OIDC/JWT Authentication** | Token-based auth with RS256/HS256 | `server/src/middleware/auth.ts` |
| **Attribute-Based Access Control** | OPA-based ABAC with clearance levels | `policies/abac.rego` |
| **Tenant Isolation Guard** | Cross-tenant access prevention | `server/src/tenancy/TenantIsolationGuard.ts` |
| **Rate Limiting** | Tiered limits (public, authenticated, API, ingestion) | `server/src/middleware/rateLimiter.ts` |
| **Input Validation** | Zod schema validation with sanitization | `server/src/middleware/request-schema-validator.ts` |
| **Security Headers** | Helmet with strict CSP | `server/src/security/security-headers.ts` |
| **Secret Scanning** | Gitleaks integration in CI | `.github/workflows/mvp4-gate.yml` |

#### Audit & Compliance

| Feature | Description | Evidence |
|---------|-------------|----------|
| **Immutable Audit Ledger** | Append-only PostgreSQL with cryptographic signing | Audit service |
| **7-Year Retention** | Compliance-grade log retention | Audit configuration |
| **Provenance Tracking** | Data lineage verification | Provenance ledger |
| **SBOM Generation** | CycloneDX format | `.evidence/sbom.json` |
| **SLSA L3 Provenance** | Build attestation with Cosign | `release-ga.yml` |

#### Observability

| Feature | Description | Evidence |
|---------|-------------|----------|
| **OpenTelemetry Tracing** | Distributed tracing across services | Telemetry configuration |
| **Structured Logging** | Pino with correlation IDs | `server/src/middleware/logging.ts` |
| **Health Endpoints** | `/health`, `/health/detailed`, `/health/ready` | Health routes |
| **Prometheus Metrics** | Policy decision metrics | Metrics endpoint |

#### CI/CD & Release

| Feature | Description | Evidence |
|---------|-------------|----------|
| **MVP4 Gate** | Automated quality gates | `.github/workflows/mvp4-gate.yml` |
| **SLSA Build** | Reusable SLSA-compliant workflow | `.github/workflows/_reusable-slsa-build.yml` |
| **Evidence Bundles** | Release evidence packages | Release artifacts |
| **Smoke Tests** | Golden path verification | `scripts/smoke-test.sh` |

#### Reliability

| Feature | Description | Evidence |
|---------|-------------|----------|
| **Exponential Backoff** | Retry logic with 3 attempts | Maestro LLM execution |
| **60s Timeout** | LLM call timeout to prevent hanging | Maestro configuration |
| **Graceful Shutdown** | Clean shutdown for Neo4j, Postgres, Redis, WebSocket | Server shutdown handlers |
| **Configuration Validation** | Zod-based startup validation | Config validators |

### Changed

| Change | Description | Rationale |
|--------|-------------|-----------|
| **ESM Modules** | Migrated to ES modules | Modern JavaScript standards |
| **Node.js 20** | Upgraded to Node.js 20 LTS | LTS support and features |
| **Error Handling** | Standardized JSON responses | Consistent API behavior |
| **Error Masking** | Internal errors masked in production | Security best practice |

### Security

| Enhancement | Description | Evidence |
|-------------|-------------|----------|
| **OWASP Top 10 Mitigations** | Protection against common vulnerabilities | Security baseline |
| **HTML Sanitization** | User input sanitization | `SanitizationUtils` |
| **Content Security Policy** | Strict CSP in production | Helmet configuration |
| **NoSQL Injection Prevention** | mongo-sanitize integration | Sanitization middleware |
| **PII Detection** | Hybrid entity recognizer | `server/src/middleware/pii-guard.ts` |

### Deprecated

- None in this release

### Removed

- Deprecated v1 API endpoints
- Legacy authentication flow

---

## Breaking Changes

### API Changes

| Change | Migration |
|--------|-----------|
| **DataEnvelope Wrapper** | All API responses now wrapped in `DataEnvelope` structure |
| **GovernanceVerdict** | AI outputs include governance metadata |
| **Authentication Flow** | Updated JWT token format |

### Configuration Changes

| Change | Migration |
|--------|-----------|
| **Policy Format** | Updated to Rego v1 syntax |
| **Environment Variables** | New required variables for OPA, rate limiting |

---

## Evidence References

### Documentation

| Document | Location |
|----------|----------|
| Architecture | `docs/ga/ARCHITECTURE.md` |
| Governance Design | `docs/ga/GOVERNANCE-DESIGN.md` |
| Security Baseline | `docs/ga/SECURITY_BASELINE.md` |
| Deployment Guide | `docs/ga/DEPLOYMENT.md` |
| Acceptance Criteria | `docs/ga/ACCEPTANCE.md` |

### Policy Files

| Policy | Purpose |
|--------|---------|
| `policies/mvp4_governance.rego` | Core governance policy |
| `policies/abac.rego` | Attribute-based access control |
| `policies/abac_tenant_isolation.rego` | Tenant isolation |
| `policies/approval.rego` | Approval workflows |

### Test Evidence

| Test Type | Status |
|-----------|--------|
| Policy Tests | 6 test files, all passing |
| CLI Tests | 262 tests passing |
| Server Tests | Environment-dependent (CI authoritative) |

---

## Compatibility Matrix

| Component | Minimum Version | Recommended Version |
|-----------|-----------------|---------------------|
| Node.js | 20.0.0 | 20.x LTS |
| PostgreSQL | 14.0 | 15.x |
| Neo4j | 5.0 | 5.x |
| Redis | 7.0 | 7.x |
| OPA | 0.60.0 | Latest |

---

## Version History

| Version | Date | Type | Description |
|---------|------|------|-------------|
| 4.1.1 | 2026-01-06 | Patch | Build fixes and evidence |
| 4.0.0 | 2025-12-30 | Major | GA Release |
| 3.0.0 | 2024-12-28 | Major | MVP-3 GA |

---

**Document Version:** 1.0
**Last Updated:** 2025-12-30
