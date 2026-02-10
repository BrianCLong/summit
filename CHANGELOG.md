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
- **Foundation**: Established evidence system scaffolding, tool registry, and deny-by-default policy engine for OSINT framework.

## [5.0.0-ga] - 2026-01-23

### General Availability Release

This release represents the first production-ready General Availability (GA) version
of Summit, consolidating 71 commits of enterprise hardening, security improvements,
and compliance infrastructure since v1.7.0-complete.

**For complete release notes, see:** `docs/releases/ga/GA_RELEASE_NOTES.md`

### Highlights

- **Enterprise Multi-Tenancy**: Full enterprise-grade multi-tenant architecture with access control (#16591)
- **CI/CD Infrastructure**: Comprehensive testing suite and hardened CI pipeline (#16619)
- **Security Hardening**: Critical RCE patches, export manifest signing fix, supply chain audit (#16623, batch-1a, batch-1b)
- **GA Governance Framework**: Deterministic evidence collection, governance lockfile, compliance gates (#16635)
- **Storage Enhancements**: Redis cluster, event store partitioning, automated backups (#16617)
- **GraphQL Cost Analysis**: Dynamic rate limiting system to prevent abuse (#16638)
- **Error Boundaries**: Comprehensive error boundary system with retry logic (#16637)
- **Release Automation**: Release Captain Phase 0 with freeze & de-duplication (#16634)

### Added

- Enterprise multi-tenancy and access control system
- Comprehensive testing suite (unit, integration, E2E)
- Client and server TypeScript typecheck gates (deterministic)
- Governance evidence bundle generation (`scripts/release/generate_evidence_bundle.sh`)
- GA verification script (`scripts/release/ga_verify.mjs`)
- GraphQL cost analysis and dynamic rate limiting
- Error boundary system with automatic retry logic
- Redis cluster support with high availability
- Event store partitioning for scalability
- Automated backup and disaster recovery
- Branch protection drift detection (issue-based)
- Work-graph visualizations and backlog importer
- Canonical backlog sync with Linear verification

### Changed

- Migrated CI Core workflow to self-hosted runners for performance
- Hardened governance evidence outputs for determinism
- Updated branch protection drift state from file to issue-based discovery
- Enhanced storage layer with Redis cluster and partitioning

### Fixed

- **[CRITICAL]** Fixed unauthenticated export manifest signing vulnerability (#16623)
- Restored missing client config/urls module
- Resolved 3 failing workflows on main branch (#16605)
- Fixed broken postinstall script reference (#16620)
- Fixed dependency-review triggering on non-PR events
- Fixed UX Governance workflow pnpm version duplication
- Fixed gitleaks-action v2 API compatibility (#16480)
- Fixed CI/CD blocking dependency version conflicts (#16465)
- Fixed ansi-regex CJS compatibility for Jest (#16602)
- Regenerated pnpm-lock.yaml to remove duplicate entries
- Fixed macOS integration test compatibility

### Security

- **Critical Python RCE Vulnerabilities**: Patched remote code execution vulnerabilities (batch-1b)
- **npm Supply Chain Audit**: Comprehensive dependency security review (batch-1a)
- **Export Manifest Signing**: Fixed critical unauthenticated signing vulnerability (#16623)
- **Security Trust Separation**: Sandboxed migration scripts with security policies
- **Vulnerability Analysis Framework**: Multi-batch CVE resolution framework (batches 1-5)
- **Dependency Updates**:
  - lodash 4.17.21 → 4.17.23 (security patches across all workspaces)
  - tar 7.5.2 → 7.5.4
  - undici 6.22.0 → 6.23.0
  - urllib3 2.6.0 → 2.6.3
  - moviepy, mlflow, keras, pyasn1 (see release notes for details)

### Documentation

- Added GA demo runbooks (Security, Integration Chain, OSINT) (#16589)
- Completed Epic 1 governance audit documentation (#16633)
- Added comprehensive workflow consolidation plan (#16563)
- Added GenUI plan scaffold and GA documentation (#16614)
- Added PR metadata integrity check runbook (#16615)
- Added counter-campaign optimization epics (#16587)

### Governance & Compliance

- Deterministic evidence outputs for all governance checks
- Governance lockfile with cryptographic signing
- Type safety audit framework and state tracking
- Health check state monitoring
- Release blocker tracking and escalation
- Atomic stamp writing to prevent zero-byte artifacts

### Infrastructure

- Self-hosted runner migration for CI performance
- Redis cluster deployment for high availability
- Event store partitioning for horizontal scaling
- Automated backup workflows with disaster recovery
- Branch protection drift reconciliation

### Known Issues

- Some documentation commits contain non-production language markers
- Type safety improvements in disclosure services pending full CI validation
- macOS integration tests compatibility marked for future CI inclusion

### Breaking Changes

**None.** This release maintains backward compatibility with v4.x versions.

### Upgrade Path

From v4.x:
- Standard update process (npm/pnpm install)
- No migration required
- New governance gates will apply to future PRs
- Evidence bundle generation now available for releases

### Verification

All release verification evidence maintained in:
- `docs/releases/_state/type_safety_state.json`
- `docs/releases/_state/determinism_state.json`
- `docs/releases/_state/health_check_state.json`
- `docs/releases/_state/governance_lockfile.json`

Generate evidence bundle:
```bash
./scripts/release/generate_evidence_bundle.sh --category all --update-index
```

Verify release readiness:
```bash
./scripts/release/ga_verify.mjs
```

### Contributors

This GA release includes 71 commits from automated security scanning, CI hardening,
governance infrastructure improvements, and enterprise feature development.

---

## [4.1.4] - MVP-4 - 2026-01-13

### Changed
- Release notes: docs/releases/MVP-4_RELEASE_NOTES.md

## [4.1.3] - MVP-4 - 2026-01-13

### Changed
- Release notes: docs/releases/MVP-4_RELEASE_NOTES.md

## [4.1.2] - MVP-4 - 2026-01-13

### Changed
- Release notes: docs/releases/MVP-4_RELEASE_NOTES.md


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
