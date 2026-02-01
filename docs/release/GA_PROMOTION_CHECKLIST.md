# GA Promotion Checklist

This document defines the mandatory criteria for promoting a Release Candidate (RC) to General Availability (GA).

## 1. Security & Compliance
- [ ] **Critical Vulnerabilities**: Zero known High/Critical vulnerabilities in production dependencies (verified by `pnpm audit` and Trivy).
- [ ] **Hardening Claims**: All claims in the hardening sprint (v5.3.2) are verified and signed.
- [ ] **Provenance**: All release artifacts have valid SLSA-compliant provenance (verified by OPA gate).
- [ ] **Secrets**: No secrets leaked in codebase (verified by `gitleaks`).
- [ ] **Guardrails**: Prompt injection guardrails verified in `BaseAgentArchetype`.

## 2. Quality & Stability
- [ ] **Test Coverage**: Minimum 80% coverage on core services (`server/src`).
- [ ] **Unit Tests**: All 1300+ unit tests passing in CI.
- [ ] **Smoke Tests**: All critical endpoints returning 200 OK in a production-like environment.
- [ ] **Type Safety**: Zero TypeScript errors in the root `pnpm typecheck`.
- [ ] **Migrations**: All DB migrations (`neo4j`, `postgres`) verified for idempotency and rollback.

## 3. Operational Readiness
- [ ] **Runbooks**: Operational runbooks for deployment, rotation, and incident response are complete.
- [ ] **Observability**: SLOs defined and alerting hooks wired for critical path failures.
- [ ] **Documentation**: `SECURITY.md` and `v5.3.2_RELEASE_NOTES.md` updated.

## 4. Evidence Bundle
- [ ] **Bundle Generation**: `pnpm ga:evidence` runs successfully.
- [ ] **Artifact Integrity**: Bundle contains signed manifest, SBOM, and test proofs.
- [ ] **Audit Trail**: Evidence bundle uploaded to the immutable release store.

## Approval
- [ ] Security Lead Approval
- [ ] Engineering Lead Approval
- [ ] Compliance Lead Approval
