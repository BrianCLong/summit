Owner: Governance
Last-Reviewed: 2026-01-14
Evidence-IDs: none
Status: active

# Canonical Definitions: The Summit Standard

This document defines the non-negotiable standards for "Done", "Secure", and "Compliant" within the Summit ecosystem.
Any deviation from these standards must be explicitly recorded in the `EXCEPTION_REGISTER.md`.

## 1. GA Readiness (General Availability)

A feature or release is considered **GA Ready** only when it meets the following criteria. No "experimental" or "beta" code may be promoted to GA artifacts without a waiver.

- **Functionality:** All "Tier-0 Journeys" defined in [GA_CRITERIA.md](../GA_CRITERIA.md) must pass automated end-to-end tests.
- **Availability:** Critical path services must demonstrate 99.9% uptime in staging environments over a 7-day period.
- **Performance:**
  - GraphQL p95 latency ≤ 350ms for simple queries.
  - Ingestion throughput ≥ 10k records/sec.
- **Observability:** All new endpoints must have corresponding SLIs and alerts configured in the monitoring stack.
- **Documentation:** Public-facing APIs must have complete OpenAPI/GraphQL specs and accompanying user guides.

## 2. Security Sufficiency

A system is considered **Secured** only when:

- **Vulnerabilities:** Zero Critical or High vulnerabilities in direct dependencies (as verified by Snyk/Trivy).
- **Secrets:** No hardcoded secrets in the codebase. All secrets managed via Vault/Env.
- **Authentication:** All public endpoints (except `/health` and `/login`) require valid JWTs.
- **Authorization:** All data access is gated by Tenant ID checks (Tenant Isolation Invariant).
- **Supply Chain:** All build artifacts are signed and have a generated SBOM.

## 3. Compliance Completeness

A system is considered **Compliant** only when:

- **Auditability:** All state-changing operations (Create, Update, Delete) emit an immutable audit log entry.
- **Privacy:** All PII fields are tagged in the schema (`@pii`) and masked in logs.
- **Data Sovereignty:** Tenant data is logically isolated and capable of being physically isolated if required.
- **Legal:** All third-party libraries have license headers and are whitelisted (Apache 2.0, MIT, BSD).

---

> **Control: Canonical Definitions defined.**
> **Status: VERIFIED**
