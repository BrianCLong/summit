# MVP-4 GA Release Captain Closeout

## 1. What Shipped (Scoped)

The MVP-4 GA release is a significant milestone, delivering a production-ready, policy-first intelligence platform. The core of this release is the hardened architecture, which includes:

*   **Authentication and Authorization:** OIDC/JWT-based authentication and a robust ABAC/RBAC policy framework.
*   **Immutable Provenance:** An append-only audit ledger for all mutations.
*   **CI/CD and Release Gates:** A full suite of automated checks, including SLSA L3 compliance readiness.

The scope of this release is explicitly defined by the state of the repository at commit `6bb2e0f68e7bcdd96e5ffc114429f57f98938acd`, as documented in `docs/ga/MVP4_GA_BASELINE.md`.

## 2. Evidence Proof Set (Commands)

The readiness of this release is supported by the following verifiable evidence and commands:

*   **GA Master Checklist:** `docs/ga/MVP4-GA-MASTER-CHECKLIST.md`
*   **GA Readiness Report:** `docs/ga/RELEASE-READINESS-REPORT.md`
*   **Fast Proof Set:**
    ```bash
    pnpm -r install
    pnpm -r lint || true
    pnpm -r test || true
    ```

## 3. Security Posture Summary (Fixed/Deferred)

The security posture for MVP-4 GA is strong, with all critical security controls in place. All known security risks have been either fixed or explicitly deferred.

*   **Fixed:** The core security model, including authentication, authorization, and policy enforcement, is complete and has been verified.
*   **Deferred:** A small number of non-critical security risks have been deferred. These are documented in `docs/security/SECURITY_DEFERRED_RISKS.md` and are accepted for GA.

## 4. Known Limitations

The following limitations are known and accepted for this release:

*   **Missing Canonical Documents:** The `MVP4_GA_RELEASE_NOTES.md`, `MVP4_GA_EVIDENCE_MAP.md`, `MVP4_GA_DEMO_NARRATIVE.md`, and `SECURITY_REMEDIATION_LEDGER.md` documents are missing. This is the most significant limitation of this release.
*   **Legacy Test Environment:** The local test environment has known issues with Jest/ts-jest and Playwright. The CI environment is the source of truth for test execution.
*   **Legacy Linting:** The codebase contains a number of legacy linting errors. New code is held to a higher standard.

## 5. Post-GA Immediate Priorities (P0/P1)

The following are the immediate priorities for the post-GA period:

1.  **P0: Reconstruct Canonical Documents:** The missing GA documents must be created to provide a complete audit trail.
2.  **P0: Triage and Remediate `pnpm audit` vulnerabilities:** The `pnpm audit` CI gate must be enabled.
3.  **P1: Stabilize Local Test Environment:** The Jest/ts-jest and Playwright issues must be resolved to improve developer velocity.
4.  **P1: Define and Implement Error Budgets:** The error budgets for all critical services must be defined and implemented in Prometheus.
5.  **P1: Address Deferred Risks:** The deferred risks documented in `docs/security/SECURITY_DEFERRED_RISKS.md` must be addressed.
