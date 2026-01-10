# Post-GA Issuance Worksheet (MVP-4)

**Status:** ACTIVE
**Tracking Period:** Jan 05 - Jan 19, 2026
**Source:** `docs/releases/MVP-4_POST_GA_STABILIZATION_PLAN.md`

## 1. Critical Stabilization Tasks (Week 1: Jan 05 - Jan 11)

| ID | Priority | Task | Owner | Acceptance Criteria | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **STAB-01** | **P0** | **Enable `pnpm audit` in CI** | Security | CI fails on Critical/High vulnerabilities. Evidence in `GA_EVIDENCE_INDEX.md`. | Pending |
| **STAB-02** | **P0** | **Prometheus Error Budgets** | SRE | Alerting rules defined for 500 errors > 1% (5m window). | Pending |
| **STAB-03** | **P1** | **ADR-009 (GA Decisions)** | Arch | Document why Agentic Autonomy was deferred. | Pending |
| **STAB-04** | **P0** | **Hypercare Monitoring** | On-Call | 72h continuous monitoring log. Zero P0 incidents. | In Progress |

## 2. Reliability & Debt Paydown (Week 2: Jan 12 - Jan 19)

| ID | Priority | Task | Owner | Acceptance Criteria | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **STAB-05** | **P1** | **Quarantine Eradication** | QA | `continue-on-error` removed from `ci.yml`. 100% pass rate. | Pending |
| **STAB-06** | **P2** | **API Determinism Audit** | Backend | Audit report listing endpoints returning unhandled 500s. | Pending |
| **STAB-07** | **P2** | **Type Safety Hardening** | Frontend | `no-explicit-any` enabled in ESLint for core packages. | Pending |

## 3. Deferred Feature Closures (Post-Stabilization)

| ID | Feature | Original PR | Target Date | Owner |
| :--- | :--- | :--- | :--- | :--- |
| **FEAT-01** | Tenant Usage Exports | #15595 | Sprint 16 | Data Team |
| **FEAT-02** | Runtime Brand Packs | #15580 | Sprint 16 | Frontend |
| **FEAT-03** | Support Impersonation | #15576 | Sprint 17 | Identity |

## 4. Sign-off
*   **Release Captain:** __________________
*   **Engineering Lead:** __________________
