# Release Gates

**Status:** DRAFT (Enforcement TBD)

This document defines the strict criteria for code promotion through the pipeline.

## 1. Merge to Main (PR Gate)

A Pull Request can only be merged if **ALL** of the following are true:

*   [ ] **CI Parity Checks Pass:**
    *   `pnpm install` succeeds.
    *   `pnpm -r lint` passes.
    *   `pnpm -r typecheck` passes.
    *   `pnpm -r build` passes.
    *   `pnpm -r test` passes.
*   [ ] **Operational Readiness:**
    *   `pnpm ops:readiness` returns exit code 0.
*   [ ] **No P0 Blockers:**
    *   The PR does not introduce new P0 items (broken build, type errors).
*   [ ] **Reviews:**
    *   At least 1 approval from code owners.

## 2. Release Candidate (RC) Cut

To cut a Release Candidate (`vX.Y.Z-rc.N`):

*   [ ] **All Merge Gates Pass.**
*   [ ] **Security Audit:**
    *   `pnpm audit` shows no critical vulnerabilities.
    *   All P0 security findings in `docs/security/FINDINGS_REGISTER.md` are closed.
*   [ ] **E2E Verification:**
    *   Full `playwright` suite passes on staging environment.
*   [ ] **Governance:**
    *   `CHANGELOG.md` is updated.

## 3. General Availability (GA)

To promote an RC to GA (`vX.Y.Z`):

*   [ ] **Stability:** RC has run in staging/prod-mirror for >24 hours with no Sev-1 incidents.
*   [ ] **Performance:**
    *   p95 Latency < 1500ms (as per `docs/performance/SLOS.md`).
    *   Error Rate < 1%.
*   [ ] **Sign-off:**
    *   Approval from Engineering Lead and Product Owner.
