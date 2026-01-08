# Release Notes - MVP-4 (v2.0.0)

**Release Date:** 2025-10-25
**Impact:** MAJOR

## 🚀 New Features

- **Graph Intelligence Engine:** Full GA of the Neo4j-backed analytics suite.
- **AI Copilot:** Now integrated into the main analyst workspace with context-aware suggestions.
- **Maestro Orchestrator:** Production-ready CI/CD pipeline automation.
- **Advanced Audit:** Immutable ledger for all data mutations.

## ⚠️ Breaking Changes

- **API v1 Deprecation:** All endpoints under `/api/v1` are now strictly rate-limited and will be removed in v2.1.0. Migrate to `/api/v2`.
- **Authentication:** MFA is now enforced for all `admin` and `auditor` roles.

## 🛡️ Security

- Strict Tenant Isolation enforced by OPA.
- All data encrypted at rest and in transit (mTLS).

## 🔧 Operations

- **Observability:** New Grafana dashboards for "Docling" and "Graph AI" performance.
- **Configuration:** Feature flags are now the primary method for enabling experimental features.

---

_Support:_ Contact `#help-platform` or check the [Runbooks](https://docs.intelgraph.io/runbooks).
