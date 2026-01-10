# GA Hotfix Governance Policy

**Status:** ACTIVE (Week-0)
**Scope:** Changes applied to the `release/ga` branch or tagged production releases during Week-0.

## 1. Definition of a Hotfix

A **Hotfix** is an out-of-cycle release required to mitigate a **P0** or **P1** incident.

*   **P0 (Critical):** System unusable, Security compromised, Data integrity at risk.
*   **P1 (High):** Core capability broken with no viable workaround.

**Anything else is NOT a hotfix.**
*   Typos in docs are P2 (wait for scheduled patch).
*   "Nice to have" UI tweaks are P3 (backlog).
*   Performance optimizations (unless breaching SLOs) are not hotfixes.

## 2. Approval Authority

A hotfix requires **Dual Authorization**:

1.  **Technical Approval:** Release Captain (Verifies fix safety and test coverage).
2.  **Executive Approval:** VP Engineering or Designate (Verifies business necessity).

## 3. The Hotfix Protocol

1.  **Issue Creation:** Must exist in GitHub with `severity:P0/P1` and `label:hotfix-candidate`.
2.  **Reproduction:** Confirmed and documented in the issue.
3.  **Branching:** Create `hotfix/<issue-id>` from the current GA tag.
4.  **Implementation:**
    *   Minimal code change (surgical fix only).
    *   Must include a regression test (if applicable).
    *   **NO** unrelated refactors or cleanup.
5.  **Verification:**
    *   CI must pass.
    *   Manual verification of the fix.
    *   Manual verification that *no other* GA capabilities are regressed.
6.  **Review:** 2 Approvals required (1 Code Owner + Release Captain).
7.  **Release:**
    *   Merge to `main` and cherry-pick to `release/ga`.
    *   Tag new version (e.g., `v1.0.1`).
    *   Deploy.

## 4. Documentation Amendments

If a hotfix changes behavior described in GA documentation:

1.  Update the relevant file in `docs/ga/` or `docs/`.
2.  Add an entry to `docs/ga/CHANGELOG.md` (or equivalent release notes).
3.  Update `docs/ga/RELEASE-READINESS-REPORT.md` to reflect the incident and resolution.

## 5. Post-Mortem

Every hotfix triggers a mandatory **Post-Mortem** within 24 hours to prevent recurrence.
