# Changelog

<!--
POLICY:
1. Always maintain an [Unreleased] section at the top.
2. Use subsections: Added, Changed, Deprecated, Removed, Fixed, Security.
3. Every PR must add an entry here unless labeled 'skip-changelog'.
-->

All notable changes to Summit MVP-3 will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Added `@summit/trends` package for business trend instrumentation.
- Added evidence system for Forbes 2026 trends analysis.

### Added
- Context Engineering Core package with token budgeting, eviction, compression, and manifest metrics.
- Context manifest schema versioning and provenance validation for CEP core.

## [4.1.1] - MVP-4 GA Build Fix - 2026-01-06

### Fixed
- **Server Build**: Fixed ~25 TypeScript errors preventing server compilation
  - Fixed zod namespace issues in `maestro/api-types.ts`, `policy-engine/proposal-types.ts`, `brand-packs/brand-pack.schema.ts`
  - Added missing imports in `maestro-schema.ts` (Entity, BaseNode)
  - Fixed type casting in `hotReloadService.ts`, `admin/tenants.ts`, `support-center.ts`
  - Added missing MutationPayload fields in provenance files
  - Fixed PIGGovernanceService audit import path
- **CLI Build**: Fixed all CLI TypeScript errors
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

## [4.0.0] - MVP-4 GA - 2025-12-30

### Added
- **Reliability Hardening**:
  - Added exponential backoff retry logic (3 attempts) to Maestro LLM execution with cancellation support.
  - Added 60s timeout to Maestro LLM calls to prevent hanging jobs.
- **Tests**:
  - Added reliability unit tests for Maestro task execution.

### Changed
- **Observability**:
  - Validated and verified existing `/health` endpoints (`/health/detailed`, `/health/ready`) and structured logging configuration.
  - Verified correlation ID propagation across HTTP requests.
- **Reliability**:
  - Verified existing graceful shutdown logic for Neo4j, Postgres, Redis, and WebSocket server.
- **Security**:
  - Verified `helmet` usage and CSP configuration.
  - Audited dependencies and secret management patterns.
- Standardized error handling to provide consistent JSON responses and production safety (masking internal errors).
- Configuration now strictly validated with Zod on startup.

### Known Limitations
- Background jobs are currently in-memory/simulated in some modules; production deployment requires persistent queue backend (Redis/BullMQ verified).

### Deprecated
- (Features marked for future removal)

### Removed
- (Removed features)

### Fixed
- (Bug fixes)

### Security
- (Security-related changes)

---

## [3.0.1] - YYYY-MM-DD

### Fixed
- (Example: Critical bug fixes post-GA)

### Security
- (Example: Security patches)

---

## [3.0.0] - 2024-12-28

### Added

#### Core Platform
- Multi-tenant architecture with strict tenant isolation
- Comprehensive RBAC with 18 action types
- DataEnvelope wrapper for all API responses with governance metadata
- GovernanceVerdict on all AI/LLM outputs

#### Governance Engine
- Policy management with versioning and approval workflows
- Real-time policy evaluation via OPA integration
- Governance verdict enforcement across all outputs
- Policy simulation and impact analysis

#### Analytics & AI
- Anomaly detection service with ML-based pattern recognition
- Copilot integration with governance-aware responses
- Entity resolution service with guardrails
- Risk scoring and compliance analytics

#### Plugin Ecosystem
- Plugin SDK for third-party extensions
- CLI tool for plugin development and publishing
- Sandboxed execution environment
- Plugin marketplace foundation

#### Compliance Frameworks
- SOC 2 Type II controls implementation
- FedRAMP control mappings
- PCI-DSS requirements coverage
- NIST CSF alignment
- CMMC Level 2 practices

#### Security
- Argon2 password hashing
- JWT authentication with refresh tokens
- Rate limiting and DDoS protection
- Audit logging with provenance chain
- PII detection and classification
- Encryption at rest and in transit

#### Developer Experience
- TypeScript SDK with full type safety
- GraphQL API with DataLoader optimization
- Comprehensive API documentation
- Integration connectors (File, HTTP, Database)

### Changed
- Migrated to ESM modules
- Upgraded to Node.js 20 LTS
- Enhanced error handling with structured error types

### Security
- Implemented OWASP Top 10 mitigations
- Added HTML sanitization for user inputs
- Enforced Content Security Policy
- Added security headers via Helmet

---

## Version History

| Version | Date | Type | Description |
|---------|------|------|-------------|
| 3.0.0 | 2024-12-28 | Major | GA Release - Full MVP-3 feature set |
| 3.0.0-rc.1 | 2024-12-XX | Pre-release | Release candidate |
| 3.0.0-beta.x | 2024-XX-XX | Pre-release | Beta releases |
| 3.0.0-alpha.x | 2024-XX-XX | Pre-release | Alpha releases |

---

## Upgrade Guide

### From 2.x to 3.0.0

1. **Node.js Version**: Upgrade to Node.js 20 LTS
2. **ESM Migration**: Update imports to use ESM syntax
3. **DataEnvelope**: All API responses now wrapped in DataEnvelope
4. **GovernanceVerdict**: AI outputs include governance metadata
5. **Authentication**: Update to new JWT token format

### Breaking Changes in 3.0.0

- API responses wrapped in `DataEnvelope` structure
- Removed deprecated v1 API endpoints
- Changed authentication flow for enhanced security
- Policy format updated to Rego v1 syntax

---

## Links

- [Release Notes](./audit/ga-evidence/RELEASE-NOTES-v3.0.0-ga.md)
- [Migration Guide](./docs/migration-guide.md)
- [API Documentation](./docs/api/README.md)

[Unreleased]: https://github.com/org/summit/compare/v3.0.0...HEAD
[3.0.1]: https://github.com/org/summit/compare/v3.0.0...v3.0.1
[3.0.0]: https://github.com/org/summit/releases/tag/v3.0.0
## v2.0.0-rc.1 (2025-10-07)
- Release Candidate 1 for GA.
- Security Hardening: All P0/P1 issues resolved.
- Performance: GraphQL p95 < 350ms verified.
