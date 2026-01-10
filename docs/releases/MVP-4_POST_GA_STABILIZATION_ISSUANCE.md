# MVP-4 Post-GA Stabilization Issuance

**Status**: FINAL | **Authority**: Post-GA Stabilization Lead (Jules)
**Source of Truth**: `docs/releases/v4.0.0/MVP4-GA-Readiness-Package.md`
**Tracking Context**: Post-GA Stabilization (Ironclad Standard)

## 1. Executive Summary

This document converts all deferred MVP-4-GA work, risks, and gaps into an actionable, owned, and scheduled stabilization plan. It supersedes all prior "TODO" lists and "Future Work" sections.

*   **Total Items**: 12
*   **P0 (Immediate Focus)**: 8
*   **P1 (Next Sprint)**: 4
*   **Key Risks Managed**: API Determinism, Secret Hygiene, Policy Coverage, RAG Safety.

**Immediate Action (First 14 Days)**: The team must clear all **P0** items to meet the "Ironclad Standard" promised for GA.

## 2. Verified Sources

The following documents were mined to produce this issuance plan:

1.  `docs/releases/v4.0.0/MVP4-GA-Readiness-Package.md` (Red/Yellow Scorecard, Risks R-01 to R-05)
2.  `docs/releases/v4.0.0/MVP4-GA-GAP-ANALYSIS.md` (Gap Analysis P0/P1)
3.  `docs/releases/v4.0.0/MVP4-GA-SPRINT-BACKLOG.md` (Sprint 1 "Stop the Bleeding")
4.  `docs/releases/v4.0.0/MVP4-GA-TEST-COVERAGE-PLAN.md` (Phase 1 Coverage)
5.  `docs/releases/v4.0.0/MVP4-GA-WORKSTREAMS.md` (Workstream Gaps)

## 3. Stabilization Issuance Table

| ID | Title | Category | Priority | Owner | Tracking (Issue) | Target Window | Risk if Delayed |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **STAB-01** | **API Determinism & Global Error Handler** | Tech Debt | **P0** | Backend Lead | `ISSUE TO BE CREATED` | Sprint N+1 | **R-01**: Untyped 500s confuse clients; violates Ironclad guarantee. |
| **STAB-02** | **Strict Typing & Schema Sync** | Tech Debt | **P0** | Backend Lead | `ISSUE TO BE CREATED` | Sprint N+1 | Runtime crashes on edge cases; breaks Type Safety promise. |
| **STAB-03** | **100% Policy Coverage (Mutation Audit)** | Security | **P0** | Security Lead | `ISSUE TO BE CREATED` | Sprint N+1 | **R-02**: Unauthorized writes possible; compliance failure. |
| **STAB-04** | **Secrets Hygiene & Rotation** | Security | **P0** | Ops Lead | `ISSUE TO BE CREATED` | Sprint N+1 | **R-04**: Credential leakage; catastrophic compromise risk. |
| **STAB-05** | **Graph Performance Optimization** | Performance | **P0** | Frontend Lead | `ISSUE TO BE CREATED` | Sprint N+1 | UX unusable for large customers (>10k nodes). |
| **STAB-06** | **RAG Safety (Mandatory Citations)** | Security | **P0** | AI Lead | `ISSUE TO BE CREATED` | Sprint N+1 | **R-05**: Hallucinations erode trust; liability risk. |
| **STAB-07** | **Critical Path Test Coverage (>80%)** | CI/Infra | **P0** | Backend Lead | `ISSUE TO BE CREATED` | Sprint N+1 | Regressions in Auth/Authz logic go undetected. |
| **STAB-08** | **Test Quarantine Mechanism** | CI/Infra | **P0** | Release Capt | `ISSUE TO BE CREATED` | Sprint N+1 | Flaky tests block Critical Hotfixes. |
| **STAB-09** | **Error Budgets & Monitoring** | Reliability | **P1** | SRE Lead | `ISSUE TO BE CREATED` | Sprint N+2 | Silent degradation; reactive instead of proactive ops. |
| **STAB-10** | **Migration Safety (Reversibility)** | CI/Infra | **P1** | Backend Lead | `ISSUE TO BE CREATED` | Sprint N+2 | Failed deploys result in data loss or extended downtime. |
| **STAB-11** | **Runtime Drift Detection** | Security | **P1** | Ops Lead | `ISSUE TO BE CREATED` | Sprint N+2 | Shadow IT / Configuration drift compromises security. |
| **STAB-12** | **Evidence Linking (Provenance)** | Security | **P1** | Compliance | `ISSUE TO BE CREATED` | Sprint N+2 | Audit failure; cannot prove chain of custody. |

## 4. Acceptance Criteria & Tracking Details

### STAB-01: API Determinism & Global Error Handler
*   **Labels**: `type:bug`, `priority:critical`, `area:backend`
*   **Acceptance Criteria**:
    *   Global Error Interceptor implemented in Apollo Server.
    *   No unhandled 500s on malformed input (returns 400 Bad Request with `BAD_USER_INPUT`).
    *   All GraphQL errors use typed codes (e.g., `GRAPHQL_VALIDATION_FAILED`, `UNAUTHENTICATED`).
    *   Zod validation active and enforcing on all mutations.

### STAB-02: Strict Typing & Schema Sync
*   **Labels**: `type:chore`, `priority:critical`, `area:backend`
*   **Acceptance Criteria**:
    *   `tsconfig` strict mode enabled (`noImplicitAny: true`) without build errors.
    *   Explicit `any` usage removed from `server/src/middleware/` and `server/src/graphql/resolvers/`.
    *   Generated GraphQL types (from `codegen`) used in all resolvers.

### STAB-03: 100% Policy Coverage (Mutation Audit)
*   **Labels**: `type:security`, `priority:critical`, `area:security`
*   **Acceptance Criteria**:
    *   Audit confirms 100% of GraphQL mutations have `authz.ensure()` (or equivalent) calls.
    *   CI pipeline (`authz-check` script) fails if a new mutation is added without authorization.
    *   Unit tests for Rego policies cover at least 3 positive and 3 negative cases per policy.

### STAB-04: Secrets Hygiene & Rotation
*   **Labels**: `type:security`, `priority:critical`, `area:ops`
*   **Acceptance Criteria**:
    *   Secret rotation runbook exists and has been successfully tested in Staging.
    *   `gitleaks` (or equivalent) is active in CI pipeline and blocks PRs with secrets.
    *   Scan confirms no env vars with secrets in `Dockerfile` or committed config files.

### STAB-05: Graph Performance Optimization
*   **Labels**: `type:performance`, `priority:critical`, `area:frontend`
*   **Acceptance Criteria**:
    *   Graph with 10k nodes renders in < 1 second on reference hardware.
    *   Browser maintains 30+ FPS during pan/zoom operations.
    *   Supernodes (>1000 connections) do not block query execution (backend pagination or limits).

### STAB-06: RAG Safety (Mandatory Citations)
*   **Labels**: `type:feature`, `priority:critical`, `area:ai`
*   **Acceptance Criteria**:
    *   Every AI claim/answer includes a structured citation to a source entity.
    *   Uncited claims are visually flagged in the UI (e.g., warning icon).
    *   Citation density metric is calculated and logged.

### STAB-07: Critical Path Test Coverage (>80%)
*   **Labels**: `type:test`, `priority:critical`, `area:backend`
*   **Acceptance Criteria**:
    *   `opa-abac.ts` coverage > 80%.
    *   `ingestValidator.ts` coverage > 80%.
    *   `crudResolvers.ts` coverage > 80%.
    *   Coverage report generated and visible in CI artifacts.

### STAB-08: Test Quarantine Mechanism
*   **Labels**: `type:infra`, `priority:critical`, `area:ci`
*   **Acceptance Criteria**:
    *   Automated mechanism (e.g., `jest` config or separate list) to exclude flaky tests from blocking `main`.
    *   Quarantined tests still run (non-blocking) to gather data.
    *   Process documented for rehabilitating a quarantined test.

### STAB-09: Error Budgets & Monitoring
*   **Labels**: `type:ops`, `priority:high`, `area:sre`
*   **Acceptance Criteria**:
    *   Error Budgets defined in Terraform/AlertManager.
    *   Alerts fire when error burn rate exceeds threshold (5%/hour).
    *   Dashboards link directly to specific runbooks for P0 alerts.

### STAB-10: Migration Safety (Reversibility)
*   **Labels**: `type:infra`, `priority:high`, `area:backend`
*   **Acceptance Criteria**:
    *   All v4 migrations have tested `down` scripts.
    *   Automated rollback CI job successfully reverts database schema in Staging.

### STAB-11: Runtime Drift Detection
*   **Labels**: `type:security`, `priority:high`, `area:ops`
*   **Acceptance Criteria**:
    *   Tool active (e.g., periodic job) to compare running config vs IaC.
    *   Alerts fired on drift detection (e.g., manual change to Security Group).

### STAB-12: Evidence Linking (Provenance)
*   **Labels**: `type:compliance`, `priority:high`, `area:security`
*   **Acceptance Criteria**:
    *   `provenance.json` links Commit -> Docker Image -> Test Results.
    *   All release artifacts are signed with Cosign.

## 5. Sprint Sequencing

### Sprint N+1 (Immediate Post-GA)
*   **Goal**: "Stop the Bleeding" / Achieve Ironclad Standard.
*   **Capacity**: Assumes 100% of team capacity dedicated to stabilization (No new features).
*   **In Scope**: STAB-01 through STAB-08 (All P0s).

### Sprint N+2 (Stabilization Tail)
*   **Goal**: Operational maturity and drift control.
*   **Capacity**: 50% Stabilization, 50% Feature Work (Wave 5 start).
*   **In Scope**: STAB-09 through STAB-12 (All P1s).

## 6. Governance Notes

*   **Merge Train**: All stabilization PRs must pass the standard merge train. No bypass allowed for "speed" unless approved by Incident Commander (Severity 1+).
*   **Change Class**: All changes in Sprint N+1 are classified as **PATCH** or **HOTFIX**.
*   **Verification**: Every closed item requires a link to the specific PR and Evidence Artifact in `docs/release/GA_EVIDENCE_INDEX.md`.
