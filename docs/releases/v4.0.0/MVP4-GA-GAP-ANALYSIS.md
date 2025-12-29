# MVP-4-GA Gap Analysis

**Baseline**: v3.0.0-ga
**Target**: v4.0.0-ga (Ironclad Standard)

---

## 1. Product & Platform Gaps

| Area                 | Current State (v3)                 | Gap Description                                                               | Priority      |
| :------------------- | :--------------------------------- | :---------------------------------------------------------------------------- | :------------ |
| **API Determinism**  | Some 500s on malformed input.      | **P0**: All inputs must produce 4xx or typed errors. No unhandled exceptions. | **BLOCKER**   |
| **Schema/Type Sync** | TypeScript types loose (any/shim). | **P0**: Strict TS types matching GraphQL/DB schemas. No `any` in core paths.  | **BLOCKER**   |
| **Migration Safety** | One-way migrations usually used.   | **P1**: All migrations must be reversible (`down` scripts tested).            | Required      |
| **Docs-as-Code**     | Release notes manual.              | **P2**: Documentation generated from schemas/code annotations.                | Opportunistic |

## 2. Reliability & Operations Gaps

| Area                | Current State (v3)           | Gap Description                                                     | Priority      |
| :------------------ | :--------------------------- | :------------------------------------------------------------------ | :------------ |
| **Error Budgets**   | Informal monitoring.         | **P0**: Formal Error Budgets defined in Terraform/AlertManager.     | **BLOCKER**   |
| **Capacity Limits** | Rate limits exist but basic. | **P1**: Adaptive concurrency limits and bulk-head isolation.        | Required      |
| **Runbooks**        | Wiki-based / dispersed.      | **P1**: Executable runbooks (Jupyter/Script) for common incidents.  | Required      |
| **Degradation**     | System slows down linearly.  | **P2**: Graceful degradation modes (e.g., disable search vs crash). | Opportunistic |

## 3. Security & Governance Gaps

| Area                | Current State (v3)      | Gap Description                                                            | Priority    |
| :------------------ | :---------------------- | :------------------------------------------------------------------------- | :---------- |
| **Policy Coverage** | Key mutations covered.  | **P0**: 100% Mutation coverage. No write without Policy verdict.           | **BLOCKER** |
| **Drift Detection** | Terraform plan checks.  | **P1**: Runtime config drift detection (Cloud vs Code).                    | Required    |
| **Evidence**        | Access logs.            | **P1**: Full Provenance Chain (User -> Request -> Policy -> DB).           | Required    |
| **Secrets**         | Env vars / K8s secrets. | **P0**: Secret rotation capability and leakage detection (Gitleaks in CI). | **BLOCKER** |

## 4. CI/CD & Release Engineering Gaps

| Area                      | Current State (v3)  | Gap Description                                                       | Priority      |
| :------------------------ | :------------------ | :-------------------------------------------------------------------- | :------------ |
| **Test Determinism**      | Occasional flakes.  | **P0**: Zero tolerance for flake. Quarantine flaky tests immediately. | **BLOCKER**   |
| **Promotion Gates**       | Manual approval.    | **P0**: Automated Gates (Coverage, CVEs, Smoke). No human bypass.     | **BLOCKER**   |
| **Build Reproducibility** | Docker builds work. | **P1**: SBOM generation and signature verification for all images.    | Required      |
| **Release Auto**          | Scripts exist.      | **P2**: One-click "Release to Staging" button in CI.                  | Opportunistic |

---

## Summary of Critical Path (Blockers)

1.  **Strict Typing & API Hardening**: Eliminate `any` and unhandled errors.
2.  **Policy Universality**: Enforce governance on ALL mutations.
3.  **CI Hard Enforcement**: Make the pipeline the only way to ship.
4.  **Secret/Security Hygiene**: Automated scanning and rotation readiness.
